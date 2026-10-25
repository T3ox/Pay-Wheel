import { useState } from 'react';
import { Banner } from '../../components/core/Banner';
import { useAuth } from '../auth/AuthProvider';
import { AverageCard } from './components/AverageCard';
import { LeaderboardRow } from './components/LeaderboardRow';
import { useWeeklySummary } from './useWeeklySummary';

export function LeaderboardPage() {
  const { user } = useAuth();
  const [requestedWeek, setRequestedWeek] = useState('');
  const summary = useWeeklySummary(requestedWeek, Boolean(user?.demo));
  const historical = summary.weekId !== summary.currentWeekId;

  return <main className="content-page">
    <div className="page-heading"><p className="eyebrow">{historical ? 'SETTIMANA ARCHIVIATA' : 'SETTIMANA CORRENTE'}</p><h1>Classifica</h1><p>La media include chi ha partecipato almeno una volta nella settimana selezionata.</p></div>
    {summary.error && <Banner tone="error">{summary.error}</Banner>}
    <label className="week-selector">Settimana<select value={summary.weekId} disabled={summary.loading} onChange={(event) => setRequestedWeek(event.target.value)}>{summary.weekIds.map((week) => <option key={week} value={week}>{new Date(`${week}T12:00:00`).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}</option>)}</select></label>
    <AverageCard averageCents={summary.averageCents} historical={historical}/>
    <section className="card leaderboard-card" aria-busy={summary.loading}><ol className="leaderboard-list">{summary.rows.map((row, index) => <LeaderboardRow key={row.userId} row={row} index={index} averageCents={summary.averageCents} protectedThisWeek={!historical && row.lastPaidWeekId === summary.weekId}/>)}</ol>{!summary.loading && summary.rows.every((row) => !row.participated) && <p className="empty-copy">Nessuna uscita conclusa per questa settimana.</p>}{summary.loading && <p className="empty-copy">Aggiorno la classifica…</p>}</section>
  </main>;
}
