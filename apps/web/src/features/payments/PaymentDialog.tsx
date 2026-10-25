import { useState } from 'react';
import { Button } from '../../components/core/Button';
import { Dialog } from '../../components/core/Dialog';
import { MoneyInput } from './MoneyInput';
import { usePayWheel } from '../groups/PayWheelProvider';

export function PaymentDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { confirmPayment, busy } = usePayWheel();
  const [value, setValue] = useState('');
  const [cents, setCents] = useState<number | null>(null);
  const [error, setError] = useState('');
  async function submit() {
    if (!cents) return;
    if (cents >= 10_000 && !confirm('L’importo supera €100. Confermi?')) return;
    try { await confirmPayment(cents); onClose(); setValue(''); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Pagamento non registrato.'); }
  }
  return <Dialog open={open} onClose={onClose} title="Totale">
    {error && <div className="banner banner--error" role="alert">{error}</div>}
    <MoneyInput value={value} onChange={(next, nextCents) => { setValue(next); setCents(nextCents); }} />
    <div className="dialog__actions"><Button variant="ghost" onClick={onClose}>Più tardi</Button><Button loading={busy} disabled={!cents} onClick={() => void submit()}>Registra totale</Button></div>
  </Dialog>;
}
