import { useRegisterSW } from 'virtual:pwa-register/react';
import { Button } from '../../components/core/Button';
import { usePayWheel } from '../groups/PayWheelProvider';

export function UpdatePrompt() {
  const { busy } = usePayWheel();
  const { needRefresh: [needRefresh, setNeedRefresh], updateServiceWorker } = useRegisterSW();
  if (!needRefresh) return null;
  return <aside className="update-card" role="status"><span>{busy ? 'Aggiornamento pronto: attendo la fine dell’operazione.' : 'È disponibile una nuova versione.'}</span><Button variant="secondary" disabled={busy} onClick={() => void updateServiceWorker(true)}>Aggiorna ora</Button><button className="text-button" onClick={() => setNeedRefresh(false)}>Più tardi</button></aside>;
}
