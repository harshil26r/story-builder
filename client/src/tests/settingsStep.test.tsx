import { describe, it, expect, vi } from 'vitest';
import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SettingsStep, type SettingsStepValues } from '../components/stories/steps/SettingsStep';

const base: SettingsStepValues = {
  structureType: 'linear',
  genre: '',
  tone: '',
  targetAudience: '',
  lengthTarget: '',
  pov: '3rd',
  generationMode: 'full-ai',
};

function renderControlled(onChange = vi.fn()) {
  function Harness() {
    const [value, setValue] = useState(base);
    return (
      <SettingsStep
        value={value}
        onChange={(next) => {
          setValue(next);
          onChange(next);
        }}
      />
    );
  }
  return { onChange, render: render(<Harness />) };
}

// TICKET-46: SettingsStep (structure + genre/tone/audience/length/pov/mode).
describe('TICKET-46 — SettingsStep', () => {
  it('shows all three structure options distinctly', () => {
    render(<SettingsStep value={base} onChange={() => {}} />);
    expect(screen.getByTestId('structure-options')).toBeInTheDocument();
    expect(screen.getByTestId('structure-single')).toBeInTheDocument();
    expect(screen.getByTestId('structure-linear')).toBeInTheDocument();
    expect(screen.getByTestId('structure-branching')).toBeInTheDocument();
    expect(screen.getByText('Single')).toBeInTheDocument();
    expect(screen.getByText('Linear')).toBeInTheDocument();
    expect(screen.getByText('Branching')).toBeInTheDocument();
    expect(screen.getByTestId('structure-linear')).toHaveAttribute('aria-pressed', 'true');
  });

  it('picking a structure calls onChange and updates the selection', async () => {
    const user = userEvent.setup();
    const { onChange } = renderControlled();
    await user.click(screen.getByTestId('structure-branching'));
    expect(onChange).toHaveBeenCalledWith({ ...base, structureType: 'branching' });
    expect(screen.getByTestId('structure-branching')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('structure-linear')).toHaveAttribute('aria-pressed', 'false');
  });

  it('typing genre, tone, audience, and length calls onChange', async () => {
    const user = userEvent.setup();
    const { onChange } = renderControlled();
    await user.type(screen.getByLabelText(/genre/i), 'fantasy');
    expect(onChange).toHaveBeenLastCalledWith({ ...base, genre: 'fantasy' });
    await user.type(screen.getByLabelText(/tone/i), 'dark');
    expect(onChange).toHaveBeenLastCalledWith({ ...base, genre: 'fantasy', tone: 'dark' });
    await user.type(screen.getByLabelText(/target audience/i), 'adult');
    expect(onChange).toHaveBeenLastCalledWith({
      ...base,
      genre: 'fantasy',
      tone: 'dark',
      targetAudience: 'adult',
    });
    await user.type(screen.getByLabelText(/length/i), 'medium');
    expect(onChange).toHaveBeenLastCalledWith({
      ...base,
      genre: 'fantasy',
      tone: 'dark',
      targetAudience: 'adult',
      lengthTarget: 'medium',
    });
  });

  it('switches pov and generation mode via onChange', async () => {
    const user = userEvent.setup();
    const { onChange } = renderControlled();
    await user.click(screen.getByRole('button', { name: '2nd person' }));
    expect(onChange).toHaveBeenLastCalledWith({ ...base, pov: '2nd' });
    expect(screen.getByRole('button', { name: '2nd person' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await user.click(screen.getByRole('button', { name: /ai-enhanced/i }));
    expect(onChange).toHaveBeenLastCalledWith({
      ...base,
      pov: '2nd',
      generationMode: 'ai-enhanced',
    });
  });
});
