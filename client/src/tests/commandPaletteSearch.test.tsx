import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CommandPalette } from '../components/ui/CommandPalette';
import { exploreApi } from '../services/api';
import { useStoryStore } from '../store/storyStore';
import { useCharacterStore } from '../store/characterStore';
import type { ExploreStory } from '../types/api';

const publicStory: ExploreStory = {
  _id: 'pub-1',
  title: 'The Tides of Ember',
  premise: 'A smuggler sails a burning sea.',
  genre: 'fantasy',
  tone: 'dark',
  targetAudience: 'adult',
  structureType: 'linear',
  generationMode: 'full-ai',
  status: 'complete',
  isPublic: true,
  shareToken: 'tok-abc',
  totalChapters: 5,
  wordCount: 9000,
  coverImageUrl: null,
  updatedAt: new Date('2026-01-01T00:00:00.000Z').toISOString(),
};

const renderPalette = () =>
  render(
    <MemoryRouter>
      <CommandPalette open onClose={() => {}} />
    </MemoryRouter>,
  );

// The command palette augments local hits with a server-backed Explore search.
describe('CommandPalette — server-backed book search', () => {
  beforeEach(() => {
    useStoryStore.setState({ stories: [], status: 'idle', error: null, conflict: null, current: null });
    useCharacterStore.setState({ characters: [], status: 'idle', error: null });
    vi.restoreAllMocks();
  });
  afterEach(() => vi.restoreAllMocks());

  it('queries the public catalog and renders Community Books for 2+ characters', async () => {
    const spy = vi
      .spyOn(exploreApi, 'list')
      .mockResolvedValue({ stories: [publicStory], total: 1, page: 1, limit: 5, hasMore: false });

    renderPalette();
    fireEvent.change(screen.getByPlaceholderText(/search stories/i), { target: { value: 'ti' } });

    expect(await screen.findByText('Community Books')).toBeInTheDocument();
    expect(await screen.findByText('The Tides of Ember')).toBeInTheDocument();
    await waitFor(() => expect(spy).toHaveBeenCalledWith(expect.objectContaining({ q: 'ti' })));
  });

  it('does not query the server for a single character', async () => {
    const spy = vi.spyOn(exploreApi, 'list');
    renderPalette();
    fireEvent.change(screen.getByPlaceholderText(/search stories/i), { target: { value: 't' } });
    expect(screen.queryByText('Community Books')).not.toBeInTheDocument();
    expect(spy).not.toHaveBeenCalled();
  });
});
