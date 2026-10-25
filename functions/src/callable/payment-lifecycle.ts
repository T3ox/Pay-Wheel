import { calculateAutomaticPayment, correctionReasonSchema, getWeekId, paymentAmountSchema, requestIdSchema } from '@pay-wheel/domain';
import { Timestamp } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { z } from 'zod';
import { db, hasInternalAdminClaim, internalWorkspaceId, requireInternalMember, requireUid } from '../platform/firebase.js';
import { applyPaymentToAdminAnalytics } from '../repositories/admin-analytics.js';
import { recalculateSummary, refs } from '../repositories/firestore.js';
import { nextRevision } from '../domain/shared-wheel.js';

const options = { region: 'europe-west1', enforceAppCheck: process.env.FUNCTIONS_EMULATOR !== 'true' } as const;

async function settleAutomatically(groupId: string, outingId: string) {
  return db.runTransaction(async (transaction) => {
    const groupRef = refs.group(groupId); const outingRef = refs.outing(groupId, outingId); const paymentRef = refs.payment(groupId, outingId);
    const [groupSnapshot, outingSnapshot, paymentSnapshot, participantsSnapshot] = await Promise.all([transaction.get(groupRef), transaction.get(outingRef), transaction.get(paymentRef), transaction.get(refs.participants(groupId, outingId))]);
    const group = groupSnapshot.data(); const outing = outingSnapshot.data();
    if (!group || !outing || outing.status !== 'drawn' || paymentSnapshot.exists || outing.drawnAt.toMillis() > Date.now() - 3600000) return false;
    const now = Timestamp.now(); const weekId = getWeekId(now.toDate(), group.timezone); const count = outing.participantCountAtDraw as number; const amountCents = calculateAutomaticPayment(count); const nextSequence = (group.completedOutingSequence ?? 0) + 1; const participants = participantsSnapshot.docs.map((item) => { const value = item.data(); return { userId: item.id, displayName: value.displayNameSnapshot, eligible: typeof value.weightMicrosAtDraw === 'number' ? value.weightMicrosAtDraw > 0 : null }; });
    const summaryRef = refs.summary(groupId, weekId); const summarySnapshot = await transaction.get(summaryRef); const aggregate = recalculateSummary(summarySnapshot.data(), participants, outing.payerUserId, outing.payerDisplayNameSnapshot, amountCents, 1);
    await applyPaymentToAdminAnalytics(transaction, { groupId, weekId, outingId, payerUserId: outing.payerUserId, payerDisplayName: outing.payerDisplayNameSnapshot, amountCents, drawnAt: outing.drawnAt?.toDate?.() ?? now.toDate(), participants });
    const eligibleParticipantUserIdsAtDraw = participants.every((participant) => participant.eligible !== null) ? participants.filter((participant) => participant.eligible).map((participant) => participant.userId) : null;
    transaction.set(paymentRef, { outingId, payerUserId: outing.payerUserId, payerDisplayNameSnapshot: outing.payerDisplayNameSnapshot, amountCents, currency: 'EUR', weekId, completedSequence: nextSequence, confirmedBy: null, source: 'automatic', participantCountAtDraw: count, participantUserIdsAtDraw: participants.map((participant) => participant.userId), eligibleParticipantUserIdsAtDraw, analyticsAppliedVersion: 1, autoFormulaBaseCents: 130 * count, autoPenaltyCents: 200, correctedAt: null, requestId: `auto:${outingId}`, createdAt: now });
    const revision = nextRevision(outing.revision); const stateRevision = nextRevision(group.stateRevision);
    transaction.set(summaryRef, { weekId, currency: 'EUR', ...aggregate, updatedAt: now }, { merge: true }); transaction.update(refs.membership(groupId, outing.payerUserId), { lastPaidWeekId: weekId, lastPaidAt: now }); transaction.update(outingRef, { status: 'completed', revision, completedAt: now, paymentId: outingId, completedSequence: nextSequence }); transaction.update(groupRef, { openOutingId: null, stateRevision, completedOutingSequence: nextSequence, updatedAt: now }); return true;
  });
}

export const autoSettlePayments = onSchedule({ region: 'europe-west1', schedule: 'every 5 minutes', timeZone: 'UTC' }, async () => {
  const threshold = Timestamp.fromMillis(Date.now() - 3600000); const outings = await db.collection(`groups/${internalWorkspaceId}/outings`).where('status', '==', 'drawn').where('drawnAt', '<=', threshold).limit(100).get();
  await Promise.all(outings.docs.map((outing) => settleAutomatically(internalWorkspaceId, outing.id)));
});

