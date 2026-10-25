import { formatEuro, type FairnessEntry } from '@pay-wheel/domain';
import { Avatar } from '../../components/core/Avatar';
import { getParticipantColor } from './wheelPalette';

export function ParticipantList({ entries }: { entries: FairnessEntry[] }) {
  return <section className="participant-section" aria-labelledby="participants-title">
    <div className="section-heading"><div><p className="eyebrow">PROBABILITÀ LIVE</p><h2 id="participants-title">Chi è nell’uscita</h2></div><span className="count-chip">{entries.length}</span></div>
    <ul className="participant-list">
      {entries.map((entry) => <li key={entry.userId}>
        <span className="participant-color" style={{ backgroundColor: getParticipantColor(entries, entry.userId) }} aria-hidden="true" />
        <Avatar name={entry.displayName} size="sm" />
        <div className="participant-main"><strong>{entry.displayName}</strong><span>{entry.eligibility === 'protected' ? 'Protetto fino a lunedì' : entry.eligibility === 'override' ? 'Riammesso per questa uscita' : `${formatEuro(entry.spentCents)} questa settimana`}</span></div>
        <strong className={entry.probabilityMicros === 0 ? 'muted' : ''}>{(entry.probabilityMicros / 10_000).toLocaleString('it-IT', { maximumFractionDigits: 1 })}%</strong>
      </li>)}
    </ul>
  </section>;
}
