import { buildFairnessPreview, calculateAutomaticPayment, createPreviewVersion, getWeekId, type FairnessPreview } from '@pay-wheel/domain';
import { collection, doc, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { db } from '../../services/firebase/client';
import { callFunction, newRequestId } from '../../services/firebase/callable';
import { trackEvent } from '../../services/analytics/events';
import { createUuid } from '../../services/ids/uuid';
import { useSession } from '../entry/SessionProvider';
import { shouldApplyRevision } from './sharedState';

export interface Member {
  userId: string;
  displayName: string;
  photoUrl: string | null;
  role: 'member';
  access: 'member' | 'admin';
  status: 'active' | 'disabled' | 'anonymized';
  joinedAt: string;
  lastPaidWeekId: string | null;
  lastPaidAt: string | null;
}

export interface Participant { userId: string; displayName: string; joinedAt: string; }
export interface Payment { outingId: string; payerUserId: string; payerDisplayName: string; amountCents: number; weekId: string; source: 'manual' | 'automatic'; participantCountAtDraw: number; participantUserIds: string[]; eligibleParticipantUserIds: string[] | null; correctedAt: string | null; createdAt: string; }
export interface Outing { outingId: string; revision: number; status: 'open' | 'drawn' | 'completed' | 'cancelled'; createdBy: string; createdAt: string; drawnAt: string | null; payerUserId: string | null; payerDisplayName: string | null; participants: Participant[]; preview: (FairnessPreview & { previewVersion: string }) | null; }
export interface InternalWorkspace { groupId: string; name: string; status: 'active' | 'maintenance'; timezone: string; stateRevision: number; }
export interface SpinOutcome { payerUserId: string; }

interface AppState { group: InternalWorkspace | null; members: Member[]; outing: Outing | null; payments: Payment[]; }
const EMPTY: AppState = { group: null, members: [], outing: null, payments: [] };
const LOCAL_STATE_KEY = 'pay-wheel:test-workspace:v2';

interface ContextValue extends AppState {
  busy: boolean;
  synced: boolean;
  joinCurrentOuting(participating?: boolean): Promise<void>;
  toggleParticipation(): Promise<void>;
  seedTestColleagues(): void;
  refreshPreview(): Promise<void>;
  spin(): Promise<SpinOutcome>;
  confirmPayment(amountCents: number): Promise<void>;
  autoSettleTest(): Promise<void>;
  correctPayment(amountCents: number, reason: string): Promise<void>;
}

const Context = createContext<ContextValue | null>(null);

function readLocalState(): AppState {
  const value = localStorage.getItem(LOCAL_STATE_KEY);
  if (!value) return EMPTY;
  try {
    const parsed = JSON.parse(value) as AppState;
    return {
      ...parsed,
      group: parsed.group ? { ...parsed.group, stateRevision: parsed.group.stateRevision ?? 0 } : null,
      outing: parsed.outing ? { ...parsed.outing, revision: parsed.outing.revision ?? 1 } : null
    };
  } catch { return EMPTY; }
}

function ensureLocalJoined(state: AppState, user: { uid: string; displayName: string; photoURL: string | null }): AppState {
  const now = new Date().toISOString();
  const group: InternalWorkspace = state.group ?? { groupId: 'company', name: 'Pay Wheel', status: 'active', timezone: 'Europe/Rome', stateRevision: 0 };
  const members = state.members.some((member) => member.userId === user.uid)
    ? state.members
    : [...state.members, { userId: user.uid, displayName: user.displayName, photoUrl: user.photoURL, role: 'member' as const, access: 'admin' as const, status: 'active' as const, joinedAt: now, lastPaidWeekId: null, lastPaidAt: null }];
  const outing = state.outing && state.outing.status !== 'completed' && state.outing.status !== 'cancelled'
    ? state.outing
    : { outingId: createUuid(), revision: 1, status: 'open' as const, createdBy: user.uid, createdAt: now, drawnAt: null, payerUserId: null, payerDisplayName: null, participants: [], preview: null };
  const participants = outing.participants.some((participant) => participant.userId === user.uid)
    ? outing.participants
    : [...outing.participants, { userId: user.uid, displayName: user.displayName, joinedAt: now }];
  const changed = participants.length !== outing.participants.length;
  return {
    ...state,
    group: changed ? { ...group, stateRevision: group.stateRevision + 1 } : group,
    members,
    outing: { ...outing, revision: changed ? outing.revision + 1 : outing.revision, participants, preview: null }
  };
}

export function PayWheelProvider({ children }: { children: ReactNode }) {
  const { user } = useSession();
  const [state, setState] = useState<AppState>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [synced, setSynced] = useState(false);

  useEffect(() => {
    if (!user) {
      queueMicrotask(() => { setState(EMPTY); setSynced(false); });
      return;
    }
    if (user.demo) queueMicrotask(() => { setState(ensureLocalJoined(readLocalState(), user)); setSynced(true); });
  }, [user]);

  useEffect(() => {
    if (user?.demo && state.group) localStorage.setItem(LOCAL_STATE_KEY, JSON.stringify(state));
  }, [state, user]);

  useEffect(() => {
    if (!user || user.demo || !db) return;
    queueMicrotask(() => setSynced(false));
    let groupUnsub: (() => void) | undefined;
    let membersUnsub: (() => void) | undefined;
    let outingUnsub: (() => void) | undefined;
    let participantsUnsub: (() => void) | undefined;
    let paymentsUnsub: (() => void) | undefined;
    let subscribedOutingId: string | null = null;
    let observedStateRevision: number | null = null;
    let observedOutingRevision: number | null = null;
    let groupServerSynced = false;
    let outingServerSynced = false;
    let participantsServerSynced = false;
    const publishSyncState = () => setSynced(groupServerSynced && (!subscribedOutingId || (outingServerSynced && participantsServerSynced)));
    const userUnsub = onSnapshot(doc(db, 'users', user.uid), { includeMetadataChanges: true }, (snapshot) => {
      const groupId = (snapshot.data()?.workspaceId ?? snapshot.data()?.activeGroupId) as string | undefined;
      groupUnsub?.(); membersUnsub?.(); outingUnsub?.(); participantsUnsub?.(); paymentsUnsub?.();
      subscribedOutingId = null;
      observedStateRevision = null;
      observedOutingRevision = null;
      groupServerSynced = false;
      outingServerSynced = false;
      participantsServerSynced = false;
      if (!groupId) { setState(EMPTY); setSynced(!snapshot.metadata.fromCache && !snapshot.metadata.hasPendingWrites); return; }
      groupUnsub = onSnapshot(doc(db!, 'groups', groupId), { includeMetadataChanges: true }, (groupSnap) => {
        const data = groupSnap.data();
        if (!data) return;
        const stateRevision = typeof data.stateRevision === 'number' ? data.stateRevision : 0;
        if (observedStateRevision !== null && stateRevision < observedStateRevision) return;
        if (observedStateRevision !== null && stateRevision !== observedStateRevision) {
          outingServerSynced = false;
          participantsServerSynced = false;
        }
        observedStateRevision = stateRevision;
        groupServerSynced = !groupSnap.metadata.fromCache && !groupSnap.metadata.hasPendingWrites;
        setState((old) => shouldApplyRevision(old.group?.stateRevision, stateRevision)
          ? { ...old, group: { groupId, name: 'Pay Wheel', status: data.status === 'maintenance' ? 'maintenance' : 'active', timezone: data.timezone ?? 'Europe/Rome', stateRevision } }
          : old);
        const outingId = data.openOutingId as string | null;
        if (outingId === subscribedOutingId) { publishSyncState(); return; }
        outingUnsub?.(); participantsUnsub?.();
        subscribedOutingId = outingId;
        observedOutingRevision = null;
        outingServerSynced = false;
        participantsServerSynced = false;
        if (!outingId) { setState((old) => ({ ...old, outing: null })); publishSyncState(); return; }
        outingUnsub = onSnapshot(doc(db!, 'groups', groupId, 'outings', outingId), { includeMetadataChanges: true }, (outingSnap) => {
          const outing = outingSnap.data();
          if (!outing) return;
          const revision = typeof outing.revision === 'number' ? outing.revision : 1;
          if (observedOutingRevision !== null && revision < observedOutingRevision) return;
          observedOutingRevision = revision;
          setState((old) => old.outing?.outingId === outingId && !shouldApplyRevision(old.outing.revision, revision)
            ? old
            : { ...old, outing: { outingId, revision, status: outing.status, createdBy: outing.createdBy, createdAt: outing.createdAt?.toDate?.().toISOString?.() ?? new Date().toISOString(), drawnAt: outing.drawnAt?.toDate?.().toISOString?.() ?? null, payerUserId: outing.payerUserId ?? null, payerDisplayName: outing.payerDisplayNameSnapshot ?? null, participants: old.outing?.outingId === outingId ? old.outing.participants : [], preview: outing.fairnessSnapshot ? { ...outing.fairnessSnapshot, previewVersion: outing.fairnessSnapshot.previewVersion } : old.outing?.outingId === outingId ? old.outing.preview : null } });
          outingServerSynced = !outingSnap.metadata.fromCache && !outingSnap.metadata.hasPendingWrites;
          publishSyncState();
        });
        participantsUnsub = onSnapshot(query(collection(db!, 'groups', groupId, 'outings', outingId, 'participants'), orderBy('joinedAt')), { includeMetadataChanges: true }, (participantSnap) => {
          const participants = participantSnap.docs.map((item) => { const value = item.data(); return { userId: item.id, displayName: value.displayNameSnapshot, joinedAt: value.joinedAt?.toDate?.().toISOString?.() ?? new Date().toISOString() }; });
          setState((old) => ({ ...old, outing: old.outing?.outingId === outingId ? { ...old.outing, participants } : old.outing }));
          participantsServerSynced = !participantSnap.metadata.fromCache && !participantSnap.metadata.hasPendingWrites;
          publishSyncState();
        });
      });
      membersUnsub = onSnapshot(collection(db!, 'groups', groupId, 'memberships'), (memberSnap) => {
        const members = memberSnap.docs.map((item) => { const value = item.data(); return { userId: item.id, displayName: value.displayNameSnapshot, photoUrl: value.photoUrlSnapshot ?? null, role: 'member' as const, access: value.access === 'admin' ? 'admin' as const : 'member' as const, status: value.status, joinedAt: value.joinedAt?.toDate?.().toISOString?.() ?? new Date().toISOString(), lastPaidWeekId: value.lastPaidWeekId ?? null, lastPaidAt: value.lastPaidAt?.toDate?.().toISOString?.() ?? null } as Member; });
        setState((old) => ({ ...old, members }));
      });
      paymentsUnsub = onSnapshot(query(collection(db!, 'groups', groupId, 'payments'), orderBy('createdAt', 'desc'), limit(100)), (paymentSnap) => {
        const payments = paymentSnap.docs.map((item) => { const value = item.data(); return { outingId: value.outingId ?? item.id, payerUserId: value.payerUserId, payerDisplayName: value.payerDisplayNameSnapshot, amountCents: value.amountCents, weekId: value.weekId, source: value.source, participantCountAtDraw: value.participantCountAtDraw, participantUserIds: value.participantUserIdsAtDraw ?? [value.payerUserId], eligibleParticipantUserIds: Array.isArray(value.eligibleParticipantUserIdsAtDraw) ? value.eligibleParticipantUserIdsAtDraw : null, correctedAt: value.correctedAt?.toDate?.().toISOString?.() ?? null, createdAt: value.createdAt?.toDate?.().toISOString?.() ?? new Date().toISOString() } as Payment; });
        setState((old) => ({ ...old, payments }));
      });
    });
    return () => { userUnsub(); groupUnsub?.(); membersUnsub?.(); outingUnsub?.(); participantsUnsub?.(); paymentsUnsub?.(); };
  }, [user]);

  async function action<T>(fn: () => Promise<T>) {
    setBusy(true);
    try { return await fn(); } finally { setBusy(false); }
  }

  const requireUser = () => {
    if (!user) throw new Error('Accesso richiesto');
    return user;
  };

  const value = useMemo<ContextValue>(() => ({
    ...state,
    busy,
    synced,
    async joinCurrentOuting(participating = true) {
      await action(async () => {
        const current = requireUser();
        if (!current.demo) {
          await callFunction('joinCurrentOuting', { requestId: newRequestId(), participating });
          return;
        }
        if (participating) {
          setState((old) => ensureLocalJoined(old, current));
          return;
        }
        setState((old) => {
          if (old.outing?.status !== 'open' || !old.outing.participants.some((entry) => entry.userId === current.uid)) return old;
          return {
            ...old,
            group: old.group ? { ...old.group, stateRevision: old.group.stateRevision + 1 } : null,
            outing: { ...old.outing, revision: old.outing.revision + 1, preview: null, participants: old.outing.participants.filter((entry) => entry.userId !== current.uid) }
          };
        });
      });
    },
    async toggleParticipation() {
      const current = requireUser();
      const joined = state.outing?.participants.some((entry) => entry.userId === current.uid) ?? false;
      await value.joinCurrentOuting(!joined);
    },
    seedTestColleagues() {
      if (!user?.demo) return;
      const currentState = state.outing ? state : ensureLocalJoined(state, user);
      const names = [['giulia', 'Giulia'], ['luca', 'Luca'], ['sara', 'Sara']] as const;
      setState({ ...currentState, group: currentState.group ? { ...currentState.group, stateRevision: currentState.group.stateRevision + 1 } : null, members: [...currentState.members.filter((entry) => !names.some(([id]) => id === entry.userId)), ...names.map(([id, name], index) => ({ userId: id, displayName: name, photoUrl: null, role: 'member' as const, access: 'member' as const, status: 'active' as const, joinedAt: new Date(Date.now() + index * 1000).toISOString(), lastPaidWeekId: id === 'luca' ? getWeekId(new Date()) : null, lastPaidAt: id === 'luca' ? new Date(Date.now() - 86400000).toISOString() : null }))], outing: currentState.outing ? { ...currentState.outing, revision: currentState.outing.revision + 1, preview: null, participants: [...currentState.outing.participants.filter((entry) => !names.some(([id]) => id === entry.userId)), ...names.map(([id, name], index) => ({ userId: id, displayName: name, joinedAt: new Date(Date.now() + index * 1000).toISOString() }))] } : null });
    },
    async refreshPreview() {
      await action(async () => {
        if (!state.outing || !state.group) return;
        if (!user?.demo) {
          const preview = await callFunction<
            { outingId: string },
            FairnessPreview & { previewVersion: string; revision: number; stateRevision: number }
          >('previewOuting', { outingId: state.outing.outingId });
          setState((old) => {
            const currentOuting = old.outing;
            if (!currentOuting || currentOuting.outingId !== state.outing?.outingId || !shouldApplyRevision(currentOuting.revision, preview.revision)) return old;
            return {
                ...old,
                group: old.group && shouldApplyRevision(old.group.stateRevision, preview.stateRevision) ? { ...old.group, stateRevision: preview.stateRevision } : old.group,
                outing: { ...currentOuting, revision: preview.revision, preview }
              };
          });
          return;
        }
        const weekId = getWeekId(new Date(), state.group.timezone);
        const inputs = state.outing.participants.map((participant) => {
          const member = state.members.find((entry) => entry.userId === participant.userId);
          const spentCents = state.payments.filter((payment) => payment.payerUserId === participant.userId && payment.weekId === weekId).reduce((sum, payment) => sum + payment.amountCents, 0);
          return { userId: participant.userId, displayName: participant.displayName, joinedAt: participant.joinedAt, spentCents, lastPaidWeekId: member?.lastPaidWeekId ?? null, lastPaidAt: member?.lastPaidAt ?? null };
        });
        const totals = inputs.map((entry) => entry.spentCents);
        const average = totals.length ? Math.round(totals.reduce((a, b) => a + b, 0) / totals.length) : 0;
        const preview = buildFairnessPreview(inputs, weekId, average);
        const previewVersion = await createPreviewVersion(preview);
        setState((old) => ({ ...old, outing: old.outing ? { ...old.outing, preview: { ...preview, previewVersion } } : null }));
      });
    },
    async spin() {
      return action(async () => {
        if (!state.outing?.preview) throw new Error('Aggiorna prima le probabilità.');
        if (!user?.demo) {
          const result = await callFunction<
            { requestId: string; outingId: string; expectedPreviewVersion: string; expectedRevision: number },
            { payer: { userId: string; displayName: string }; drawnAt: string; revision: number; stateRevision: number; replayed: boolean }
          >('spinOuting', { requestId: newRequestId(), outingId: state.outing.outingId, expectedPreviewVersion: state.outing.preview.previewVersion, expectedRevision: state.outing.revision });
          setState((old) => {
            const currentOuting = old.outing;
            if (!currentOuting || currentOuting.outingId !== state.outing?.outingId || !shouldApplyRevision(currentOuting.revision, result.revision)) return old;
            return {
                ...old,
                group: old.group && shouldApplyRevision(old.group.stateRevision, result.stateRevision) ? { ...old.group, stateRevision: result.stateRevision } : old.group,
                outing: { ...currentOuting, revision: result.revision, status: 'drawn', drawnAt: result.drawnAt, payerUserId: result.payer.userId, payerDisplayName: result.payer.displayName }
              };
          });
          return { payerUserId: result.payer.userId };
        }
        const eligible = state.outing.preview.entries.filter((entry) => entry.weightMicros > 0);
        const threshold = Math.random(); let cumulative = 0; let payer = eligible.at(-1)!;
        for (const entry of eligible) { cumulative += entry.probabilityMicros / 1_000_000; if (threshold <= cumulative) { payer = entry; break; } }
        setState((old) => ({ ...old, group: old.group ? { ...old.group, stateRevision: old.group.stateRevision + 1 } : null, outing: old.outing ? { ...old.outing, revision: old.outing.revision + 1, status: 'drawn', drawnAt: new Date().toISOString(), payerUserId: payer.userId, payerDisplayName: payer.displayName } : null }));
        void trackEvent('spin_completed', { participant_bucket: eligible.length <= 5 ? '2-5' : eligible.length <= 10 ? '6-10' : '11-25' });
        return { payerUserId: payer.userId };
      });
    },
    async confirmPayment(amountCents) {
      await action(async () => {
        if (!state.group || !state.outing?.payerUserId) return;
        if (!user?.demo) {
          await callFunction('confirmPayment', { requestId: newRequestId(), outingId: state.outing.outingId, amountCents });
          return;
        }
        const now = new Date().toISOString(); const weekId = getWeekId(new Date(), state.group.timezone); const payerId = state.outing.payerUserId; const payerName = state.outing.payerDisplayName ?? 'Collega';
        const payment: Payment = { outingId: state.outing.outingId, payerUserId: payerId, payerDisplayName: payerName, amountCents, weekId, source: 'manual', participantCountAtDraw: state.outing.participants.length, participantUserIds: state.outing.participants.map((participant) => participant.userId), eligibleParticipantUserIds: state.outing.preview?.entries.filter((entry) => entry.weightMicros > 0).map((entry) => entry.userId) ?? null, correctedAt: null, createdAt: now };
        setState((old) => ({ ...old, payments: [...old.payments, payment], members: old.members.map((member) => member.userId === payerId ? { ...member, lastPaidWeekId: weekId, lastPaidAt: now } : member), outing: null }));
      });
    },
    async autoSettleTest() {
      await action(async () => {
        if (!state.outing?.payerUserId || !state.group || !user?.demo) return;
        const now = new Date().toISOString(); const weekId = getWeekId(new Date(), state.group.timezone); const payerId = state.outing.payerUserId;
        const payment: Payment = { outingId: state.outing.outingId, payerUserId: payerId, payerDisplayName: state.outing.payerDisplayName ?? 'Collega', amountCents: calculateAutomaticPayment(state.outing.participants.length), weekId, source: 'automatic', participantCountAtDraw: state.outing.participants.length, participantUserIds: state.outing.participants.map((participant) => participant.userId), eligibleParticipantUserIds: state.outing.preview?.entries.filter((entry) => entry.weightMicros > 0).map((entry) => entry.userId) ?? null, correctedAt: null, createdAt: now };
        setState((old) => ({ ...old, payments: [...old.payments, payment], members: old.members.map((member) => member.userId === payerId ? { ...member, lastPaidWeekId: weekId, lastPaidAt: now } : member), outing: null }));
      });
    },
    async correctPayment(amountCents, reason) {
      await action(async () => {
        const payment = [...state.payments].reverse().find((item) => item.source === 'automatic');
        if (!payment) return;
        if (!user?.demo) {
          await callFunction('correctAutomaticPayment', { requestId: newRequestId(), outingId: payment.outingId, amountCents, reason });
          return;
        }
        setState((old) => ({ ...old, payments: old.payments.map((item) => item.outingId === payment.outingId ? { ...item, amountCents, correctedAt: new Date().toISOString() } : item) }));
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [busy, state, synced, user]);

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function usePayWheel() {
  const value = useContext(Context);
  if (!value) throw new Error('usePayWheel must be inside PayWheelProvider');
  return value;
}
