import { useSession } from './SessionProvider';

export function EntryPage() {
  const { enter, entering, error, isTestMode } = useSession();
  return <main className="entry-page">
    <button className="entry-cta" type="button" disabled={entering} aria-busy={entering} onClick={() => void enter()}>
      {error ? 'Riprova' : isTestMode ? 'Aggiungimi' : 'Entra'}
    </button>
    {error && <p className="entry-error" role="alert">{error}</p>}
    <span className="sr-only" aria-live="polite">{entering ? 'Accesso in corso' : ''}</span>
  </main>;
}
