import { formatEuro, parseEuroInput } from '@pay-wheel/domain';
import { useState } from 'react';
import { Banner } from '../../components/core/Banner';
import { Button } from '../../components/core/Button';
import { Dialog } from '../../components/core/Dialog';
import { callFunction, newRequestId } from '../../services/firebase/callable';
import { useAuth } from '../auth/AuthProvider';
import { usePayWheel } from '../groups/PayWheelProvider';

export function AccountSettingsPage() {
  const { user, signOut, reauthenticate } = useAuth();
  const { group, members, payments, correctPayment, busy } = usePayWheel();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [correction, setCorrection] = useState('');
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const autoPayment = [...payments].reverse().find((payment) => payment.source === 'automatic' && !payment.correctedAt);
  const isAdmin = members.find((member) => member.userId === user?.uid)?.access === 'admin';

  async function submitCorrection() {
    setError('');
    try {
      const cents = parseEuroInput(correction);
      if (cents === null) throw new Error('Inserisci un importo valido tra 0,01 € e 500 €.');
      await correctPayment(cents, reason);
      setMessage('Importo corretto e classifica aggiornata.');
      setCorrection(''); setReason('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Correzione non riuscita.');
    }
  }

  async function requestDeletion() {
    setDeleting(true); setError('');
    try {
      if (!user?.demo) {
        await reauthenticate();
        await callFunction('requestAccountDeletion', { requestId: newRequestId(), confirmation: 'DELETE' });
      }
      setDeleteOpen(false);
      setMessage(user?.demo ? 'In modalità demo non viene eliminato alcun account.' : 'Richiesta registrata. I dati saranno anonimizzati dopo 7 giorni.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Richiesta non riuscita.');
    } finally { setDeleting(false); }
  }

  return <main className="content-page">
    <div className="page-heading"><p className="eyebrow">PROFILO</p><h1>Ciao, {user?.displayName}</h1><p>Preferenze, account e sessione.</p></div>
    {message && <Banner tone="success">{message}</Banner>}
    {error && <Banner tone="error">{error}</Banner>}
    {group?.status === 'active' && autoPayment && (autoPayment.payerUserId === user?.uid || isAdmin) && <section className="card correction-card"><p className="eyebrow">DA VERIFICARE</p><h2>Pagamento automatico di {formatEuro(autoPayment.amountCents)}</h2><p>Puoi sostituirlo con il totale reale entro la fine della settimana.</p><label>Importo reale<input value={correction} onChange={(event) => setCorrection(event.target.value)} inputMode="decimal" placeholder="8,40"/></label><label>Motivo<input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Prezzo reale del bar"/></label><Button loading={busy} disabled={!correction || reason.trim().length < 3} onClick={() => void submitCorrection()}>Correggi importo</Button></section>}
    <section className="card settings-section"><div className="setting-row"><div><strong>Animazioni ridotte</strong><span>L’app rispetta la preferenza di accessibilità del dispositivo</span></div><span>Automatica</span></div><div className="setting-row"><div><strong>Sessione</strong><span>{user?.email ?? 'Modalità test locale'}</span></div><Button variant="secondary" onClick={() => void signOut()}>Esci</Button></div></section>
    <section className="card danger-zone"><h2>Elimina account</h2><p>Hai 7 giorni di attesa. I dati personali vengono rimossi; gli importi storici necessari al gruppo vengono anonimizzati.</p><Button variant="danger" onClick={() => setDeleteOpen(true)}>Richiedi eliminazione</Button></section>
    <Dialog open={deleteOpen} title="Eliminare l’account?" onClose={() => setDeleteOpen(false)}><p>Per sicurezza potrebbe essere richiesto un nuovo accesso Google. Lo storico condiviso verrà anonimizzato.</p><div className="dialog__actions"><Button variant="ghost" onClick={() => setDeleteOpen(false)}>Annulla</Button><Button variant="danger" loading={deleting} onClick={() => void requestDeletion()}>Conferma richiesta</Button></div></Dialog>
  </main>;
}
