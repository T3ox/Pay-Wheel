import { useEffect, useState } from 'react';
import { Button } from '../../components/core/Button';
import { trackEvent } from '../../services/analytics/events';

export function InstallPrompt() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(() => Number(localStorage.getItem('pwa-install-dismissed') ?? 0) > Date.now() - 30 * 86400000);
  const standalone = matchMedia('(display-mode: standalone)').matches;
  const ios = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  useEffect(() => {
    const handler = (event: Event) => { event.preventDefault(); setPrompt(event as BeforeInstallPromptEvent); };
    addEventListener('beforeinstallprompt', handler);
    return () => removeEventListener('beforeinstallprompt', handler);
  }, []);
  if (standalone || dismissed || (!prompt && !ios)) return null;
  function dismiss() { localStorage.setItem('pwa-install-dismissed', String(Date.now())); setDismissed(true); }
  return <aside className="install-card"><div><strong>Porta Pay Wheel con te</strong><span>{ios ? 'Apri Condividi e scegli “Aggiungi a Home”.' : 'Installala per aprirla come un’app.'}</span></div>{prompt && <Button variant="secondary" onClick={() => void prompt.prompt().then(() => trackEvent('pwa_installed', { mode: 'prompt' }))}>Installa</Button>}<button className="icon-button" aria-label="Chiudi suggerimento installazione" onClick={dismiss}>×</button></aside>;
}
