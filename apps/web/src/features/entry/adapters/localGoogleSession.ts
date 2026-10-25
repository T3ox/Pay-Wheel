import type { SessionUser } from '../session';

interface GoogleIdentity {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}

export function isLocalAppHost(hostname: string): boolean {
  const normalized = hostname.toLowerCase().replace(/\.$/, '');
  return normalized === 'localhost'
    || normalized.endsWith('.localhost')
    || normalized === '127.0.0.1'
    || normalized === '0.0.0.0'
    || normalized === '::1'
    || normalized === '[::1]';
}

export function shouldUseLocalGoogleSession(hostname: string, emulatorsActive: boolean): boolean {
  return !emulatorsActive && isLocalAppHost(hostname);
}

export function createLocalGoogleSession(user: GoogleIdentity): SessionUser {
  return {
    uid: user.uid,
    displayName: user.displayName ?? 'Collega',
    email: user.email,
    photoURL: user.photoURL,
    mode: 'firebase',
    access: 'admin',
    demo: true
  };
}
