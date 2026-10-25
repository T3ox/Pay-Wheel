import {
  buildAdminWeeklyAnalytics,
  createEmptyAdminWeeklyAnalytics,
  mergeAdminAnalytics,
  toAdminAnalyticsRows,
  type AdminAnalyticsEvent,
  type AdminAnalyticsRow
} from '@pay-wheel/domain';
import { callFunction } from '../../services/firebase/callable';
import type { SessionUser } from '../entry/session';
import type { Member, Payment } from '../groups/PayWheelProvider';

export type AdminAnalyticsPeriod = { period: 'week'; weekId: string } | { period: 'all' };

export interface AdminAnalyticsResponse {
  period: { kind: 'week' | 'all'; weekId: string | null };
  availableWeekIds: string[];
  completedOutingCount: number;
  totalSpentCents: number;
  personCount: number;
  incompleteSourceCount: number;
  rows: AdminAnalyticsRow[];
  generatedAt: string;
}

function localResponse(period: AdminAnalyticsPeriod, payments: Payment[], members: Member[]): AdminAnalyticsResponse {
  const memberNames = new Map(members.map((member) => [member.userId, member.displayName]));
  const events = payments.map<AdminAnalyticsEvent>((payment) => {
    const eligibleIds = Array.isArray(payment.eligibleParticipantUserIds) ? new Set(payment.eligibleParticipantUserIds) : null;
    return {
      outingId: payment.outingId,
      weekId: payment.weekId,
      payerUserId: payment.payerUserId,
      payerDisplayName: payment.payerDisplayName,
      amountCents: payment.amountCents,
      drawnAt: payment.createdAt,
      participants: payment.participantUserIds.map((userId) => ({
        userId,
        displayName: memberNames.get(userId) ?? (userId === payment.payerUserId ? payment.payerDisplayName : 'Utente eliminato'),
        eligible: eligibleIds ? eligibleIds.has(userId) : null
      }))
    };
  });
  const eventsByWeek = new Map<string, AdminAnalyticsEvent[]>();
  for (const event of events) eventsByWeek.set(event.weekId, [...(eventsByWeek.get(event.weekId) ?? []), event]);
  const aggregates = [...eventsByWeek].map(([weekId, weekEvents]) => buildAdminWeeklyAnalytics(weekId, weekEvents));
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

export async function loadAdminAnalytics(options: {
  period: AdminAnalyticsPeriod;
  user: SessionUser;
  payments: Payment[];
  members: Member[];
}) {
  if (options.user.demo) return localResponse(options.period, options.payments, options.members);
  return callFunction<AdminAnalyticsPeriod, AdminAnalyticsResponse>('getAdminAnalytics', options.period);
}
