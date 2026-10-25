import { describe, expect, it } from 'vitest';
import { getParticipantColor, participantColors } from './wheelPalette';

const entries = [
  { userId: 'anna' },
  { userId: 'bruno' },
  { userId: 'carla' }
];

describe('wheel palette', () => {
  it('returns the same color used by the participant segment', () => {
    expect(getParticipantColor(entries, 'anna')).toBe(participantColors[0]);
    expect(getParticipantColor(entries, 'bruno')).toBe(participantColors[1]);
    expect(getParticipantColor(entries, 'carla')).toBe(participantColors[2]);
  });

  it('cycles the palette using the participant position', () => {
    const repeatedEntries = Array.from({ length: participantColors.length + 1 }, (_, index) => ({ userId: `user-${index}` }));

    expect(getParticipantColor(repeatedEntries, `user-${participantColors.length}`)).toBe(participantColors[0]);
  });

  it('uses the first palette color as a safe fallback for a missing participant', () => {
    expect(getParticipantColor(entries, 'missing')).toBe(participantColors[0]);
  });
});
