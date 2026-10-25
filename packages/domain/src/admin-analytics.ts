import { z } from 'zod';

export interface AdminAnalyticsParticipant {
  userId: string;
  displayName: string;
  eligible: boolean | null;
}

export interface AdminAnalyticsEvent {
  outingId: string;
  weekId: string;
  payerUserId: string;
  payerDisplayName: string;
  amountCents: number;
  drawnAt: string;
  participants: AdminAnalyticsParticipant[];
}

export interface PersonAdminStat {
  userId: string;
  displayNameSnapshot: string;
  spentCents: number;
  drawCount: number;
  eligibleParticipationCount: number | null;
  totalParticipationCount: number;
  lastDrawnAt: string | null;
}

export interface AdminAnalyticsAggregate {
  weekId: string | null;
  currency: 'EUR';
  aggregateVersion: 1;
  completedOutingCount: number;
  totalSpentCents: number;
  sourcePaymentCount: number;
  incompleteSourceCount: number;
  personStats: Record<string, PersonAdminStat>;
}

export interface AdminAnalyticsRow {
  userId: string;
  displayName: string;
  spentCents: number;
  drawCount: number;
  eligibleParticipationCount: number | null;
  totalParticipationCount: number;
  selectionRateBps: number | null;
  outingShareBps: number | null;
  lastDrawnAt: string | null;
}

export const adminAnalyticsPeriodSchema = z.discriminatedUnion('period', [
  z.object({ period: z.literal('week'), weekId: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }),
  z.object({ period: z.literal('all') })
]);

export function createEmptyAdminWeeklyAnalytics(weekId: string | null): AdminAnalyticsAggregate {
  return {
    weekId,
    currency: 'EUR',
    aggregateVersion: 1,
    completedOutingCount: 0,
    totalSpentCents: 0,
    sourcePaymentCount: 0,
    incompleteSourceCount: 0,
    personStats: {}
  };
}

function cloneAggregate(value: AdminAnalyticsAggregate): AdminAnalyticsAggregate {
  return {
    ...value,
    personStats: Object.fromEntries(Object.entries(value.personStats).map(([userId, stat]) => [userId, { ...stat }]))
  };
}

function defaultStat(userId: string, displayName: string): PersonAdminStat {
  return {
    userId,
    displayNameSnapshot: displayName,
    spentCents: 0,
    drawCount: 0,
    eligibleParticipationCount: 0,
    totalParticipationCount: 0,
    lastDrawnAt: null
  };
}

export function applyAdminAnalyticsEvent(current: AdminAnalyticsAggregate, event: AdminAnalyticsEvent): AdminAnalyticsAggregate {
  if (!Number.isInteger(event.amountCents) || event.amountCents < 0) throw new Error('Admin analytics amount must be a non-negative integer.');
  const next = cloneAggregate(current);
  const participants = new Map(event.participants.map((participant) => [participant.userId, participant]));
  const incomplete = [...participants.values()].some((participant) => participant.eligible === null);

  next.completedOutingCount += 1;
  next.sourcePaymentCount += 1;
  next.totalSpentCents += event.amountCents;
  if (incomplete) next.incompleteSourceCount += 1;

  for (const participant of participants.values()) {
    const stat = next.personStats[participant.userId] ?? defaultStat(participant.userId, participant.displayName);
    next.personStats[participant.userId] = {
      ...stat,
      displayNameSnapshot: participant.displayName,
      totalParticipationCount: stat.totalParticipationCount + 1,
      eligibleParticipationCount: participant.eligible === null || stat.eligibleParticipationCount === null
        ? null
        : stat.eligibleParticipationCount + (participant.eligible ? 1 : 0)
    };
  }

  const payer = next.personStats[event.payerUserId] ?? defaultStat(event.payerUserId, event.payerDisplayName);
  next.personStats[event.payerUserId] = {
    ...payer,
    displayNameSnapshot: event.payerDisplayName,
    spentCents: payer.spentCents + event.amountCents,
    drawCount: payer.drawCount + 1,
    lastDrawnAt: !payer.lastDrawnAt || payer.lastDrawnAt < event.drawnAt ? event.drawnAt : payer.lastDrawnAt
  };
  return next;
}

