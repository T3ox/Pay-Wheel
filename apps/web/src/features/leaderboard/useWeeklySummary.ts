import { getWeekId } from '@pay-wheel/domain';
import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';
import { db } from '../../services/firebase/client';
import type { Member } from '../groups/PayWheelProvider';
import { usePayWheel } from '../groups/PayWheelProvider';

interface StoredStat { displayNameSnapshot: string; spentCents: number; participationCount: number; }
interface StoredSummary { averageCents: number; memberStats: Record<string, StoredStat>; }
export interface LeaderboardRowData extends Member { spent: number; participated: boolean; }

export function useWeeklySummary(requestedWeek: string, demo: boolean) {
  const { group, members, payments } = usePayWheel();
  const currentWeekId = getWeekId(new Date(), group?.timezone ?? 'Europe/Rome');
  const [remote, setRemote] = useState<Record<string, StoredSummary>>({});
  const [loadedGroupId, setLoadedGroupId] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!db || !group || demo) return;
    return onSnapshot(query(collection(db, 'groups', group.groupId, 'weeklySummaries'), orderBy('weekId', 'desc'), limit(12)), (snapshot) => {
      setRemote(Object.fromEntries(snapshot.docs.map((item) => [item.id, { averageCents: item.data().averageCents ?? 0, memberStats: item.data().memberStats ?? {} }])));
      setLoadedGroupId(group.groupId); setError('');
    }, () => { setLoadedGroupId(group.groupId); setError('Classifica non disponibile. Riprova tra poco.'); });
  }, [demo, group]);

  const loading = Boolean(db && group && !demo && loadedGroupId !== group.groupId && !error);

  return useMemo(() => {
    const weekIds = [currentWeekId, ...new Set([...Object.keys(remote), ...payments.map((payment) => payment.weekId)].filter((week) => week !== currentWeekId))].sort().reverse();
    const weekId = weekIds.includes(requestedWeek) ? requestedWeek : currentWeekId;
    const stored = remote[weekId];
    const memberMap = new Map(members.map((member) => [member.userId, member]));
    const ids = stored ? new Set([...memberMap.keys(), ...Object.keys(stored.memberStats)]) : new Set(memberMap.keys());
    const rows: LeaderboardRowData[] = [...ids].map((userId) => {
      const member = memberMap.get(userId);
      const stat = stored?.memberStats[userId];
      const spent = stat?.spentCents ?? payments.filter((payment) => payment.weekId === weekId && payment.payerUserId === userId).reduce((sum, payment) => sum + payment.amountCents, 0);
      const participated = stat ? stat.participationCount > 0 : payments.some((payment) => payment.weekId === weekId && payment.participantUserIds.includes(userId));
      return { userId, displayName: member?.displayName ?? stat?.displayNameSnapshot ?? 'Utente eliminato', photoUrl: member?.photoUrl ?? null, role: member?.role ?? 'member', access: member?.access ?? 'member', status: member?.status ?? 'anonymized', joinedAt: member?.joinedAt ?? new Date(0).toISOString(), lastPaidWeekId: member?.lastPaidWeekId ?? null, lastPaidAt: member?.lastPaidAt ?? null, spent, participated };
    }).filter((row) => row.status === 'active' || row.participated);
    const participants = rows.filter((row) => row.participated);
    const averageCents = stored?.averageCents ?? (participants.length ? Math.round(participants.reduce((sum, row) => sum + row.spent, 0) / participants.length) : 0);
    rows.sort((a, b) => b.spent - a.spent || a.displayName.localeCompare(b.displayName));
    return { currentWeekId, weekId, weekIds, rows, averageCents, loading, error };
  }, [currentWeekId, error, loading, members, payments, remote, requestedWeek]);
}
