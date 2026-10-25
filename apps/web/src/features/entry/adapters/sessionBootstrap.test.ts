import { describe, expect, it, vi } from 'vitest';
import { createSessionBootstrap } from './sessionBootstrap';

interface TestUser {
  uid: string;
}

interface TestSession {
  uid: string;
  access: 'member' | 'admin';
}

describe('createSessionBootstrap', () => {
  it('shares one request between concurrent consumers and reuses the completed session', async () => {
    let complete!: (session: TestSession) => void;
    const load = vi.fn(() => new Promise<TestSession>((resolve) => { complete = resolve; }));
    const bootstrap = createSessionBootstrap<TestUser, TestSession>(load);
    const user = { uid: 'user-1' };

    const fromAuthListener = bootstrap.resolve(user);
    const fromPopup = bootstrap.resolve(user);

    expect(load).toHaveBeenCalledTimes(1);
    complete({ uid: user.uid, access: 'admin' });

    await expect(fromAuthListener).resolves.toEqual({ uid: user.uid, access: 'admin' });
    await expect(fromPopup).resolves.toEqual({ uid: user.uid, access: 'admin' });
    await expect(bootstrap.resolve(user)).resolves.toEqual({ uid: user.uid, access: 'admin' });
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('allows retry after a failed bootstrap', async () => {
    const load = vi.fn()
      .mockRejectedValueOnce(new Error('temporary failure'))
      .mockResolvedValueOnce({ uid: 'user-1', access: 'member' } satisfies TestSession);
    const bootstrap = createSessionBootstrap<TestUser, TestSession>(load);
    const user = { uid: 'user-1' };

    await expect(bootstrap.resolve(user)).rejects.toThrow('temporary failure');
    await expect(bootstrap.resolve(user)).resolves.toEqual({ uid: user.uid, access: 'member' });
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('invalidates the cached session on sign-out or user change', async () => {
    const load = vi.fn(async (user: TestUser) => ({ uid: user.uid, access: 'member' as const }));
    const bootstrap = createSessionBootstrap<TestUser, TestSession>(load);

    await bootstrap.resolve({ uid: 'user-1' });
    bootstrap.clear('user-1');
    await bootstrap.resolve({ uid: 'user-1' });
    await bootstrap.resolve({ uid: 'user-2' });

    expect(load).toHaveBeenCalledTimes(3);
  });
});
