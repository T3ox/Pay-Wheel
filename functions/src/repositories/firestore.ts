import { FieldValue, Timestamp, type DocumentData } from 'firebase-admin/firestore';
import { db } from '../platform/firebase.js';

export const refs = {
  user: (uid: string) => db.doc(`users/${uid}`),
  group: (groupId: string) => db.doc(`groups/${groupId}`),
  membership: (groupId: string, uid: string) => db.doc(`groups/${groupId}/memberships/${uid}`),
  outing: (groupId: string, outingId: string) => db.doc(`groups/${groupId}/outings/${outingId}`),
  participants: (groupId: string, outingId: string) => db.collection(`groups/${groupId}/outings/${outingId}/participants`),
  payment: (groupId: string, outingId: string) => db.doc(`groups/${groupId}/payments/${outingId}`),
  summary: (groupId: string, weekId: string) => db.doc(`groups/${groupId}/weeklySummaries/${weekId}`),
  adminAnalytics: (groupId: string, weekId: string) => db.doc(`groups/${groupId}/adminAnalytics/${weekId}`),
  appliedAdminOuting: (groupId: string, weekId: string, outingId: string) => db.doc(`groups/${groupId}/adminAnalytics/${weekId}/appliedOutings/${outingId}`)
};

export function now() { return Timestamp.now(); }
export const serverTimestamp = FieldValue.serverTimestamp;

export interface MemberStat { displayNameSnapshot: string; spentCents: number; participationCount: number; paymentCount: number; deviationCents: number; probabilityTrend: 'up' | 'equal' | 'down' | 'protected'; }

export function recalculateSummary(current: DocumentData | undefined, participants: Array<{ userId: string; displayName: string }>, payerId: string, payerName: string, amountDelta: number, paymentCountDelta: number) {
  const memberStats: Record<string, MemberStat> = structuredClone(current?.memberStats ?? {});
  for (const participant of participants) {
    const existing = memberStats[participant.userId] ?? { displayNameSnapshot: participant.displayName, spentCents: 0, participationCount: 0, paymentCount: 0, deviationCents: 0, probabilityTrend: 'equal' as const };
    memberStats[participant.userId] = { ...existing, displayNameSnapshot: participant.displayName, participationCount: existing.participationCount + (paymentCountDelta > 0 ? 1 : 0) };
  }
  const payer = memberStats[payerId] ?? { displayNameSnapshot: payerName, spentCents: 0, participationCount: 1, paymentCount: 0, deviationCents: 0, probabilityTrend: 'equal' as const };
  memberStats[payerId] = { ...payer, spentCents: payer.spentCents + amountDelta, paymentCount: payer.paymentCount + paymentCountDelta };
  const active = Object.values(memberStats).filter((entry) => entry.participationCount > 0);
  const totalCents = active.reduce((sum, entry) => sum + entry.spentCents, 0);
  const averageCents = active.length ? Math.round(totalCents / active.length) : 0;
  for (const [uid, entry] of Object.entries(memberStats)) {
    const deviationCents = entry.spentCents - averageCents;
    memberStats[uid] = { ...entry, deviationCents, probabilityTrend: uid === payerId ? 'protected' : deviationCents < 0 ? 'up' : deviationCents > 0 ? 'down' : 'equal' };
  }
  return { memberStats, totalCents, averageCents, activeParticipantCount: active.length };
}
