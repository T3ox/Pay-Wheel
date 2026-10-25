import { buildAdminWeeklyAnalytics, type AdminAnalyticsEvent } from '@pay-wheel/domain';
import { Timestamp } from 'firebase-admin/firestore';
import { db, internalWorkspaceId } from '../platform/firebase.js';
import { analyticsToDocument } from '../repositories/admin-analytics.js';
import { refs } from '../repositories/firestore.js';

async function rebuildAdminAnalytics() {
  const payments = await db.collection(`groups/${internalWorkspaceId}/payments`).get();
  const eventsByWeek = new Map<string, AdminAnalyticsEvent[]>();

  for (const paymentDocument of payments.docs) {
    const payment = paymentDocument.data();
    const outingId = String(payment.outingId ?? paymentDocument.id);
    const [outingSnapshot, participantsSnapshot] = await Promise.all([
      refs.outing(internalWorkspaceId, outingId).get(),
      refs.participants(internalWorkspaceId, outingId).get()
    ]);
    const outing = outingSnapshot.data();
    const fairnessEntries = Array.isArray(outing?.fairnessSnapshot?.entries) ? outing.fairnessSnapshot.entries as Array<Record<string, unknown>> : [];
    const fairnessByUser = new Map(fairnessEntries.map((entry) => [String(entry.userId), entry]));
    const storedEligibleIds = Array.isArray(payment.eligibleParticipantUserIdsAtDraw) ? new Set<string>(payment.eligibleParticipantUserIdsAtDraw) : null;
    const participants = participantsSnapshot.docs.map((participantDocument) => {
      const participant = participantDocument.data();
      const fairness = fairnessByUser.get(participantDocument.id);
      const eligible = storedEligibleIds
        ? storedEligibleIds.has(participantDocument.id)
        : fairness && typeof fairness.weightMicros === 'number'
          ? fairness.weightMicros > 0
          : null;
      return {
        userId: participantDocument.id,
        displayName: String(participant.displayNameSnapshot ?? fairness?.displayName ?? 'Utente eliminato'),
        eligible
      };
    });
    const weekId = String(payment.weekId);
    const drawnAt = outing?.drawnAt?.toDate?.() ?? payment.createdAt?.toDate?.() ?? new Date(0);
    const event: AdminAnalyticsEvent = {
      outingId,
      weekId,
      payerUserId: String(payment.payerUserId),
      payerDisplayName: String(payment.payerDisplayNameSnapshot ?? 'Utente eliminato'),
      amountCents: Number(payment.amountCents),
      drawnAt: drawnAt.toISOString(),
      participants
    };
    eventsByWeek.set(weekId, [...(eventsByWeek.get(weekId) ?? []), event]);
  }

  for (const [weekId, events] of eventsByWeek) {
    const aggregateRef = refs.adminAnalytics(internalWorkspaceId, weekId);
    const existingEvents = await aggregateRef.collection('appliedOutings').get();
    for (let index = 0; index < existingEvents.docs.length; index += 400) {
      const batch = db.batch();
      for (const document of existingEvents.docs.slice(index, index + 400)) batch.delete(document.ref);
      await batch.commit();
    }

    const now = Timestamp.now();
    const aggregate = buildAdminWeeklyAnalytics(weekId, events);
    await aggregateRef.set({ ...analyticsToDocument(aggregate, now), rebuiltAt: now });
    for (let index = 0; index < events.length; index += 400) {
      const batch = db.batch();
      for (const event of events.slice(index, index + 400)) {
        batch.set(refs.appliedAdminOuting(internalWorkspaceId, weekId, event.outingId), {
          outingId: event.outingId,
          payerUserId: event.payerUserId,
          payerDisplayNameSnapshot: event.payerDisplayName,
          amountCents: event.amountCents,
          participantUserIds: event.participants.map((participant) => participant.userId),
          eligibleParticipantUserIds: event.participants.every((participant) => participant.eligible !== null)
            ? event.participants.filter((participant) => participant.eligible).map((participant) => participant.userId)
            : null,
          drawnAt: Timestamp.fromDate(new Date(event.drawnAt)),
          appliedAt: now,
          updatedAt: now
        });
      }
      await batch.commit();
    }
  }

  console.info(`Rebuilt admin analytics for ${eventsByWeek.size} weeks from ${payments.size} payments.`);
}

rebuildAdminAnalytics().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
