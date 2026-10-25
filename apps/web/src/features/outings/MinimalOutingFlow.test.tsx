import { describe, expect, it } from 'vitest';
import { getPrimaryAction } from './OutingPage';

describe('minimal outing primary action', () => {
  it('exposes exactly the action required by the current state', () => {
    expect(getPrimaryAction({ hasOuting: false, joined: false, ready: false })).toBe('join');
    expect(getPrimaryAction({ hasOuting: true, joined: false, ready: false })).toBe('join');
    expect(getPrimaryAction({ hasOuting: true, joined: true, ready: false })).toBe('leave');
    expect(getPrimaryAction({ hasOuting: true, joined: true, ready: true })).toBe('spin');
  });
});
