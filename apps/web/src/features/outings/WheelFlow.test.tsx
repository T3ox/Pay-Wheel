import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ParticipantList } from './ParticipantList';

describe('ParticipantList', () => {
  it('exposes probability and weekly protection as text', () => {
    render(<ParticipantList entries={[{ userId: 'a', displayName: 'Anna', joinedAt: '2026-10-23T09:00:00.000Z', spentCents: 130, lastPaidWeekId: '2026-10-19', lastPaidAt: null, eligibility: 'protected', protectedUntilWeekEnd: true, weightMicros: 0, probabilityMicros: 0 }]} />);
    expect(screen.getByText('Anna')).toBeInTheDocument();
    expect(screen.getByText('Protetto fino a lunedì')).toBeInTheDocument();
    expect(screen.getByText('0%')).toBeInTheDocument();
  });
});
