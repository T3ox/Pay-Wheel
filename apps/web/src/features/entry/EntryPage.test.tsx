import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EntryPage } from './EntryPage';

const enter = vi.fn();

vi.mock('./SessionProvider', () => ({
  useSession: () => ({
    user: null,
    loading: false,
    entering: false,
    error: '',
    isTestMode: true,
    enter
  })
}));

describe('EntryPage', () => {
  beforeEach(() => enter.mockReset());

  it('shows one visible control and no promotional copy before interaction', () => {
    render(<EntryPage />);
    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Aggiungimi' })).toBeVisible();
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    expect(screen.queryByText(/pay wheel|chi paga|ruota equa/i)).not.toBeInTheDocument();
  });

  it('delegates entry to the active session adapter', async () => {
    render(<EntryPage />);
    await userEvent.click(screen.getByRole('button', { name: 'Aggiungimi' }));
    expect(enter).toHaveBeenCalledTimes(1);
  });
});
