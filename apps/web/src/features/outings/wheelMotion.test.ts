import { describe, expect, it } from 'vitest';
import { createSpinMotion } from './wheelMotion';

const entries = [
  { userId: 'anna' },
  { userId: 'bruno' },
  { userId: 'carla' },
  { userId: 'dario' }
];

describe('wheel spin motion', () => {
  it('completes at least five turns and aligns the selected participant with the pointer', () => {
    const motion = createSpinMotion(entries, 'bruno', 0, false);

    expect(motion.durationMs).toBe(3200);
    expect(motion.rotation).toBeGreaterThanOrEqual(5 * 360);
    expect(motion.rotation % 360).toBe(225);
  });

  it('preserves the current angle and uses a short reveal when reduced motion is requested', () => {
    expect(createSpinMotion(entries, 'carla', 42, true)).toEqual({
      rotation: 42,
      durationMs: 180
    });
  });

  it('keeps spinning forward from an existing rotation', () => {
    const motion = createSpinMotion(entries, 'anna', 725, false);

    expect(motion.rotation).toBeGreaterThan(725 + 5 * 360);
    expect(motion.rotation % 360).toBe(315);
  });
});
