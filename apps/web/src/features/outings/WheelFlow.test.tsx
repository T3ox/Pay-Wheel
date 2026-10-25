import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ParticipantList } from './ParticipantList';
import { Wheel } from './Wheel';
import { createSpinMotion } from './wheelMotion';

const protectedEntry = { userId: 'a', displayName: 'Anna', joinedAt: '2026-10-23T09:00:00.000Z', spentCents: 130, lastPaidWeekId: '2026-10-19', lastPaidAt: null, eligibility: 'protected' as const, protectedUntilWeekEnd: true, weightMicros: 0, probabilityMicros: 0 };

describe('ParticipantList', () => {
  it('exposes probability and weekly protection as text', () => {
    render(<ParticipantList entries={[protectedEntry]} />);
    expect(screen.getByText('Anna')).toBeInTheDocument();
    expect(screen.getByText('Protetto fino a lunedì')).toBeInTheDocument();
    expect(screen.getByText('0%')).toBeInTheDocument();
    expect(document.querySelector('.participant-color')).toHaveStyle({ backgroundColor: 'rgb(72, 215, 255)' });
  });

  it('keeps the participant color for protected segments and adds a non-fill overlay', () => {
    const { container } = render(<Wheel entries={[protectedEntry]} />);
    const segment = container.querySelector<SVGPathElement>('.wheel-segment');
    const overlay = container.querySelector<SVGPathElement>('.wheel-segment-protection');

    expect(segment?.getAttribute('fill')).toMatch(/^#[0-9A-F]{6}$/i);
    expect(segment?.getAttribute('fill')).not.toContain('url(');
    expect(overlay).toHaveAttribute('fill', 'none');
    expect(container.querySelector('#protectedPattern')).not.toBeInTheDocument();
  });

  it('uses the payer returned by the backend to stop the wheel', () => {
    const entries = [{ userId: 'anna' }, { userId: 'bruno' }, { userId: 'carla' }];
    const remoteResult = { payerUserId: 'carla', revision: 8 };

    const motion = createSpinMotion(entries, remoteResult.payerUserId, 0, false);

    expect(remoteResult.revision).toBe(8);
    expect(motion.rotation).toBeGreaterThanOrEqual(5 * 360);
    expect(motion.rotation % 360).toBe(60);
  });
});
