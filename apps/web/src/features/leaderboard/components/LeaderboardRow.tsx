import { formatEuro } from '@pay-wheel/domain';
import { Avatar } from '../../../components/core/Avatar';
import type { LeaderboardRowData } from '../useWeeklySummary';

export function LeaderboardRow({ row, index, averageCents, protectedThisWeek }: { row: LeaderboardRowData; index: number; averageCents: number; protectedThisWeek: boolean }) {
  const delta = row.spent - averageCents;
  const trend = !row.participated ? 'Nessuna partecipazione' : protectedThisWeek ? 'Protetto fino a lunedì' : delta < 0 ? `${formatEuro(Math.abs(delta))} sotto la media` : delta > 0 ? `${formatEuro(delta)} sopra la media` : 'In linea con la media';
  return <li><span className="rank">{index + 1}</span><Avatar name={row.displayName} size="sm"/><div><strong>{row.displayName}</strong><span>{trend}</span></div><strong>{formatEuro(row.spent)}</strong></li>;
}
