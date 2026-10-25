import {
  applyAdminAnalyticsCorrection,
  applyAdminAnalyticsEvent,
  createEmptyAdminWeeklyAnalytics,
  mergeAdminAnalytics,
  toAdminAnalyticsRows,
  type AdminAnalyticsAggregate,
  type AdminAnalyticsEvent,
  type AdminAnalyticsParticipant
} from '@pay-wheel/domain';
import { Timestamp, type DocumentData, type Transaction } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';
import { db } from '../platform/firebase.js';
import { refs } from './firestore.js';

export interface ApplyAdminPaymentInput {
  groupId: string;
  weekId: string;
  outingId: string;
  payerUserId: string;
  payerDisplayName: string;
  amountCents: number;
  drawnAt: Date;
  participants: AdminAnalyticsParticipant[];
}

function timestampToIso(value: unknown): string | null {
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (typeof value === 'string') return value;
  return null;
}

export function analyticsFromDocument(weekId: string, data: DocumentData | undefined): AdminAnalyticsAggregate {
  if (!data) return createEmptyAdminWeeklyAnalytics(weekId);
  const aggregate = createEmptyAdminWeeklyAnalytics(weekId);
  aggregate.completedOutingCount = Number(data.completedOutingCount ?? 0);
  aggregate.totalSpentCents = Number(data.totalSpentCents ?? 0);
  aggregate.sourcePaymentCount = Number(data.sourcePaymentCount ?? aggregate.completedOutingCount);
  aggregate.incompleteSourceCount = Number(data.incompleteSourceCount ?? 0);
  aggregate.personStats = Object.fromEntries(Object.entries(data.personStats ?? {}).map(([userId, raw]) => {
    const stat = raw as DocumentData;
    return [userId, {
      userId,
      displayNameSnapshot: String(stat.displayNameSnapshot ?? 'Utente eliminato'),
      spentCents: Number(stat.spentCents ?? 0),
      drawCount: Number(stat.drawCount ?? 0),
      eligibleParticipationCount: stat.eligibleParticipationCount === null ? null : Number(stat.eligibleParticipationCount ?? 0),
      totalParticipationCount: Number(stat.totalParticipationCount ?? 0),
      lastDrawnAt: timestampToIso(stat.lastDrawnAt)
    }];
  }));
  return aggregate;
}

export function analyticsToDocument(aggregate: AdminAnalyticsAggregate, updatedAt: Timestamp) {
  return {
    weekId: aggregate.weekId,
    currency: aggregate.currency,
    aggregateVersion: aggregate.aggregateVersion,
    completedOutingCount: aggregate.completedOutingCount,
    totalSpentCents: aggregate.totalSpentCents,
    sourcePaymentCount: aggregate.sourcePaymentCount,
    incompleteSourceCount: aggregate.incompleteSourceCount,
    personStats: Object.fromEntries(Object.entries(aggregate.personStats).map(([userId, stat]) => [userId, {
      ...stat,
      lastDrawnAt: stat.lastDrawnAt ? Timestamp.fromDate(new Date(stat.lastDrawnAt)) : null
    }])),
    updatedAt
  };
}

export async function applyPaymentToAdminAnalytics(transaction: Transaction, input: ApplyAdminPaymentInput) {
  const aggregateRef = refs.adminAnalytics(input.groupId, input.weekId);
  const eventRef = refs.appliedAdminOuting(input.groupId, input.weekId, input.outingId);
  const [aggregateSnapshot, eventSnapshot] = await Promise.all([
    transaction.get(aggregateRef),
    transaction.get(eventRef)
  ]);
  const now = Timestamp.now();
  const current = analyticsFromDocument(input.weekId, aggregateSnapshot.data());

  if (eventSnapshot.exists) {
    const applied = eventSnapshot.data()!;
    if (applied.payerUserId !== input.payerUserId) {
      throw new HttpsError('failed-precondition', 'Il riepilogo amministrativo non è coerente.', { code: 'ANALYTICS_EVENT_MISMATCH' });
    }
    const previousAmount = Number(applied.amountCents ?? 0);
    if (previousAmount === input.amountCents) return { applied: false, aggregate: current };
    const corrected = applyAdminAnalyticsCorrection(current, input.payerUserId, input.amountCents - previousAmount);
    transaction.set(aggregateRef, analyticsToDocument(corrected, now), { merge: true });
    transaction.update(eventRef, { amountCents: input.amountCents, updatedAt: now });
    return { applied: true, aggregate: corrected };
  }

  const event: AdminAnalyticsEvent = {
    outingId: input.outingId,
    weekId: input.weekId,
    payerUserId: input.payerUserId,
    payerDisplayName: input.payerDisplayName,
    amountCents: input.amountCents,
    drawnAt: input.drawnAt.toISOString(),
    participants: input.participants
  };
  const aggregate = applyAdminAnalyticsEvent(current, event);
  transaction.set(aggregateRef, analyticsToDocument(aggregate, now), { merge: true });
  transaction.set(eventRef, {
    outingId: input.outingId,
    payerUserId: input.payerUserId,
    payerDisplayNameSnapshot: input.payerDisplayName,
    amountCents: input.amountCents,
    participantUserIds: input.participants.map((participant) => participant.userId),
    eligibleParticipantUserIds: input.participants.every((participant) => participant.eligible !== null)
      ? input.participants.filter((participant) => participant.eligible).map((participant) => participant.userId)
      : null,
    drawnAt: Timestamp.fromDate(input.drawnAt),
    appliedAt: now,
    updatedAt: now
  });
  return { applied: true, aggregate };
}

export async function readAdminAnalytics(groupId: string, period: { period: 'week'; weekId: string } | { period: 'all' }) {
  const collection = await db.collection(`groups/${groupId}/adminAnalytics`).get();
  const aggregates = collection.docs.map((document) => analyticsFromDocument(document.id, document.data()));
  const availableWeekIds = aggregates.map((aggregate) => aggregate.weekId).filter((weekId): weekId is string => Boolean(weekId)).sort().reverse();
  const selected = period.period === 'all'
    ? mergeAdminAnalytics(aggregates)
    : aggregates.find((aggregate) => aggregate.weekId === period.weekId) ?? createEmptyAdminWeeklyAnalytics(period.weekId);
  const rows = toAdminAnalyticsRows(selected);
  return {
    period: { kind: period.period, weekId: period.period === 'week' ? period.weekId : null },
    availableWeekIds,
    completedOutingCount: selected.completedOutingCount,
    totalSpentCents: selected.totalSpentCents,
    personCount: rows.length,
    incompleteSourceCount: selected.incompleteSourceCount,
    rows,
    generatedAt: new Date().toISOString()
  };
}
