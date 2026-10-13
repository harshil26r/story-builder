import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ExplorePage } from '../components/explore/ExplorePage';
import { exploreApi } from '../services/api';
import type { ExploreStory } from '../types/api';

function makeExploreStory(overrides: Partial<ExploreStory> = {}): ExploreStory {
  return {
    _id: 'pub-1',
    title: 'The Tides of Ember',
    premise: 'A smuggler sails a burning sea to save her sister.',
    genre: 'fantasy',
    tone: 'dark',
    targetAudience: 'adult',
    structureType: 'linear',
    generationMode: 'full-ai',
    status: 'complete',
    isPublic: true,
    shareToken: 'tok-abc',
    totalChapters: 12,
    wordCount: 42000,
    coverImageUrl: null,
    updatedAt: new Date('2026-01-01T00:00:00.000Z').toISOString(),
    ...overrides,
  };
}

function page(stories: ExploreStory[], extra = {}) {
  return { stories, total: stories.length, page: 1, limit: 12, hasMore: false, ...extra };
}

const renderPage = (initialEntries = ['/explore']) =>
  render(
    <MemoryRouter initialEntries={initialEntries}>
      <ExplorePage />
    </MemoryRouter>,
  );

// Public discovery surface: search + filter + read + remix (4 UI states).
describe('ExplorePage', () => {
  beforeEach(() => vi.restoreAllMocks());
  afterEach(() => vi.restoreAllMocks());

  it('renders skeleton cards while loading', () => {
    vi.spyOn(exploreApi, 'list').mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(screen.getAllByTestId('skeleton-card').length).toBeGreaterThan(0);
  });

  it('renders the grid and public cards on success', async () => {
    vi.spyOn(exploreApi, 'list').mockResolvedValue(page([makeExploreStory()]));
    renderPage();
    expect(await screen.findByTestId('explore-grid')).toBeInTheDocument();
    expect(screen.getByText('The Tides of Ember')).toBeInTheDocument();
    expect(screen.getByTestId('explore-card')).toBeInTheDocument();
    expect(screen.getByText(/42,000 words|42000 words|42k words/i)).toBeInTheDocument();
  });

  it('links Read to the public share token and Remix to the wizard', async () => {
    vi.spyOn(exploreApi, 'list').mockResolvedValue(page([makeExploreStory()]));
    renderPage();
    await screen.findByTestId('explore-grid');

    const readLink = screen.getByLabelText('Read The Tides of Ember').closest('a');
    expect(readLink).toHaveAttribute('href', '/s/tok-abc');

    const remixLink = screen.getByTestId('explore-remix-btn').closest('a');
    expect(remixLink).toHaveAttribute('href', '/stories/new');
  });

  it('renders the empty state when nothing matches', async () => {
    vi.spyOn(exploreApi, 'list').mockResolvedValue(page([]));
    renderPage();
    expect(await screen.findByTestId('explore-empty')).toBeInTheDocument();
  });

  it('renders an error alert with retry on failure', async () => {
    vi.spyOn(exploreApi, 'list').mockRejectedValue(new Error('boom'));
    renderPage();
    expect(await screen.findByTestId('error-alert')).toBeInTheDocument();
  });

  it('debounces the search box into a server query', async () => {
    const spy = vi.spyOn(exploreApi, 'list').mockResolvedValue(page([makeExploreStory()]));
    renderPage();
    await screen.findByTestId('explore-grid');

    const input = screen.getByTestId('explore-search');
    fireEvent.change(input, { target: { value: 'tides' } });

    await waitFor(
      () => expect(spy).toHaveBeenLastCalledWith(expect.objectContaining({ q: 'tides' })),
      { timeout: 1500 },
    );
  });

  it('initializes the search box from ?q=', async () => {
    const spy = vi.spyOn(exploreApi, 'list').mockResolvedValue(page([makeExploreStory()]));
    renderPage(['/explore?q=ember']);
    await waitFor(() =>
      expect(spy).toHaveBeenCalledWith(expect.objectContaining({ q: 'ember' })),
    );
  });
});
