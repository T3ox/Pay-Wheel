import { formatEuro } from '@pay-wheel/domain';
import { useMemo, useState } from 'react';
import { Button } from '../../components/core/Button';
import { usePayWheel } from '../groups/PayWheelProvider';

const PAGE_SIZE = 20;

export function HistoryPage() {
  const { payments } = usePayWheel();
  const [visible, setVisible] = useState(PAGE_SIZE);
  const ordered = useMemo(() => [...payments].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)), [payments]);
  return <main className="content-page">
    <div className="page-heading"><p className="eyebrow">ARCHIVIO</p><h1>Storico uscite</h1><p>I risultati conclusi restano consultabili e non modificano le estrazioni passate.</p></div>
    <section className="card"><ul className="history-list">{ordered.slice(0, visible).map((payment) => <li key={payment.outingId}><div><strong>{payment.payerDisplayName}</strong><span>{new Date(payment.createdAt).toLocaleDateString('it-IT', { dateStyle: 'medium' })} · {payment.source === 'automatic' ? 'Calcolo automatico' : 'Confermato'}{payment.correctedAt ? ' · corretto' : ''}</span></div><strong>{formatEuro(payment.amountCents)}</strong></li>)}</ul>{payments.length === 0 && <p className="empty-copy">Le uscite concluse compariranno qui.</p>}{visible < ordered.length && <div className="load-more"><Button variant="secondary" onClick={() => setVisible((count) => count + PAGE_SIZE)}>Mostra altre uscite</Button></div>}</section>
  </main>;
}
