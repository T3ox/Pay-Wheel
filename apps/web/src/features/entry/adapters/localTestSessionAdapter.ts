import type { SessionAdapter, SessionUser } from '../session';
import { createUuid } from '../../../services/ids/uuid';

const SESSION_KEY = 'pay-wheel:test-session:v2';

function read(): SessionUser | null {
  const stored = localStorage.getItem(SESSION_KEY);
  if (!stored) return null;
  try {
    const user = JSON.parse(stored) as SessionUser;
    return user.mode === 'test' && user.uid ? { ...user, access: user.access ?? 'admin' } : null;
  } catch {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

export const localTestSessionAdapter: SessionAdapter = {
  async restore() {
    return read();
  },
  async enter() {
    const existing = read();
    if (existing) return existing;
    const user: SessionUser = {
      uid: `test-${createUuid()}`,
      displayName: 'Tu',
      email: null,
      photoURL: null,
      mode: 'test',
      access: 'admin',
      demo: true
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    return user;
  },
  async signOut() {
    localStorage.removeItem(SESSION_KEY);
  },
  async reauthenticate() {}
};

export function clearLocalTestWorkspace() {
  localStorage.removeItem('pay-wheel:test-workspace:v2');
}
