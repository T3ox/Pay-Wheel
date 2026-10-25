import { render, screen } from '@testing-library/react';
import { getWeekId } from '@pay-wheel/domain';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LeaderboardPage } from './LeaderboardPage';

const { usePayWheel } = vi.hoisted(() => ({ usePayWheel: vi.fn() }));
vi.mock('../groups/PayWheelProvider', () => ({ usePayWheel: () => usePayWheel() }));
vi.mock('../auth/AuthProvider', () => ({ useAuth: () => ({ user: { demo: true } }) }));

describe('LeaderboardPage', () => {
  beforeEach(() => {
    const weekId = getWeekId(new Date(), 'Europe/Rome');
    usePayWheel.mockReturnValue({
      group: { timezone: 'Europe/Rome' },
      members: [
        { userId: 'a', displayName: 'Anna', photoUrl: null, role: 'member', status: 'active', joinedAt: new Date().toISOString(), lastPaidWeekId: weekId, lastPaidAt: new Date().toISOString() },
        { userId: 'b', displayName: 'Bruno', photoUrl: null, role: 'member', status: 'active', joinedAt: new Date().toISOString(), lastPaidWeekId: null, lastPaidAt: null }
      ],
      payments: [{ outingId: 'o1', payerUserId: 'a', payerDisplayName: 'Anna', amountCents: 600, weekId, source: 'manual', participantCountAtDraw: 2, participantUserIds: ['a', 'b'], correctedAt: null, createdAt: new Date().toISOString() }]
    });
  });

  it('uses every participant in the average and exposes textual trends', () => {
    render(<LeaderboardPage/>);
    expect(screen.getByText('Media del gruppo').parentElement).toHaveTextContent('3,00');
    expect(screen.getByText('Protetto fino a lunedì')).toBeInTheDocument();
    expect(screen.getByText(/sotto la media/)).toBeInTheDocument();
  });
});
