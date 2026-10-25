import { describe, expect, it } from 'vitest';
import { shouldApplyRevision } from './sharedState';

describe('shared wheel snapshot revisions', () => {
  it('accepts the first, equal, and newer snapshots', () => {
    expect(shouldApplyRevision(null, 1)).toBe(true);
    expect(shouldApplyRevision(4, 4)).toBe(true);
    expect(shouldApplyRevision(4, 5)).toBe(true);
  });

  it('rejects a delayed snapshot that would roll state back', () => {
    expect(shouldApplyRevision(5, 4)).toBe(false);
  });
});
