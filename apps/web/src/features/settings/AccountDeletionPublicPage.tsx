import { Link } from 'react-router-dom';

export function AccountDeletionPublicPage() {
  return <main className="public-page"><section className="card prose"><p className="eyebrow">PRIVACY</p><h1>Eliminazione account Pay Wheel</h1><p>Puoi richiedere l’eliminazione dalla pagina Profilo dopo aver effettuato l’accesso.</p><h2>Cosa eliminiamo</h2><ul><li>nome, email, avatar e sessioni di accesso;</li><li>membership non necessarie allo storico;</li><li>eventuali identificativi nei log operativi.</li></ul><h2>Cosa resta anonimizzato</h2><p>Gli importi aggregati necessari a preservare la classifica del gruppo possono restare senza collegamento al tuo account.</p><Link className="button button--primary" to="/settings/account">Vai alle impostazioni account</Link></section></main>;
}

