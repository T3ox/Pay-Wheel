import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminDashboardPage } from './AdminDashboardPage';
import { AdminRouteGate } from './AdminRouteGate';

const mocks = vi.hoisted(() => ({
  loadAdminAnalytics: vi.fn(),
  session: { user: { uid: 'admin', displayName: 'Admin', email: null, photoURL: null, mode: 'test', access: 'admin', demo: true } },
  wheel: { group: { groupId: 'company', name: 'Pay Wheel', status: 'active', timezone: 'Europe/Rome' }, payments: [], members: [] }
}));

vi.mock('./adminAnalytics', async () => {
  const actual = await vi.importActual<typeof import('./adminAnalytics')>('./adminAnalytics');
  return { ...actual, loadAdminAnalytics: mocks.loadAdminAnalytics };
});
vi.mock('../entry/SessionProvider', () => ({ useSession: () => mocks.session }));
vi.mock('../groups/PayWheelProvider', () => ({ usePayWheel: () => mocks.wheel }));

const response = {
  period: { kind: 'week' as const, weekId: '2026-10-19' },
  availableWeekIds: ['2026-10-19'],
  completedOutingCount: 4,
  totalSpentCents: 1500,
  personCount: 2,
  incompleteSourceCount: 0,
  rows: [
    { userId: 'anna', displayName: 'Anna', spentCents: 900, drawCount: 1, eligibleParticipationCount: 4, totalParticipationCount: 4, selectionRateBps: 2500, outingShareBps: 2500, lastDrawnAt: '2026-10-20T12:00:00.000Z' },
    { userId: 'bruno', displayName: 'Bruno', spentCents: 600, drawCount: 1, eligibleParticipationCount: 2, totalParticipationCount: 4, selectionRateBps: 5000, outingShareBps: 2500, lastDrawnAt: '2026-10-21T12:00:00.000Z' }
  ],
  generatedAt: '2026-10-25T12:00:00.000Z'
};

function renderPage() {
  return render(<MemoryRouter><AdminDashboardPage /></MemoryRouter>);
}

describe('AdminDashboardPage', () => {
  beforeEach(() => {
    mocks.loadAdminAnalytics.mockReset();
    mocks.session.user.access = 'admin';
  });

  it('shows summary values, sorts rows, and changes period', async () => {
    mocks.loadAdminAnalytics.mockResolvedValue(response);
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText(/15,00/)).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
    const table = screen.getByRole('table');
    expect(within(table).getAllByRole('row')).toHaveLength(3);

    await user.click(screen.getByRole('button', { name: 'Persona' }));
    expect(within(table).getAllByRole('row')[1]).toHaveTextContent('Anna');

    await user.selectOptions(screen.getByLabelText('Periodo'), 'all');
    await waitFor(() => expect(mocks.loadAdminAnalytics).toHaveBeenLastCalledWith(expect.objectContaining({ period: { period: 'all' } })));
  });

  it('shows an explicit empty state', async () => {
    mocks.loadAdminAnalytics.mockResolvedValue({ ...response, completedOutingCount: 0, totalSpentCents: 0, personCount: 0, rows: [] });
    renderPage();

    expect(await screen.findByText('Nessuna uscita conclusa nel periodo selezionato.')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('renders unavailable rates without turning them into zero', async () => {
    mocks.loadAdminAnalytics.mockResolvedValue({ ...response, incompleteSourceCount: 1, rows: [{ ...response.rows[0], eligibleParticipationCount: null, selectionRateBps: null }] });
    renderPage();

    expect(await screen.findByText(/alcune uscite storiche/i)).toBeInTheDocument();
    expect(screen.getAllByText('Non disponibile')).toHaveLength(2);
  });

  it('redirects a non-admin who opens the private URL directly', async () => {
    mocks.session.user.access = 'member';
    render(<MemoryRouter initialEntries={['/admin/dashboard']}><Routes>
      <Route path="/" element={<div>Ruota</div>} />
      <Route element={<AdminRouteGate />}><Route path="/admin/dashboard" element={<div>Dati privati</div>} /></Route>
    </Routes></MemoryRouter>);

    expect(await screen.findByText('Ruota')).toBeInTheDocument();
    expect(screen.queryByText('Dati privati')).not.toBeInTheDocument();
  });

});
