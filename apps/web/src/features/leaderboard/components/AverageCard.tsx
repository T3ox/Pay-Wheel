import { formatEuro } from '@pay-wheel/domain';

export function AverageCard({ averageCents, historical }: { averageCents: number; historical: boolean }) {
  return <section className="average-card" aria-label="Media settimanale"><span>Media del gruppo</span><strong>{formatEuro(averageCents)}</strong><small>{historical ? 'settimana conclusa' : 'dal lunedì a oggi'}</small></section>;
}
