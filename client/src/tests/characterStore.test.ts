import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useCharacterStore } from '../store/characterStore';
import { charactersApi, characterGroupsApi } from '../services/api';
import type { Character } from '../types/domain';
import { makeCharacter, makeCharacterGroup } from './fixtures';

// TICKET-35: Character Zustand store.
describe('TICKET-35 — character store', () => {
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

  it('fetch loads characters and sets status success or empty', async () => {
    vi.spyOn(charactersApi, 'list').mockResolvedValue({ characters: [makeCharacter()] });
    await useCharacterStore.getState().fetch();
    expect(useCharacterStore.getState().characters).toHaveLength(1);
    expect(useCharacterStore.getState().status).toBe('success');

    vi.spyOn(charactersApi, 'list').mockResolvedValue({ characters: [] });
    await useCharacterStore.getState().fetch();
    expect(useCharacterStore.getState().status).toBe('empty');
  });

  it('transitions idle → loading during fetch', async () => {
    let resolveList: (v: { characters: Character[] }) => void = () => undefined;
    vi.spyOn(charactersApi, 'list').mockReturnValue(
      new Promise<{ characters: Character[] }>((resolve) => {
        resolveList = resolve;
      }),
    );
    const pending = useCharacterStore.getState().fetch();
    expect(useCharacterStore.getState().status).toBe('loading');
    resolveList({ characters: [] });
    await pending;
    expect(useCharacterStore.getState().status).toBe('empty');
  });

  it('fetch failure sets error', async () => {
    vi.spyOn(charactersApi, 'list').mockRejectedValue(new Error('boom'));
    await useCharacterStore.getState().fetch();
    expect(useCharacterStore.getState().status).toBe('error');
    expect(useCharacterStore.getState().error?.message).toBe('boom');
  });

  it('create prepends character', async () => {
    const created = makeCharacter({ _id: 'c2', name: 'Rook' });
    vi.spyOn(charactersApi, 'create').mockResolvedValue({ character: created });
    const result = await useCharacterStore.getState().create({
      name: 'Rook',
      role: 'antagonist',
      age: null,
      gender: 'man',
      appearance: '',
      personality: [],
      likes: [],
      dislikes: [],
      relationships: [],
    });
    expect(result._id).toBe('c2');
    expect(useCharacterStore.getState().characters[0].name).toBe('Rook');
  });

  it('update replaces matching character', async () => {
    useCharacterStore.setState({ characters: [makeCharacter()], status: 'success' });
    const updated = makeCharacter({ name: 'Elara II' });
    vi.spyOn(charactersApi, 'update').mockResolvedValue({ character: updated });
    await useCharacterStore.getState().update('c1', { name: 'Elara II' });
    expect(useCharacterStore.getState().characters[0].name).toBe('Elara II');
  });

  it('remove deletes character', async () => {
    useCharacterStore.setState({ characters: [makeCharacter()], status: 'success' });
    vi.spyOn(charactersApi, 'remove').mockResolvedValue({ ok: true });
    await useCharacterStore.getState().remove('c1');
    expect(useCharacterStore.getState().characters).toHaveLength(0);
  });

  it('duplicate adds a copy', async () => {
    useCharacterStore.setState({ characters: [makeCharacter()], status: 'success' });
    vi.spyOn(charactersApi, 'duplicate').mockResolvedValue({
      character: makeCharacter({ _id: 'c-copy' }),
    });
    await useCharacterStore.getState().duplicate('c1');
    expect(useCharacterStore.getState().characters.some((c) => c._id === 'c-copy')).toBe(true);
  });

  it('uploadAvatar updates avatarUrl', async () => {
    useCharacterStore.setState({ characters: [makeCharacter()], status: 'success' });
    vi.spyOn(charactersApi, 'uploadAvatar').mockResolvedValue({ avatarUrl: '/uploads/a.png' });
    const url = await useCharacterStore
      .getState()
      .uploadAvatar('c1', new File(['x'], 'a.png', { type: 'image/png' }));
    expect(url).toBe('/uploads/a.png');
    expect(useCharacterStore.getState().characters[0].avatarUrl).toBe('/uploads/a.png');
  });
});

// TICKET: character group store actions.
describe('character group store actions', () => {
  beforeEach(() => {
    useCharacterStore.setState({
      characters: [],
      status: 'success',
      error: null,
      groups: [],
      groupsStatus: 'idle',
      groupsError: null,
    });
    vi.restoreAllMocks();
  });
  afterEach(() => vi.restoreAllMocks());

  it('fetchGroups loads groups', async () => {
    vi.spyOn(characterGroupsApi, 'list').mockResolvedValue({ groups: [makeCharacterGroup()] });
    await useCharacterStore.getState().fetchGroups();
    expect(useCharacterStore.getState().groups).toHaveLength(1);
    expect(useCharacterStore.getState().groupsStatus).toBe('success');
  });

  it('fetchGroups failure sets groupsError', async () => {
    vi.spyOn(characterGroupsApi, 'list').mockRejectedValue(new Error('nope'));
    await useCharacterStore.getState().fetchGroups();
    expect(useCharacterStore.getState().groupsStatus).toBe('error');
    expect(useCharacterStore.getState().groupsError?.message).toBe('nope');
  });

  it('createGroup appends a group', async () => {
    vi.spyOn(characterGroupsApi, 'create').mockResolvedValue({
      group: makeCharacterGroup({ _id: 'g2', name: 'Rivals' }),
    });
    const group = await useCharacterStore.getState().createGroup('Rivals');
    expect(group._id).toBe('g2');
    expect(useCharacterStore.getState().groups[0].name).toBe('Rivals');
  });

  it('renameGroup updates a group name', async () => {
    useCharacterStore.setState({ groups: [makeCharacterGroup()] });
    vi.spyOn(characterGroupsApi, 'rename').mockResolvedValue({
      group: makeCharacterGroup({ name: 'Heroes II' }),
    });
    await useCharacterStore.getState().renameGroup('g1', 'Heroes II');
    expect(useCharacterStore.getState().groups[0].name).toBe('Heroes II');
  });

  it('removeGroup deletes a group and prunes groupIds from characters', async () => {
    useCharacterStore.setState({
      groups: [makeCharacterGroup()],
      characters: [makeCharacter({ groupIds: ['g1', 'keep'] })],
    });
    vi.spyOn(characterGroupsApi, 'remove').mockResolvedValue({ ok: true });
    await useCharacterStore.getState().removeGroup('g1');
    expect(useCharacterStore.getState().groups).toHaveLength(0);
    expect(useCharacterStore.getState().characters[0].groupIds).toEqual(['keep']);
  });

  it('setGroups replaces membership and updates the character', async () => {
    useCharacterStore.setState({ characters: [makeCharacter()], status: 'success' });
    vi.spyOn(charactersApi, 'setGroups').mockResolvedValue({
      character: makeCharacter({ _id: 'c1', groupIds: ['g9'] }),
    });
    await useCharacterStore.getState().setGroups('c1', ['g9']);
    expect(useCharacterStore.getState().characters[0].groupIds).toEqual(['g9']);
  });
});
