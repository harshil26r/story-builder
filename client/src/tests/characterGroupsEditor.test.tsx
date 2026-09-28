import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CharacterGroupsEditor } from '../components/characters/CharacterGroupsEditor';
import { useCharacterStore } from '../store/characterStore';
import { characterGroupsApi, charactersApi } from '../services/api';
import { makeCharacterGroup } from './fixtures';

// TICKET: CharacterGroupsEditor — toggle membership + inline create.
describe('CharacterGroupsEditor', () => {
  beforeEach(() => {
    useCharacterStore.setState({
      characters: [],
      status: 'idle',
      error: null,
      groups: [],
      groupsStatus: 'idle',
      groupsError: null,
    });
    vi.restoreAllMocks();
  });
  afterEach(() => vi.restoreAllMocks());

  it('loads groups on mount and toggles membership via setGroups', async () => {
    const g1 = makeCharacterGroup({ _id: 'g1', name: 'Villains' });
    const g2 = makeCharacterGroup({ _id: 'g2', name: 'Book 1' });
    vi.spyOn(characterGroupsApi, 'list').mockResolvedValue({ groups: [g1, g2] });
    const setGroups = vi.spyOn(charactersApi, 'setGroups').mockResolvedValue({
      character: { groupIds: ['g1'] } as never,
    });

    render(<CharacterGroupsEditor characterId="c1" groupIds={['g1']} />);

    const chip = await screen.findByRole('button', { name: /book 1 — add to group/i });
    fireEvent.click(chip);

    await waitFor(() => {
      expect(setGroups).toHaveBeenCalledWith('c1', ['g1', 'g2']);
    });
  });

  it('removes a group on toggle-off', async () => {
    const g1 = makeCharacterGroup({ _id: 'g1', name: 'Villains' });
    vi.spyOn(characterGroupsApi, 'list').mockResolvedValue({ groups: [g1] });
    const setGroups = vi.spyOn(charactersApi, 'setGroups').mockResolvedValue({
      character: { groupIds: [] } as never,
    });

    render(<CharacterGroupsEditor characterId="c1" groupIds={['g1']} />);
    const chip = await screen.findByRole('button', { name: 'Villains' });
    fireEvent.click(chip);

    await waitFor(() => {
      expect(setGroups).toHaveBeenCalledWith('c1', []);
    });
  });

  it('creates a group inline then assigns it', async () => {
    const g1 = makeCharacterGroup({ _id: 'g1', name: 'Villains' });
    const fresh = makeCharacterGroup({ _id: 'g9', name: 'Book 2' });
    vi.spyOn(characterGroupsApi, 'list').mockResolvedValue({ groups: [g1] });
    vi.spyOn(characterGroupsApi, 'create').mockResolvedValue({ group: fresh });
    const setGroups = vi.spyOn(charactersApi, 'setGroups').mockResolvedValue({
      character: { groupIds: ['g9'] } as never,
    });

    render(<CharacterGroupsEditor characterId="c1" groupIds={[]} />);
    const input = await screen.findByLabelText('New group name');
    fireEvent.change(input, { target: { value: 'Book 2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create group' }));

    await waitFor(() => {
      expect(characterGroupsApi.create).toHaveBeenCalledWith('Book 2');
    });
    await waitFor(() => {
      expect(setGroups).toHaveBeenCalledWith('c1', ['g9']);
    });
  });

  it('renders an empty prompt when there are no groups', async () => {
    vi.spyOn(characterGroupsApi, 'list').mockResolvedValue({ groups: [] });
    render(<CharacterGroupsEditor characterId="c1" groupIds={[]} />);
    expect(await screen.findByText(/no groups yet/i)).toBeInTheDocument();
  });

  it('renders an error state with retry when loading groups fails', async () => {
    vi.spyOn(characterGroupsApi, 'list')
      .mockRejectedValueOnce(new Error('Oops'))
      .mockResolvedValueOnce({ groups: [] });
    render(<CharacterGroupsEditor characterId="c1" groupIds={[]} />);

    expect(await screen.findByTestId('error-alert')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /retry/i }));
    expect(await screen.findByText(/no groups yet/i)).toBeInTheDocument();
  });
});
