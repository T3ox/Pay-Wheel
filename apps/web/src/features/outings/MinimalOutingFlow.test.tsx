import { describe, expect, it } from 'vitest';
import { getPrimaryAction } from './OutingPage';
import { canMutateSharedWheel } from './outingState';

describe('minimal outing primary action', () => {
  it('exposes exactly the action required by the current state', () => {
    expect(getPrimaryAction({ hasOuting: false, joined: false, ready: false })).toBe('join');
    expect(getPrimaryAction({ hasOuting: true, joined: false, ready: false })).toBe('join');
    expect(getPrimaryAction({ hasOuting: true, joined: true, ready: false })).toBe('leave');
    expect(getPrimaryAction({ hasOuting: true, joined: true, ready: true })).toBe('spin');
  });

  it('blocks shared mutations until an online client has a server-confirmed snapshot', () => {
    expect(canMutateSharedWheel({ demo: false, online: true, synced: false, maintenance: false })).toBe(false);
    expect(canMutateSharedWheel({ demo: false, online: false, synced: true, maintenance: false })).toBe(false);
    expect(canMutateSharedWheel({ demo: false, online: true, synced: true, maintenance: false })).toBe(true);
    expect(canMutateSharedWheel({ demo: true, online: false, synced: false, maintenance: false })).toBe(true);
  });
});
