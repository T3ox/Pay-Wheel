import { describe, expect, it } from 'vitest';
import { buildFairnessPreview, calculateAutomaticPayment, createPreviewVersion, getWeekId, parseEuroInput, selectWeightedUser } from '../src/index.js';

const participant = (userId: string, spentCents: number, lastPaidWeekId: string | null = null, lastPaidAt: string | null = null) => ({
  userId,
  displayName: userId,
  joinedAt: `2026-10-23T09:00:0${userId === 'a' ? '0' : '1'}.000Z`,
  spentCents,
  lastPaidWeekId,
  lastPaidAt
});

describe('money', () => {
  it('parses Italian amounts and rejects invalid values', () => {
    expect(parseEuroInput('8,40')).toBe(840);
    expect(parseEuroInput('0')).toBeNull();
    expect(parseEuroInput('1,234')).toBeNull();
  });

  it('adds the missing-amount penalty', () => {
    expect(calculateAutomaticPayment(4)).toBe(720);
  });
});

describe('weekly fairness', () => {
  it('resets protection at the next week and favors lower spenders', () => {
    const current = buildFairnessPreview([participant('a', 100), participant('b', 900, '2026-10-19')], '2026-10-19', 500);
    expect(current.entries.find((entry) => entry.userId === 'b')?.probabilityMicros).toBe(0);
    const next = buildFairnessPreview([participant('a', 100), participant('b', 900, '2026-10-19')], '2026-10-26', 500);
    expect(next.entries.find((entry) => entry.userId === 'a')!.probabilityMicros).toBeGreaterThan(next.entries.find((entry) => entry.userId === 'b')!.probabilityMicros);
    expect(next.entries.reduce((sum, entry) => sum + entry.probabilityMicros, 0)).toBe(1_000_000);
  });

  it('overrides the oldest payer when everyone is protected', () => {
    const preview = buildFairnessPreview([
      participant('a', 500, '2026-10-19', '2026-10-20T09:00:00.000Z'),
      participant('b', 500, '2026-10-19', '2026-10-22T09:00:00.000Z')
    ], '2026-10-19', 500);
    expect(preview.cooldownOverrideApplied).toBe(true);
    expect(preview.entries.find((entry) => entry.userId === 'a')?.eligibility).toBe('override');
    expect(selectWeightedUser(preview.entries, 0)).toBe('a');
  });
});

describe('time and preview version', () => {
  it('uses the Monday in Europe/Rome across a Sunday boundary', () => {
    expect(getWeekId(new Date('2026-10-25T23:30:00.000Z'), 'Europe/Rome')).toBe('2026-10-26');
  });

  it('is stable across object key order', async () => {
    expect(await createPreviewVersion({ b: 2, a: 1 })).toBe(await createPreviewVersion({ a: 1, b: 2 }));
  });
});
