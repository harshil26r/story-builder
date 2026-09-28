import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useState } from 'react';
import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { CharactersStep } from '../components/stories/steps/CharactersStep';
import { useCharacterStore } from '../store/characterStore';
import { charactersApi } from '../services/api';
import { makeCharacter } from './fixtures';
import { AppError } from '../types/domain';

// TICKET-46: CharactersStep (select/add characters for the story).
describe('TICKET-46 — CharactersStep', () => {
  const renderStep = (characterIds: string[] = [], onChange = () => {}) =>
    render(
      <MemoryRouter>
        <CharactersStep characterIds={characterIds} onChange={onChange} />
      </MemoryRouter>,
    );

  beforeEach(() => {
    useCharacterStore.setState({ characters: [], status: 'idle', error: null });
    vi.restoreAllMocks();
  });
  afterEach(() => vi.restoreAllMocks());

  it('lists characters and toggles them into the selected set', async () => {
    useCharacterStore.setState({
      characters: [makeCharacter(), makeCharacter({ _id: 'c2', name: 'Bram', isTemplate: true })],
      status: 'success',
      error: null,
    });
    const user = userEvent.setup();
    const onChange = vi.fn();
    function Harness() {
      const [ids, setIds] = useState<string[]>([]);
      return (
        <CharactersStep
          characterIds={ids}
          onChange={(next) => {
            setIds(next);
            onChange(next);
          }}
        />
      );
    }
    render(
      <MemoryRouter>
        <Harness />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('characters-step')).toBeInTheDocument();
    expect(screen.getByText('Elara')).toBeInTheDocument();
    expect(screen.getByText('Bram')).toBeInTheDocument();
    expect(screen.getByText('template')).toBeInTheDocument();

    await user.click(screen.getByTestId('character-toggle-c1'));
    expect(onChange).toHaveBeenCalledWith(['c1']);

    await user.click(screen.getByTestId('character-toggle-c1'));
    expect(onChange).toHaveBeenLastCalledWith([]);
  });

  it('reflects a preseeded selection with aria-pressed', () => {
    useCharacterStore.setState({
      characters: [makeCharacter(), makeCharacter({ _id: 'c2', name: 'Bram' })],
      status: 'success',
      error: null,
    });
    renderStep(['c2']);
    expect(screen.getByTestId('character-toggle-c2')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('character-toggle-c1')).toHaveAttribute('aria-pressed', 'false');
  });

  it('renders a loading indicator while characters are fetched', async () => {
    useCharacterStore.setState({ characters: [], status: 'loading', error: null });
    vi.spyOn(charactersApi, 'list').mockResolvedValue({ characters: [] });
    renderStep();
    expect(screen.getByRole('status', { name: /loading characters/i })).toBeInTheDocument();
    await act(async () => {});
  });

  it('shows an error alert and retries the fetch', async () => {
    useCharacterStore.setState({
      characters: [],
      status: 'error',
      error: new AppError('X', 'Boom'),
    });
    const listSpy = vi.spyOn(charactersApi, 'list').mockRejectedValue(new AppError('X', 'Boom'));
    const user = userEvent.setup();
    renderStep();
    await act(async () => {});
    expect(screen.getByTestId('error-alert')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /retry/i }));
    expect(listSpy).toHaveBeenCalledTimes(2);
    await act(async () => {});
  });

  it('renders an empty state with a create characters CTA', async () => {
    useCharacterStore.setState({ characters: [], status: 'empty', error: null });
    vi.spyOn(charactersApi, 'list').mockResolvedValue({ characters: [] });
    renderStep();
    await act(async () => {});
    expect(screen.getByTestId('characters-empty')).toBeInTheDocument();
    expect(screen.getByText('No characters yet')).toBeInTheDocument();
    expect(screen.getByTestId('characters-create-cta')).toBeInTheDocument();
  });
});
