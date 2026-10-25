import { describe, expect, it } from 'vitest';
import { hasPersistedSpinResult, isTerminalWheelStatus, nextRevision, readRevision, revisionMatches } from '../../src/domain/shared-wheel.js';

describe('shared wheel revisions', () => {
  it('normalizes missing legacy revisions and increments monotonically', () => {
    expect(readRevision(undefined)).toBe(0);
    expect(readRevision(4)).toBe(4);
    expect(nextRevision(undefined)).toBe(1);
    expect(nextRevision(4)).toBe(5);
  });

  it('matches only the exact integer revision', () => {
    expect(revisionMatches(3, 3)).toBe(true);
    expect(revisionMatches(3, 2)).toBe(false);
    expect(revisionMatches(3, '3')).toBe(false);
  });

  it('treats a stale revision as a conflict and a persisted draw as replayable', () => {
    expect(revisionMatches(8, 7)).toBe(false);
    expect(hasPersistedSpinResult({ status: 'drawn', payerUserId: 'anna', payerDisplayNameSnapshot: 'Anna' })).toBe(true);
    expect(hasPersistedSpinResult({ status: 'drawn', payerUserId: null, payerDisplayNameSnapshot: null })).toBe(false);
    expect(hasPersistedSpinResult({ status: 'open', payerUserId: 'anna', payerDisplayNameSnapshot: 'Anna' })).toBe(false);
  });

  it('recognizes only completed and cancelled as terminal', () => {
    expect(isTerminalWheelStatus('completed')).toBe(true);
    expect(isTerminalWheelStatus('cancelled')).toBe(true);
    expect(isTerminalWheelStatus('drawn')).toBe(false);
    expect(isTerminalWheelStatus('open')).toBe(false);
  });
});
