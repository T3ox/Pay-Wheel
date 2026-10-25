import { useEffect, useRef, useState } from 'react';
import { Button } from '../../components/core/Button';
import { useNetworkStatus } from '../../services/network/useNetworkStatus';
import { useSession } from '../entry/SessionProvider';
import { usePayWheel } from '../groups/PayWheelProvider';
import { DrawResult } from './DrawResult';
import { OutingDetailsSheet } from './OutingDetailsSheet';
import { Wheel } from './Wheel';
import { createSpinMotion, SPIN_DURATION_MS, SPIN_TURNS } from './wheelMotion';
import { canMutateSharedWheel } from './outingState';

export type PrimaryAction = 'join' | 'leave' | 'spin';

export function getPrimaryAction({ hasOuting, joined, ready }: { hasOuting: boolean; joined: boolean; ready: boolean }): PrimaryAction {
  if (!hasOuting || !joined) return 'join';
  return ready ? 'spin' : 'leave';
}

export function OutingPage() {
  const { user } = useSession();
  const { group, outing, busy, synced, joinCurrentOuting, toggleParticipation, refreshPreview, spin } = usePayWheel();
  const online = useNetworkStatus();
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [spinDuration, setSpinDuration] = useState(SPIN_DURATION_MS);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [error, setError] = useState('');
  const rotationRef = useRef(0);
  const revealTimerRef = useRef<number | null>(null);
  const joined = outing?.participants.some((entry) => entry.userId === user?.uid) ?? false;
  const entries = outing?.preview?.entries ?? [];
  const canMutate = canMutateSharedWheel({ demo: Boolean(user?.demo), online, synced, maintenance: group?.status === 'maintenance' });
  const ready = canMutate && joined && (outing?.participants.length ?? 0) >= 2 && Boolean(outing?.preview) && outing?.status === 'open';
  const primaryAction = getPrimaryAction({ hasOuting: Boolean(outing), joined, ready });

  useEffect(() => {
    if ((user?.demo || synced) && outing?.status === 'open' && outing.participants.length > 0 && !outing.preview) void refreshPreview().catch(() => undefined);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outing?.participants.length, outing?.status, outing?.preview, synced]);

  useEffect(() => () => {
    if (revealTimerRef.current !== null) window.clearTimeout(revealTimerRef.current);
  }, []);

  async function run(action: () => Promise<void>) {
    setError('');
    try { await action(); }
    catch (cause: any) {
      if (cause?.code === 'PREVIEW_STALE') await refreshPreview();
      setError(cause instanceof Error ? cause.message : 'Operazione non riuscita.');
    }
  }

  async function handleSpin() {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const startingRotation = rotationRef.current;
    const startedAt = performance.now();
    setError('');
    setSpinning(true);

    if (!reducedMotion) {
      const pendingRotation = startingRotation + SPIN_TURNS * 360;
      rotationRef.current = pendingRotation;
      setSpinDuration(SPIN_DURATION_MS);
      setRotation(pendingRotation);
    }

    try {
      const result = await spin();
      const motion = createSpinMotion(entries, result.payerUserId, startingRotation, reducedMotion);
      const remainingMs = reducedMotion
        ? motion.durationMs
        : Math.max(600, motion.durationMs - (performance.now() - startedAt));

      rotationRef.current = motion.rotation;
      setSpinDuration(remainingMs);
      setRotation(motion.rotation);
      revealTimerRef.current = window.setTimeout(() => {
        revealTimerRef.current = null;
        setSpinning(false);
      }, remainingMs);
    } catch (cause: any) {
      if (cause?.code === 'PREVIEW_STALE') await refreshPreview().catch(() => undefined);
      setError(cause instanceof Error ? cause.message : 'Operazione non riuscita.');
      setSpinning(false);
    }
  }

  async function handlePrimaryAction() {
    if (primaryAction === 'spin') return handleSpin();
    if (primaryAction === 'join') return run(() => joinCurrentOuting(true));
    return run(toggleParticipation);
  }

  if (outing?.status === 'drawn' && !spinning) return <DrawResult />;

  const actionLabel = primaryAction === 'spin' ? 'Gira' : primaryAction === 'join' ? 'Aggiungimi' : 'Non partecipo';
  return <main className="outing-stage" aria-label="Ruota Pay Wheel" aria-busy={spinning}>
    <button className="details-trigger" type="button" aria-label="Mostra partecipanti e probabilità" disabled={spinning} onClick={() => setDetailsOpen(true)}>i</button>
    <div className="wheel-stage">
      <Wheel entries={entries} rotation={rotation} spinning={spinning} durationMs={spinDuration} />
    </div>
    <div className="primary-action-slot">
      <Button disabled={!canMutate || spinning} loading={busy || spinning} onClick={() => void handlePrimaryAction()}>{actionLabel}</Button>
      {error && <p className="stage-error" role="alert">{error}</p>}
      {!online && !user?.demo && <p className="stage-status">Offline</p>}
      {online && !synced && !user?.demo && <p className="stage-status">Sincronizzazione…</p>}
    </div>
    <OutingDetailsSheet open={detailsOpen} onClose={() => setDetailsOpen(false)} />
  </main>;
}
