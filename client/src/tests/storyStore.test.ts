import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useStoryStore } from '../store/storyStore';
import { storiesApi } from '../services/api';
import { makeStorySummary, makeLinearStory } from './fixtures';

// TICKET-44: Story Zustand store.
describe('TICKET-44 — story store', () => {
  beforeEach(() => {
    useStoryStore.setState({
      stories: [],
      current: null,
      status: 'idle',
      conflict: null,
      error: null,
    });
    vi.restoreAllMocks();
  });
  afterEach(() => vi.restoreAllMocks());

  it('fetchList maps summaries and sets empty/success', async () => {
    vi.spyOn(storiesApi, 'list').mockResolvedValue({ stories: [makeStorySummary()] });
    await useStoryStore.getState().fetchList();
    expect(useStoryStore.getState().stories).toHaveLength(1);
    expect(useStoryStore.getState().status).toBe('success');

    useStoryStore.setState({ stories: [], status: 'idle' });
    vi.spyOn(storiesApi, 'list').mockResolvedValue({ stories: [] });
    await useStoryStore.getState().fetchList();
    expect(useStoryStore.getState().status).toBe('empty');
  });

  it('fetchOne loads current story', async () => {
    vi.spyOn(storiesApi, 'get').mockResolvedValue(makeLinearStory());
    await useStoryStore.getState().fetchOne('s1');
    expect(useStoryStore.getState().current?._id).toBe('s1');
    expect(useStoryStore.getState().status).toBe('success');
  });

  it('create returns story id and prepends summary', async () => {
    const story = makeLinearStory();
    vi.spyOn(storiesApi, 'create').mockResolvedValue({ story });
    const id = await useStoryStore.getState().create({
      title: story.title,
      premise: story.premise,
      pov: '3rd',
      structureType: 'linear',
      generationMode: 'full-ai',
      characterIds: [],
    });
    expect(id).toBe('s1');
    expect(useStoryStore.getState().stories[0]._id).toBe('s1');
  });

  it('update with silent flag does not toast; CONFLICT sets conflict state', async () => {
    useStoryStore.setState({ current: makeLinearStory(), status: 'success' });
    vi.spyOn(storiesApi, 'update').mockResolvedValue({
      story: makeLinearStory({ title: 'Renamed' }),
    });
    await useStoryStore.getState().update('s1', { title: 'Renamed' }, { silent: true });
    expect(useStoryStore.getState().current?.title).toBe('Renamed');
    expect(useStoryStore.getState().conflict).toBeNull();

    // Conflict
    vi.spyOn(storiesApi, 'update').mockRejectedValue({
      name: 'AppError',
      code: 'CONFLICT',
      message: 'Version mismatch',
    });
    await expect(
      useStoryStore.getState().update('s1', { title: 'x' }, { silent: true }),
    ).rejects.toThrow();
    expect(useStoryStore.getState().conflict?.storyId).toBe('s1');
  });

  it('publish toggles isPublic and shareToken', async () => {
    useStoryStore.setState({
      current: makeLinearStory(),
      stories: [makeStorySummary()],
      status: 'success',
    });
    vi.spyOn(storiesApi, 'publish').mockResolvedValue({ isPublic: true, shareToken: 'tok' });
    await useStoryStore.getState().publish('s1', true);
    expect(useStoryStore.getState().current?.isPublic).toBe(true);
    expect(useStoryStore.getState().current?.shareToken).toBe('tok');
  });

  it('remove deletes story from list', async () => {
    useStoryStore.setState({ stories: [makeStorySummary()], status: 'success' });
    vi.spyOn(storiesApi, 'remove').mockResolvedValue({ ok: true });
    await useStoryStore.getState().remove('s1');
    expect(useStoryStore.getState().stories).toHaveLength(0);
  });

  it('fetchList failure sets error status', async () => {
    vi.spyOn(storiesApi, 'list').mockRejectedValue(new Error('down'));
    await useStoryStore.getState().fetchList();
    expect(useStoryStore.getState().status).toBe('error');
  });
});
