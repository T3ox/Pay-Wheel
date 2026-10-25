import { describe, expect, it } from 'vitest';
import { calculateAutomaticPayment, getWeekId } from '@pay-wheel/domain';

describe('automatic payment policy', () => {
  it('charges coffees plus the anti-gaming penalty', () => expect(calculateAutomaticPayment(5)).toBe(850));
  it('moves protection at the Rome weekly boundary', () => {
    expect(getWeekId(new Date('2026-10-25T23:30:00Z'), 'Europe/Rome')).toBe('2026-10-26');
  });
});
