import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useSession } from '../features/entry/SessionProvider';
import { InstallPrompt } from '../features/pwa/InstallPrompt';
import { UpdatePrompt } from '../features/pwa/UpdatePrompt';
import { useNetworkStatus } from '../services/network/useNetworkStatus';

const links = [
  { to: '/', label: 'Ruota' },
  { to: '/leaderboard', label: 'Classifica' },
  { to: '/history', label: 'Storico' },
  { to: '/settings/account', label: 'Profilo' }
];

export function MinimalShell() {
  const [open, setOpen] = useState(false);
  const { signOut } = useSession();
  const online = useNetworkStatus();
  const location = useLocation();

  return <div className="minimal-shell">
    <a className="skip-link" href="#main-content">Vai al contenuto</a>
    <button className="menu-trigger" type="button" aria-label="Apri menu" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
      <span aria-hidden="true">•••</span>
    </button>
    {open && <div className="menu-backdrop" onClick={() => setOpen(false)}>
      <aside className="minimal-menu" aria-label="Menu" onClick={(event) => event.stopPropagation()}>
        <div className="menu-status"><span className={online ? 'online-dot' : 'offline-dot'} />{online ? 'Online' : 'Offline'}</div>
        <nav aria-label="Navigazione principale">
          {links.map((link) => <NavLink key={link.to} to={link.to} end={link.to === '/'} aria-current={location.pathname === link.to ? 'page' : undefined} onClick={() => setOpen(false)}>{link.label}</NavLink>)}
        </nav>
        <button className="menu-signout" type="button" onClick={() => void signOut()}>Esci</button>
      </aside>
    </div>}
    <div id="main-content"><Outlet /></div>
    <InstallPrompt />
    <UpdatePrompt />
  </div>;
}
