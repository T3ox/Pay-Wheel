import { Timestamp } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { requestIdSchema } from '@pay-wheel/domain';
import { z } from 'zod';
import { db, internalWorkspaceId, requireActiveMember, requireInternalMember, requireUid } from '../platform/firebase.js';
import { refs } from '../repositories/firestore.js';
import { nextRevision, readRevision } from '../domain/shared-wheel.js';

const options = { region: 'europe-west1', enforceAppCheck: process.env.FUNCTIONS_EMULATOR !== 'true' } as const;

export const joinCurrentOuting = onCall(options, async (request) => {
  const uid = requireUid(request);
  const input = z.object({ requestId: requestIdSchema, participating: z.boolean().default(true) }).parse(request.data);
  const membership = await requireInternalMember(uid);
  const groupId = internalWorkspaceId;

  return db.runTransaction(async (transaction) => {
    const groupRef = refs.group(groupId);
    const group = await transaction.get(groupRef);
    if (!group.exists || group.data()?.status !== 'active') throw new HttpsError('failed-precondition', 'Workspace non disponibile.', { code: 'WORKSPACE_NOT_ACTIVE' });
    const currentStateRevision = readRevision(group.data()?.stateRevision);
    const outingId = group.data()?.openOutingId as string | null;
    if (!outingId) {
      if (!input.participating) return { outingId: null, status: 'none', participating: false, participantCount: 0, revision: null, stateRevision: currentStateRevision, created: false };
      const outingRef = db.collection(`groups/${groupId}/outings`).doc();
      const now = Timestamp.now();
      const revision = 1;
      const stateRevision = nextRevision(currentStateRevision);
      transaction.set(outingRef, { groupId, createdBy: uid, status: 'open', revision, participantCount: 1, participantCountAtDraw: null, previewVersion: null, previewGeneratedAt: null, createdAt: now, lockedAt: null, drawnAt: null, completedAt: null, cancelledAt: null, cancelledBy: null, cancelReason: null, payerUserId: null, payerDisplayNameSnapshot: null, paymentId: null, completedSequence: null, fairnessSnapshot: null });
      transaction.set(refs.participants(groupId, outingRef.id).doc(uid), { userId: uid, displayNameSnapshot: membership.displayNameSnapshot, photoUrlSnapshot: membership.photoUrlSnapshot ?? null, joinedAt: now, joinedBy: uid, eligibilityAtDraw: null, protectedUntilWeekEndAtDraw: null, weeklyTotalCentsAtDraw: null, weightMicrosAtDraw: null, probabilityMicrosAtDraw: null });
      transaction.update(groupRef, { openOutingId: outingRef.id, stateRevision, updatedAt: now });
      return { outingId: outingRef.id, status: 'open', participating: true, participantCount: 1, revision, stateRevision, created: true };
    }

    const outingRef = refs.outing(groupId, outingId);
    const participantRef = refs.participants(groupId, outingId).doc(uid);
    const [outing, participant] = await Promise.all([transaction.get(outingRef), transaction.get(participantRef)]);
    if (!outing.exists || outing.data()?.status !== 'open') throw new HttpsError('failed-precondition', 'Le iscrizioni sono chiuse.', { code: 'OUTING_NOT_OPEN' });
    let count = outing.data()!.participantCount as number;
    const currentRevision = readRevision(outing.data()?.revision);
    let changed = false;
    if (input.participating && !participant.exists) {
      if (count >= 25) throw new HttpsError('resource-exhausted', 'Limite partecipanti raggiunto.', { code: 'WORKSPACE_LIMIT' });
      transaction.set(participantRef, { userId: uid, displayNameSnapshot: membership.displayNameSnapshot, photoUrlSnapshot: membership.photoUrlSnapshot ?? null, joinedAt: Timestamp.now(), joinedBy: uid, eligibilityAtDraw: null, protectedUntilWeekEndAtDraw: null, weeklyTotalCentsAtDraw: null, weightMicrosAtDraw: null, probabilityMicrosAtDraw: null });
      count += 1;
      changed = true;
    }
    if (!input.participating && participant.exists) { transaction.delete(participantRef); count -= 1; changed = true; }
    const revision = changed ? nextRevision(currentRevision) : currentRevision;
    const stateRevision = changed ? nextRevision(currentStateRevision) : currentStateRevision;
    if (changed) {
      const now = Timestamp.now();
      transaction.update(outingRef, { participantCount: count, revision, previewVersion: null, previewGeneratedAt: null });
      transaction.update(groupRef, { stateRevision, updatedAt: now });
    }
    return { outingId, status: 'open', participating: input.participating, participantCount: count, revision, stateRevision, created: false };
  });
});