export const correctAutomaticPayment = onCall(options, async (request) => {
  const uid = requireUid(request); const input = z.object({ requestId: requestIdSchema, outingId: z.string(), amountCents: paymentAmountSchema, reason: correctionReasonSchema }).parse(request.data); const groupId = internalWorkspaceId; const membership = await requireInternalMember(uid);
  return db.runTransaction(async (transaction) => {
    const paymentRef = refs.payment(groupId, input.outingId);
    const outingRef = refs.outing(groupId, input.outingId);
    const [groupSnapshot, paymentSnapshot, outingSnapshot, participantsSnapshot] = await Promise.all([
      transaction.get(refs.group(groupId)),
      transaction.get(paymentRef),
      transaction.get(outingRef),
      transaction.get(refs.participants(groupId, input.outingId))
    ]);
    const group = groupSnapshot.data(); const payment = paymentSnapshot.data(); const outing = outingSnapshot.data();
    if (!group || !payment) throw new HttpsError('not-found', 'Pagamento non trovato.', { code: 'NOT_FOUND' });
    if (group.status !== 'active') throw new HttpsError('failed-precondition', 'Il gruppo è archiviato.', { code: 'GROUP_ARCHIVED' });
    if (payment.source !== 'automatic') throw new HttpsError('failed-precondition', 'Solo i calcoli automatici sono correggibili.', { code: 'NOT_AUTOMATIC' });
    if (uid !== payment.payerUserId && !hasInternalAdminClaim(request, membership)) throw new HttpsError('permission-denied', 'Solo pagante o amministratore possono correggere.', { code: 'FORBIDDEN' });
    if (getWeekId(new Date(), group.timezone) !== payment.weekId) throw new HttpsError('deadline-exceeded', 'La settimana è chiusa.', { code: 'CORRECTION_WINDOW_CLOSED' });
    const summaryRef = refs.summary(groupId, payment.weekId); const summarySnapshot = await transaction.get(summaryRef); const delta = input.amountCents - payment.amountCents; const memberStats = summarySnapshot.data()?.memberStats ?? {}; const summaryParticipants = Object.entries(memberStats).filter(([, value]: any) => value.participationCount > 0).map(([userId, value]: any) => ({ userId, displayName: value.displayNameSnapshot })); const aggregate = recalculateSummary(summarySnapshot.data(), summaryParticipants, payment.payerUserId, payment.payerDisplayNameSnapshot, delta, 0); const now = Timestamp.now();
    const eligibleIds = Array.isArray(payment.eligibleParticipantUserIdsAtDraw) ? new Set<string>(payment.eligibleParticipantUserIdsAtDraw) : null;
    const analyticsParticipants = participantsSnapshot.docs.map((item) => { const value = item.data(); return { userId: item.id, displayName: value.displayNameSnapshot, eligible: eligibleIds ? eligibleIds.has(item.id) : typeof value.weightMicrosAtDraw === 'number' ? value.weightMicrosAtDraw > 0 : null }; });
    await applyPaymentToAdminAnalytics(transaction, { groupId, weekId: payment.weekId, outingId: input.outingId, payerUserId: payment.payerUserId, payerDisplayName: payment.payerDisplayNameSnapshot, amountCents: input.amountCents, drawnAt: outing?.drawnAt?.toDate?.() ?? payment.createdAt?.toDate?.() ?? now.toDate(), participants: analyticsParticipants });
    transaction.update(paymentRef, { amountCents: input.amountCents, correctedAt: now }); transaction.set(paymentRef.collection('corrections').doc(input.requestId), { previousAmountCents: payment.amountCents, newAmountCents: input.amountCents, reason: input.reason, correctedBy: uid, requestId: input.requestId, createdAt: now }); transaction.set(summaryRef, { ...aggregate, updatedAt: now }, { merge: true });
    return { paymentId: input.outingId, previousAmountCents: payment.amountCents, amountCents: input.amountCents, corrected: true };
  });
});

export const cancelOuting = onCall(options, async (request) => {
  const uid = requireUid(request); const input = z.object({ requestId: requestIdSchema, outingId: z.string(), reason: correctionReasonSchema }).parse(request.data); const groupId = internalWorkspaceId; await requireInternalMember(uid);
  return db.runTransaction(async (transaction) => {
    const groupRef = refs.group(groupId); const outingRef = refs.outing(groupId, input.outingId); const [groupSnapshot, outingSnapshot] = await Promise.all([transaction.get(groupRef), transaction.get(outingRef)]); const group = groupSnapshot.data(); const outing = outingSnapshot.data(); if (!group || !outing) throw new HttpsError('not-found', 'Uscita non trovata.');
    if (!['open', 'drawn'].includes(outing.status) || (uid !== outing.createdBy && uid !== outing.payerUserId)) throw new HttpsError('permission-denied', 'Non puoi annullare questa uscita.', { code: 'FORBIDDEN' });
    const now = Timestamp.now(); const revision = nextRevision(outing.revision); const stateRevision = nextRevision(group.stateRevision); transaction.update(outingRef, { status: 'cancelled', revision, cancelledAt: now, cancelledBy: uid, cancelReason: input.reason }); transaction.update(groupRef, { openOutingId: null, stateRevision, updatedAt: now }); return { outingId: input.outingId, status: 'cancelled', revision, stateRevision };
  });
});