export function applyAdminAnalyticsCorrection(current: AdminAnalyticsAggregate, payerUserId: string, amountDelta: number): AdminAnalyticsAggregate {
  if (!Number.isInteger(amountDelta)) throw new Error('Admin analytics correction must be an integer.');
  const payer = current.personStats[payerUserId];
  if (!payer) throw new Error('Admin analytics payer is missing.');
  if (current.totalSpentCents + amountDelta < 0 || payer.spentCents + amountDelta < 0) throw new Error('Admin analytics correction would produce a negative total.');
  const next = cloneAggregate(current);
  next.totalSpentCents += amountDelta;
  next.personStats[payerUserId] = { ...payer, spentCents: payer.spentCents + amountDelta };
  return next;
}

export function buildAdminWeeklyAnalytics(weekId: string, events: readonly AdminAnalyticsEvent[]): AdminAnalyticsAggregate {
  const latestByOuting = new Map<string, AdminAnalyticsEvent>();
  for (const event of events) latestByOuting.set(event.outingId, event);
  return [...latestByOuting.values()].reduce(
    (aggregate, event) => applyAdminAnalyticsEvent(aggregate, event),
    createEmptyAdminWeeklyAnalytics(weekId)
  );
}

export function mergeAdminAnalytics(aggregates: readonly AdminAnalyticsAggregate[]): AdminAnalyticsAggregate {
  const merged = createEmptyAdminWeeklyAnalytics(null);
  for (const aggregate of aggregates) {
    merged.completedOutingCount += aggregate.completedOutingCount;
    merged.totalSpentCents += aggregate.totalSpentCents;
    merged.sourcePaymentCount += aggregate.sourcePaymentCount;
    merged.incompleteSourceCount += aggregate.incompleteSourceCount;
    for (const [userId, incoming] of Object.entries(aggregate.personStats)) {
      const existing = merged.personStats[userId];
      if (!existing) {
        merged.personStats[userId] = { ...incoming };
        continue;
      }
      const incomingIsNewer = Boolean(incoming.lastDrawnAt && (!existing.lastDrawnAt || incoming.lastDrawnAt > existing.lastDrawnAt));
      merged.personStats[userId] = {
        ...existing,
        displayNameSnapshot: incomingIsNewer ? incoming.displayNameSnapshot : existing.displayNameSnapshot,
        spentCents: existing.spentCents + incoming.spentCents,
        drawCount: existing.drawCount + incoming.drawCount,
        eligibleParticipationCount: existing.eligibleParticipationCount === null || incoming.eligibleParticipationCount === null
          ? null
          : existing.eligibleParticipationCount + incoming.eligibleParticipationCount,
        totalParticipationCount: existing.totalParticipationCount + incoming.totalParticipationCount,
        lastDrawnAt: incomingIsNewer ? incoming.lastDrawnAt : existing.lastDrawnAt
      };
    }
  }
  return merged;
}

function rateBps(numerator: number, denominator: number | null): number | null {
  if (!denominator) return null;
  return Math.round(numerator * 10_000 / denominator);
}

export function toAdminAnalyticsRows(aggregate: AdminAnalyticsAggregate): AdminAnalyticsRow[] {
  return Object.values(aggregate.personStats)
    .map((stat) => ({
      userId: stat.userId,
      displayName: stat.displayNameSnapshot,
      spentCents: stat.spentCents,
      drawCount: stat.drawCount,
      eligibleParticipationCount: stat.eligibleParticipationCount,
      totalParticipationCount: stat.totalParticipationCount,
      selectionRateBps: rateBps(stat.drawCount, stat.eligibleParticipationCount),
      outingShareBps: rateBps(stat.drawCount, aggregate.completedOutingCount),
      lastDrawnAt: stat.lastDrawnAt
    }))
    .sort((a, b) => b.spentCents - a.spentCents || a.displayName.localeCompare(b.displayName, 'it'));
}
