import { describe, it, expect, vi } from 'vitest';
import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PremiseStep } from '../components/stories/steps/PremiseStep';

// TICKET-46: PremiseStep (premise/idea free text step).
describe('TICKET-46 — PremiseStep', () => {
  it('renders a labelled premise textarea', () => {
    render(<PremiseStep value="" onChange={() => {}} pov="3rd" />);
    expect(screen.getByLabelText(/story premise/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/lighthouse keeper/i)).toBeInTheDocument();
  });

  it('adapts the prompt hint to the point of view', () => {
    render(<PremiseStep value="" onChange={() => {}} pov="1st" />);
    expect(screen.getByText(/first person/i)).toBeInTheDocument();
  });

  it('forwards typing to onChange', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    function Harness() {
      const [value, setValue] = useState('');
      return (
        <PremiseStep
          value={value}
          onChange={(next) => {
            setValue(next);
            onChange(next);
          }}
          pov="3rd"
        />
      );
    }
    render(<Harness />);
    await user.type(screen.getByLabelText(/story premise/i), 'abc');
    expect(onChange).toHaveBeenCalledWith('a');
    expect(onChange).toHaveBeenLastCalledWith('abc');
    expect(screen.getByLabelText(/story premise/i)).toHaveValue('abc');
  });

  it('blocks continue until a non-empty premise of at least 10 chars is typed', async () => {
    const user = userEvent.setup();
    function Harness() {
      const [value, setValue] = useState('');
      const valid = value.trim().length >= 10;
      return (
        <>
          <PremiseStep value={value} onChange={setValue} pov="3rd" />
          <button type="button" data-testid="premise-continue" disabled={!valid}>
            Continue
          </button>
        </>
      );
    }
    render(<Harness />);
    const textarea = screen.getByLabelText(/story premise/i);
    const continueBtn = screen.getByTestId('premise-continue');

    expect(continueBtn).toBeDisabled();
    expect(screen.getByTestId('premise-valid')).toHaveTextContent(/At least 10 characters/);

    await user.type(textarea, 'A short idea');
    expect(continueBtn).toBeEnabled();
    expect(screen.getByTestId('premise-valid')).toHaveTextContent('Great — your premise is ready.');
    expect(textarea).toHaveValue('A short idea');

    await user.clear(textarea);
    expect(continueBtn).toBeDisabled();
    expect(screen.getByTestId('premise-valid')).toHaveTextContent(/At least 10 characters/);
  });
});
