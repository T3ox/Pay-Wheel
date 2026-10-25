import { Timestamp } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { getWeekId, paymentAmountSchema, requestIdSchema } from '@pay-wheel/domain';
import { z } from 'zod';
import { db, internalWorkspaceId, requireInternalMember, requireUid } from '../platform/firebase.js';
import { getIdempotentResult, saveIdempotentResult } from '../platform/idempotency.js';
import { recalculateSummary, refs } from '../repositories/firestore.js';

const options = { region: 'europe-west1', enforceAppCheck: process.env.FUNCTIONS_EMULATOR !== 'true' } as const;

export const confirmPayment = onCall(options, async (request) => {
  const uid = requireUid(request); const input = z.object({ requestId: requestIdSchema, outingId: z.string(), amountCents: paymentAmountSchema }).parse(request.data); await requireInternalMember(uid); const groupId = internalWorkspaceId;
  const replay = await getIdempotentResult(groupId, input.requestId, 'confirmPayment', uid, input); if (replay) return replay;
  return db.runTransaction(async (transaction) => {
    const groupRef = refs.group(groupId); const outingRef = refs.outing(groupId, input.outingId); const paymentRef = refs.payment(groupId, input.outingId);
    const [groupSnapshot, outingSnapshot, paymentSnapshot, participantsSnapshot] = await Promise.all([transaction.get(groupRef), transaction.get(outingRef), transaction.get(paymentRef), transaction.get(refs.participants(groupId, input.outingId))]);
    const group = groupSnapshot.data(); const outing = outingSnapshot.data();
    if (!group || !outing) throw new HttpsError('not-found', 'Uscita non trovata.', { code: 'NOT_FOUND' });
    if (outing.payerUserId !== uid) throw new HttpsError('permission-denied', 'Solo il pagante può confermare.', { code: 'ONLY_PAYER_CAN_CONFIRM' });
    if (outing.status !== 'drawn' || paymentSnapshot.exists) throw new HttpsError('already-exists', 'Pagamento già registrato.', { code: 'PAYMENT_ALREADY_CONFIRMED' });
    const now = Timestamp.now(); const weekId = getWeekId(now.toDate(), group.timezone); const nextSequence = (group.completedOutingSequence ?? 0) + 1; const participants = participantsSnapshot.docs.map((item) => ({ userId: item.id, displayName: item.data().displayNameSnapshot }));
    const summaryRef = refs.summary(groupId, weekId); const summarySnapshot = await transaction.get(summaryRef); const aggregate = recalculateSummary(summarySnapshot.data(), participants, uid, outing.payerDisplayNameSnapshot, input.amountCents, 1);
    transaction.set(paymentRef, { outingId: input.outingId, payerUserId: uid, payerDisplayNameSnapshot: outing.payerDisplayNameSnapshot, amountCents: input.amountCents, currency: 'EUR', weekId, completedSequence: nextSequence, confirmedBy: uid, source: 'manual', participantCountAtDraw: outing.participantCountAtDraw, participantUserIdsAtDraw: participants.map((participant) => participant.userId), autoFormulaBaseCents: null, autoPenaltyCents: null, correctedAt: null, requestId: input.requestId, createdAt: now });
    transaction.set(summaryRef, { weekId, currency: 'EUR', ...aggregate, updatedAt: now }, { merge: true });
    transaction.update(refs.membership(groupId, uid), { lastPaidWeekId: weekId, lastPaidAt: now });
    transaction.update(outingRef, { status: 'completed', completedAt: now, paymentId: input.outingId, completedSequence: nextSequence }); transaction.update(groupRef, { openOutingId: null, completedOutingSequence: nextSequence, updatedAt: now });
    const result = { outingId: input.outingId, paymentId: input.outingId, status: 'completed', amountCents: input.amountCents, currency: 'EUR', completedSequence: nextSequence, weekId };
    saveIdempotentResult(transaction, groupId, input.requestId, 'confirmPayment', uid, input.outingId, input, result); return result;
  });
});
