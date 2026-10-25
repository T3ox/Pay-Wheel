import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { MoneyInput } from './MoneyInput';

describe('MoneyInput', () => {
  it('converts comma decimals to integer cents', async () => {
    const onChange = vi.fn();
    function Harness() { const [value, setValue] = useState(''); return <MoneyInput value={value} onChange={(next, cents) => { setValue(next); onChange(next, cents); }} />; }
    render(<Harness />);
    await userEvent.type(screen.getByRole('textbox', { name: /totale pagato/i }), '8,40');
    expect(onChange).toHaveBeenLastCalledWith('8,40', 840);
  });
});
