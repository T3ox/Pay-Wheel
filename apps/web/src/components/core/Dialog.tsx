import { useEffect, useRef, type ReactNode } from 'react';

export function Dialog({ open, title, children, onClose }: { open: boolean; title: string; children: ReactNode; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);
  return <dialog ref={ref} className="dialog" onCancel={onClose} onClose={onClose}>
    <div className="dialog__header"><h2>{title}</h2><button className="icon-button" onClick={onClose} aria-label="Chiudi">×</button></div>
    {children}
  </dialog>;
}

