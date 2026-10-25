import { describe, expect, it } from 'vitest';
import { getContrastRatio, getParticipantColor, getReadableLabelColor, participantColors } from './wheelPalette';

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

  it.each([1, 8, 9, 25])('assigns valid colors without adjacent duplicates to %i participants', (count) => {
    const manyEntries = Array.from({ length: count }, (_, index) => ({ userId: `user-${index}` }));
    const colors = manyEntries.map((entry) => getParticipantColor(manyEntries, entry.userId));

    expect(colors.every((color) => /^#[0-9A-F]{6}$/i.test(color))).toBe(true);
    expect(colors.every((color, index) => index === 0 || color !== colors[index - 1])).toBe(true);
    if (count > 1) expect(colors.at(-1)).not.toBe(colors[0]);
  });

  it('selects a label color with at least AA contrast for every palette entry', () => {
    for (const color of participantColors) {
      expect(getContrastRatio(color, getReadableLabelColor(color))).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('uses the first palette color as a safe fallback for a missing participant', () => {
    expect(getParticipantColor(entries, 'missing')).toBe(participantColors[0]);
  });
});
