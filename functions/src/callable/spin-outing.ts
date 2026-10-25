import { randomInt } from 'node:crypto';
import { Timestamp } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import { requestIdSchema, selectWeightedUser } from '@pay-wheel/domain';
import { z } from 'zod';
import { db, internalWorkspaceId, requireInternalMember, requireUid } from '../platform/firebase.js';
import { enforceRateLimit } from '../platform/rate-limit.js';
import { calculateOutingPreview } from '../domain/preview-outing.js';
import { refs } from '../repositories/firestore.js';
import { hasPersistedSpinResult, nextRevision, readRevision, revisionMatches } from '../domain/shared-wheel.js';

const options = { region: 'europe-west1', enforceAppCheck: process.env.FUNCTIONS_EMULATOR !== 'true' } as const;

export const previewOuting = onCall(options, async (request) => {
  const uid = requireUid(request); const input = z.object({ outingId: z.string() }).parse(request.data); await requireInternalMember(uid); enforceRateLimit(`preview:${uid}:${input.outingId}`);
  const groupId = internalWorkspaceId;
  const preview = await calculateOutingPreview(groupId, input.outingId);
  await refs.outing(groupId, input.outingId).update({ previewVersion: preview.previewVersion, previewGeneratedAt: Timestamp.now() });
  logger.info('outing.preview', { workspace: 'internal', outingId: input.outingId, participantCount: preview.participantCount, revision: preview.revision });
  return { ...preview, generatedAt: new Date().toISOString() };
});

export const spinOuting = onCall(options, async (request) => {
  const uid = requireUid(request); const input = z.object({ requestId: requestIdSchema, outingId: z.string(), expectedPreviewVersion: z.string(), expectedRevision: z.number().int().positive() }).parse(request.data); await requireInternalMember(uid); enforceRateLimit(`spin:${uid}:${input.outingId}`, 3, 3600000);
  const groupId = internalWorkspaceId;
  const result = await db.runTransaction(async (transaction) => {
    const outingRef = refs.outing(groupId, input.outingId); const outingSnapshot = await transaction.get(outingRef); const existing = outingSnapshot.data();
    if (hasPersistedSpinResult(existing)) {
      const groupSnapshot = await transaction.get(refs.group(groupId));
      return { outingId: input.outingId, status: 'drawn', payer: { userId: existing.payerUserId, displayName: existing.payerDisplayNameSnapshot }, ...(existing.fairnessSnapshot ?? {}), revision: readRevision(existing.revision, 1), stateRevision: readRevision(groupSnapshot.data()?.stateRevision), drawnAt: existing.drawnAt?.toDate().toISOString() ?? new Date().toISOString(), replayed: true };
    }
    const callerParticipant = await transaction.get(refs.participants(groupId, input.outingId).doc(uid)); if (!callerParticipant.exists) throw new HttpsError('permission-denied', 'Devi partecipare per girare.', { code: 'NOT_PARTICIPANT' });
    const preview = await calculateOutingPreview(groupId, input.outingId, transaction);
    if (preview.participantCount < 2) throw new HttpsError('failed-precondition', 'Servono almeno due partecipanti.', { code: 'NOT_ENOUGH_PARTICIPANTS' });
    if (!revisionMatches(preview.revision, input.expectedRevision) || preview.previewVersion !== input.expectedPreviewVersion) throw new HttpsError('aborted', 'Il gruppo è cambiato. Controlla le nuove probabilità.', { code: 'PREVIEW_STALE', preview });
    const totalWeight = preview.entries.reduce((sum, entry) => sum + entry.weightMicros, 0); const randomValue = randomInt(totalWeight); const payerId = selectWeightedUser(preview.entries, randomValue); const payer = preview.entries.find((entry) => entry.userId === payerId)!; const now = Timestamp.now();
    const fairnessSnapshot = { algorithmVersion: preview.algorithmVersion, previewVersion: preview.previewVersion, weekId: preview.weekId, weeklyAverageCents: preview.weeklyAverageCents, cooldownOverrideApplied: preview.cooldownOverrideApplied, eligibleUserIds: preview.entries.filter((entry) => entry.weightMicros > 0).map((entry) => entry.userId), entries: preview.entries, selectedUserId: payerId, randomUpperBound: totalWeight, randomValue };
    const revision = nextRevision(preview.revision); const stateRevision = nextRevision(preview.stateRevision);
    transaction.update(outingRef, { status: 'drawn', revision, lockedAt: now, drawnAt: now, participantCountAtDraw: preview.participantCount, payerUserId: payerId, payerDisplayNameSnapshot: payer.displayName, fairnessSnapshot });
    transaction.update(refs.group(groupId), { stateRevision, updatedAt: now });
    for (const entry of preview.entries) transaction.update(refs.participants(groupId, input.outingId).doc(entry.userId), { eligibilityAtDraw: entry.eligibility, protectedUntilWeekEndAtDraw: entry.protectedUntilWeekEnd, weeklyTotalCentsAtDraw: entry.spentCents, weightMicrosAtDraw: entry.weightMicros, probabilityMicrosAtDraw: entry.probabilityMicros });
    return { outingId: input.outingId, status: 'drawn', payer: { userId: payerId, displayName: payer.displayName }, previewVersion: preview.previewVersion, algorithmVersion: preview.algorithmVersion, cooldownOverrideApplied: preview.cooldownOverrideApplied, entries: preview.entries, revision, stateRevision, drawnAt: now.toDate().toISOString(), replayed: false };
  });
  logger.info('outing.spin', { workspace: 'internal', outingId: input.outingId, replayed: 'replayed' in result && result.replayed === true });
  return result;
});
