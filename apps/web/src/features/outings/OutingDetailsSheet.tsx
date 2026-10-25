import { Button } from '../../components/core/Button';
import { Dialog } from '../../components/core/Dialog';
import { useSession } from '../entry/SessionProvider';
import { usePayWheel } from '../groups/PayWheelProvider';
import { ParticipantList } from './ParticipantList';

export function OutingDetailsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user } = useSession();
  const { outing, seedTestColleagues } = usePayWheel();
  const entries = outing?.preview?.entries ?? [];
  return <Dialog open={open} onClose={onClose} title="Partecipanti">
    <ParticipantList entries={entries} />
    {user?.demo && (outing?.participants.length ?? 0) < 2 && <Button fullWidth variant="secondary" onClick={seedTestColleagues}>Aggiungi colleghi test</Button>}
  </Dialog>;
}
