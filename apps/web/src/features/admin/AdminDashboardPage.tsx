import { formatEuro, getWeekId, type AdminAnalyticsRow } from '@pay-wheel/domain';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Banner } from '../../components/core/Banner';
import { Button } from '../../components/core/Button';
import { AppError } from '../../services/firebase/callable';
import { useSession } from '../entry/SessionProvider';
import { usePayWheel } from '../groups/PayWheelProvider';
import { loadAdminAnalytics, type AdminAnalyticsResponse } from './adminAnalytics';

type SortKey = 'name' | 'spent' | 'rate';
type SortDirection = 'asc' | 'desc';

function formatRate(bps: number | null) {
  if (bps === null) return 'Non disponibile';
  return `${(bps / 100).toLocaleString('it-IT', { maximumFractionDigits: 2 })}%`;
}

function ariaSort(key: SortKey, active: SortKey, direction: SortDirection) {
  if (key !== active) return 'none' as const;
  return direction === 'asc' ? 'ascending' as const : 'descending' as const;
}

export function AdminDashboardPage() {
  const { user } = useSession();
  const { group, payments, members } = usePayWheel();
  const navigate = useNavigate();
  const currentWeekId = getWeekId(new Date(), group?.timezone ?? 'Europe/Rome');
  const [periodValue, setPeriodValue] = useState(currentWeekId);
  const [data, setData] = useState<AdminAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadToken, setReloadToken] = useState(0);
  const [sortKey, setSortKey] = useState<SortKey>('spent');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  useEffect(() => {
    if (!user) return;
    let active = true;
    const period = periodValue === 'all' ? { period: 'all' as const } : { period: 'week' as const, weekId: periodValue };
    queueMicrotask(() => {
      if (!active) return;
      setLoading(true);
      setError('');
      setData(null);
      void (async () => {
        try {
          const next = await loadAdminAnalytics({ period, user, payments, members });
          if (active) setData(next);
        } catch (cause) {
          if (!active) return;
          const code = cause instanceof AppError ? cause.code : typeof cause === 'object' && cause && 'code' in cause ? String(cause.code) : '';
          if (['ADMIN_REQUIRED', 'PERMISSION_DENIED', 'NOT_GROUP_MEMBER', 'INTERNAL_ACCESS_DENIED'].includes(code)) {
            setData(null);
            navigate('/', { replace: true });
            return;
          }
          setError(cause instanceof Error ? cause.message : 'Dashboard temporaneamente non disponibile.');
        } finally {
          if (active) setLoading(false);
        }
      })();
    });
    return () => { active = false; };
  }, [members, navigate, payments, periodValue, reloadToken, user]);

  const weekIds = useMemo(() => [...new Set([currentWeekId, ...(data?.availableWeekIds ?? [])])].sort().reverse(), [currentWeekId, data?.availableWeekIds]);
  const rows = useMemo(() => {
    const sorted = [...(data?.rows ?? [])];
    const direction = sortDirection === 'asc' ? 1 : -1;
    sorted.sort((first, second) => {
      if (sortKey === 'name') return direction * first.displayName.localeCompare(second.displayName, 'it');
      const firstValue = sortKey === 'spent' ? first.spentCents : first.selectionRateBps;
      const secondValue = sortKey === 'spent' ? second.spentCents : second.selectionRateBps;
      if (firstValue === null && secondValue === null) return first.displayName.localeCompare(second.displayName, 'it');
      if (firstValue === null) return 1;
      if (secondValue === null) return -1;
      return direction * (firstValue - secondValue) || first.displayName.localeCompare(second.displayName, 'it');
    });
    return sorted;
  }, [data?.rows, sortDirection, sortKey]);

  function changeSort(nextKey: SortKey) {
    if (sortKey === nextKey) setSortDirection((current) => current === 'asc' ? 'desc' : 'asc');
    else {
      setSortKey(nextKey);
      setSortDirection(nextKey === 'name' ? 'asc' : 'desc');
    }
  }

  function sortLabel(label: string, key: SortKey) {
    const suffix = sortKey === key ? (sortDirection === 'asc' ? ' crescente' : ' decrescente') : '';
    return `${label}${suffix}`;
  }

  return <main className="content-page admin-dashboard">
    <div className="page-heading">
      <p className="eyebrow">AREA PRIVATA</p>
      <h1>Dashboard admin</h1>
      <p>Spese e frequenze di estrazione del workspace interno.</p>
    </div>

    <label className="week-selector">Periodo
      <select value={periodValue} disabled={loading} onChange={(event) => setPeriodValue(event.target.value)}>
        <option value="all">Tutto lo storico</option>
        {weekIds.map((weekId) => <option key={weekId} value={weekId}>{new Date(`${weekId}T12:00:00`).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}</option>)}
      </select>
    </label>

    {error && <Banner tone="error"><span>{error}</span><Button variant="ghost" onClick={() => setReloadToken((value) => value + 1)}>Riprova</Button></Banner>}
    {data && data.incompleteSourceCount > 0 && <Banner tone="warning">Alcune uscite storiche non contengono l’eleggibilità completa: i totali restano validi, mentre alcune percentuali non sono disponibili.</Banner>}

    <section className="admin-summary" aria-label="Riepilogo del periodo" aria-busy={loading}>
      <div><span>Totale speso</span><strong>{formatEuro(data?.totalSpentCents ?? 0)}</strong></div>
      <div><span>Uscite concluse</span><strong>{data?.completedOutingCount ?? 0}</strong></div>
      <div><span>Persone incluse</span><strong>{data?.personCount ?? 0}</strong></div>
    </section>

    {loading && <p className="empty-copy" role="status">Aggiorno la dashboard…</p>}
    {!loading && data && rows.length === 0 && <p className="empty-copy">Nessuna uscita conclusa nel periodo selezionato.</p>}
    {!loading && rows.length > 0 && <div className="admin-table-wrap">
      <table className="admin-table">
        <caption className="sr-only">Spese e percentuali per persona</caption>
        <thead><tr>
          <th scope="col" aria-sort={ariaSort('name', sortKey, sortDirection)}><button type="button" onClick={() => changeSort('name')}>{sortLabel('Persona', 'name')}</button></th>
          <th scope="col" aria-sort={ariaSort('spent', sortKey, sortDirection)}><button type="button" onClick={() => changeSort('spent')}>{sortLabel('Speso', 'spent')}</button></th>
          <th scope="col">Estratta</th>
          <th scope="col">Partecipazioni eleggibili</th>
          <th scope="col" aria-sort={ariaSort('rate', sortKey, sortDirection)}><button type="button" onClick={() => changeSort('rate')}>{sortLabel('Tasso personale', 'rate')}</button></th>
          <th scope="col">Quota uscite</th>
        </tr></thead>
        <tbody>{rows.map((row: AdminAnalyticsRow) => <tr key={row.userId}>
          <th scope="row" data-label="Persona">{row.displayName}</th>
          <td data-label="Speso">{formatEuro(row.spentCents)}</td>
          <td data-label="Estratta">{row.drawCount}</td>
          <td data-label="Partecipazioni eleggibili">{row.eligibleParticipationCount ?? 'Non disponibile'}</td>
          <td data-label="Tasso personale">{formatRate(row.selectionRateBps)}</td>
          <td data-label="Quota uscite">{formatRate(row.outingShareBps)}</td>
        </tr>)}</tbody>
      </table>
    </div>}
  </main>;
}
