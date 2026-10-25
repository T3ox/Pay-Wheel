import { useState } from 'react';
import { Button } from '../../components/core/Button';
import { useSession } from '../entry/SessionProvider';
import { usePayWheel } from '../groups/PayWheelProvider';
import { PaymentDialog } from '../payments/PaymentDialog';
import { getParticipantColor } from './wheelPalette';

export function DrawResult() {
  const { user } = useSession();
  const { outing, autoSettleTest } = usePayWheel();
  const [paymentOpen, setPaymentOpen] = useState(false);
  if (!outing?.payerUserId) return null;
  const isPayer = user?.uid === outing.payerUserId;
  const resultColor = getParticipantColor(outing.preview?.entries ?? outing.participants, outing.payerUserId);

  return <main className="result-stage" data-payer-id={outing.payerUserId} style={{ '--result-color': resultColor } as React.CSSProperties} aria-live="polite">
    <div className="result-copy">
      <span>Paga</span>
      <h1>{outing.payerDisplayName}</h1>
    </div>
    {isPayer && <div className="primary-action-slot"><Button onClick={() => setPaymentOpen(true)}>Inserisci totale</Button></div>}
    {user?.demo && <details className="test-tools"><summary>Test</summary><button type="button" onClick={() => void autoSettleTest()}>Simula scadenza</button></details>}
    <PaymentDialog open={paymentOpen} onClose={() => setPaymentOpen(false)} />
  </main>;
}
