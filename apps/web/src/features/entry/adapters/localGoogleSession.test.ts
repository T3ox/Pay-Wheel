import { describe, expect, it } from 'vitest';
import { createLocalGoogleSession, isLocalAppHost, shouldUseLocalGoogleSession } from './localGoogleSession';

describe('local Google session', () => {
  it.each(['localhost', 'app.localhost', '127.0.0.1', '0.0.0.0', '::1', '[::1]'])(
    'recognizes %s as a local app host',
    (hostname) => expect(isLocalAppHost(hostname)).toBe(true)
  );

  it.each(['pay-wheel.vercel.app', 'pay-wheel.web.app', '192.168.1.20'])(
    'keeps %s on the shared Firebase path',
    (hostname) => expect(isLocalAppHost(hostname)).toBe(false)
  );

  it('keeps localhost on the backend path when Firebase emulators are active', () => {
    expect(shouldUseLocalGoogleSession('localhost', true)).toBe(false);
    expect(shouldUseLocalGoogleSession('localhost', false)).toBe(true);
  });

  it('keeps the Google identity while selecting local workspace data', () => {
    expect(createLocalGoogleSession({
      uid: 'google-user',
      displayName: 'Ada Lovelace',
      email: 'ada@example.com',
      photoURL: 'https://example.com/ada.png'
    })).toEqual({
      uid: 'google-user',
      displayName: 'Ada Lovelace',
      email: 'ada@example.com',
      photoURL: 'https://example.com/ada.png',
      mode: 'firebase',
      access: 'admin',
      demo: true
    });
  });
});