export const createOuting = onCall(options, async (request) => {
  const uid = requireUid(request); const input = z.object({ requestId: requestIdSchema, groupId: z.string() }).parse(request.data); await requireActiveMember(input.groupId, uid);
  return db.runTransaction(async (transaction) => {
    const groupRef = refs.group(input.groupId); const group = await transaction.get(groupRef);
    if (!group.exists || group.data()?.status !== 'active') throw new HttpsError('failed-precondition', 'Gruppo non attivo.', { code: 'GROUP_NOT_ACTIVE' });
    if (group.data()?.openOutingId) return { outingId: group.data()!.openOutingId, status: 'open', joined: false, revision: null, stateRevision: readRevision(group.data()?.stateRevision), created: false };
    const outingRef = db.collection(`groups/${input.groupId}/outings`).doc(); const membership = await transaction.get(refs.membership(input.groupId, uid)); const now = Timestamp.now();
    const revision = 1; const stateRevision = nextRevision(group.data()?.stateRevision);
    transaction.set(outingRef, { groupId: input.groupId, createdBy: uid, status: 'open', revision, participantCount: 1, participantCountAtDraw: null, previewVersion: null, previewGeneratedAt: null, createdAt: now, lockedAt: null, drawnAt: null, completedAt: null, cancelledAt: null, cancelledBy: null, cancelReason: null, payerUserId: null, payerDisplayNameSnapshot: null, paymentId: null, completedSequence: null, fairnessSnapshot: null });
    transaction.set(refs.participants(input.groupId, outingRef.id).doc(uid), { userId: uid, displayNameSnapshot: membership.data()?.displayNameSnapshot ?? 'Collega', photoUrlSnapshot: membership.data()?.photoUrlSnapshot ?? null, joinedAt: now, joinedBy: uid, eligibilityAtDraw: null, protectedUntilWeekEndAtDraw: null, weeklyTotalCentsAtDraw: null, weightMicrosAtDraw: null, probabilityMicrosAtDraw: null });
    transaction.update(groupRef, { openOutingId: outingRef.id, stateRevision, updatedAt: now });
    return { outingId: outingRef.id, status: 'open', joined: true, revision, stateRevision, created: true };
  });
});

export const setParticipation = onCall(options, async (request) => {
  const uid = requireUid(request); const input = z.object({ requestId: requestIdSchema, groupId: z.string(), outingId: z.string(), participating: z.boolean() }).parse(request.data); const membership = await requireActiveMember(input.groupId, uid);
  return db.runTransaction(async (transaction) => {
    const groupRef = refs.group(input.groupId); const outingRef = refs.outing(input.groupId, input.outingId); const [group, outing] = await Promise.all([transaction.get(groupRef), transaction.get(outingRef)]);
    if (!outing.exists || outing.data()?.status !== 'open') throw new HttpsError('failed-precondition', 'Le iscrizioni sono chiuse.', { code: 'OUTING_NOT_OPEN' });
    const participantRef = refs.participants(input.groupId, input.outingId).doc(uid); const participant = await transaction.get(participantRef); let count = outing.data()!.participantCount as number; let changed = false;
    if (input.participating && !participant.exists) { if (count >= 25) throw new HttpsError('resource-exhausted', 'Limite partecipanti raggiunto.', { code: 'GROUP_LIMIT' }); transaction.set(participantRef, { userId: uid, displayNameSnapshot: membership.displayNameSnapshot, photoUrlSnapshot: membership.photoUrlSnapshot ?? null, joinedAt: Timestamp.now(), joinedBy: uid, eligibilityAtDraw: null, protectedUntilWeekEndAtDraw: null, weeklyTotalCentsAtDraw: null, weightMicrosAtDraw: null, probabilityMicrosAtDraw: null }); count++; changed = true; }
    if (!input.participating && participant.exists) { transaction.delete(participantRef); count--; changed = true; }
    const revision = changed ? nextRevision(outing.data()?.revision) : readRevision(outing.data()?.revision); const stateRevision = changed ? nextRevision(group.data()?.stateRevision) : readRevision(group.data()?.stateRevision);
    if (changed) { const now = Timestamp.now(); transaction.update(outingRef, { participantCount: count, revision, previewVersion: null, previewGeneratedAt: null }); transaction.update(groupRef, { stateRevision, updatedAt: now }); }
    return { outingId: input.outingId, participating: input.participating, participantCount: count, revision, stateRevision };
  });
});
