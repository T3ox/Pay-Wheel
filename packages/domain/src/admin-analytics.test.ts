import { describe, expect, it } from 'vitest';
import {
  applyAdminAnalyticsCorrection,
  applyAdminAnalyticsEvent,
  buildAdminWeeklyAnalytics,
  createEmptyAdminWeeklyAnalytics,
  mergeAdminAnalytics,
  toAdminAnalyticsRows,
  type AdminAnalyticsEvent
} from './admin-analytics';

const annaDraw: AdminAnalyticsEvent = {
  outingId: 'outing-1',
  weekId: '2026-10-19',
  payerUserId: 'anna',
  payerDisplayName: 'Anna',
  amountCents: 900,
  drawnAt: '2026-10-20T12:00:00.000Z',
  participants: [
    { userId: 'anna', displayName: 'Anna', eligible: true },
    { userId: 'bruno', displayName: 'Bruno', eligible: true },
    { userId: 'carla', displayName: 'Carla', eligible: false }
  ]
};

describe('admin analytics', () => {
  it('aggregates spending, draws, total participation and eligible participation', () => {
    const aggregate = applyAdminAnalyticsEvent(createEmptyAdminWeeklyAnalytics(annaDraw.weekId), annaDraw);

    expect(aggregate.completedOutingCount).toBe(1);
    expect(aggregate.totalSpentCents).toBe(900);
    expect(aggregate.personStats.anna).toMatchObject({ spentCents: 900, drawCount: 1, eligibleParticipationCount: 1, totalParticipationCount: 1 });
    expect(aggregate.personStats.bruno).toMatchObject({ spentCents: 0, drawCount: 0, eligibleParticipationCount: 1, totalParticipationCount: 1 });
    expect(aggregate.personStats.carla).toMatchObject({ spentCents: 0, drawCount: 0, eligibleParticipationCount: 0, totalParticipationCount: 1 });
  });

  it('uses null instead of inventing eligible counts for incomplete sources', () => {
    const incomplete = { ...annaDraw, participants: annaDraw.participants.map(({ userId, displayName }) => ({ userId, displayName, eligible: null })) };
    const aggregate = applyAdminAnalyticsEvent(createEmptyAdminWeeklyAnalytics(annaDraw.weekId), incomplete);
    const rows = toAdminAnalyticsRows(aggregate);

    expect(aggregate.incompleteSourceCount).toBe(1);
    expect(rows.find((row) => row.userId === 'anna')).toMatchObject({ eligibleParticipationCount: null, selectionRateBps: null, outingShareBps: 10_000 });
  });

  it('applies a correction delta without changing draw and participation counts', () => {
    const original = applyAdminAnalyticsEvent(createEmptyAdminWeeklyAnalytics(annaDraw.weekId), annaDraw);
    const corrected = applyAdminAnalyticsCorrection(original, 'anna', -250);

    expect(corrected.totalSpentCents).toBe(650);
    expect(corrected.personStats.anna).toMatchObject({ spentCents: 650, drawCount: 1, eligibleParticipationCount: 1, totalParticipationCount: 1 });
  });

  it('builds a week idempotently by keeping the last event for an outing', () => {
    const rebuilt = buildAdminWeeklyAnalytics(annaDraw.weekId, [annaDraw, annaDraw, { ...annaDraw, amountCents: 650 }]);

    expect(rebuilt.completedOutingCount).toBe(1);
    expect(rebuilt.sourcePaymentCount).toBe(1);
    expect(rebuilt.totalSpentCents).toBe(650);
  });

  it('merges weeks from integer counts and recalculates rates', () => {
    const first = buildAdminWeeklyAnalytics('2026-10-19', [annaDraw]);
    const secondEvent: AdminAnalyticsEvent = {
      ...annaDraw,
      outingId: 'outing-2',
      weekId: '2026-10-26',
      payerUserId: 'bruno',
      payerDisplayName: 'Bruno',
      amountCents: 600,
      drawnAt: '2026-10-27T12:00:00.000Z'
    };
    const merged = mergeAdminAnalytics([first, buildAdminWeeklyAnalytics('2026-10-26', [secondEvent])]);
    const anna = toAdminAnalyticsRows(merged).find((row) => row.userId === 'anna');

    expect(merged).toMatchObject({ completedOutingCount: 2, totalSpentCents: 1500 });
    expect(anna).toMatchObject({ drawCount: 1, eligibleParticipationCount: 2, selectionRateBps: 5000, outingShareBps: 5000 });
  });

  it('returns null percentages for a zero denominator', () => {
    const aggregate = applyAdminAnalyticsEvent(createEmptyAdminWeeklyAnalytics(annaDraw.weekId), {
      ...annaDraw,
      payerUserId: 'anna',
      participants: [{ userId: 'carla', displayName: 'Carla', eligible: false }]
    });
    const carla = toAdminAnalyticsRows(aggregate).find((row) => row.userId === 'carla');

    expect(carla).toMatchObject({ selectionRateBps: null, outingShareBps: 0 });
  });
});
