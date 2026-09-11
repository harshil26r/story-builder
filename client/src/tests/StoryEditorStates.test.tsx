import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { StoryEditor } from '../components/stories/StoryEditor';
import { useStoryStore } from '../store/storyStore';
import { storiesApi } from '../services/api';
import { makeLinearStory } from './fixtures';

// StoryEditor UI States — the component reads :id from the route and drives its
// four UI states through the story store (loading -> success/empty/error).
describe('StoryEditor UI States', () => {
  const renderEditor = () =>
    render(
      <MemoryRouter initialEntries={['/stories/story-1/manage']}>
        <Routes>
          <Route path="/stories/:id/manage" element={<StoryEditor />} />
        </Routes>
      </MemoryRouter>,
    );

  beforeEach(() => {
    useStoryStore.setState({
      stories: [],
      current: null,
      status: 'idle',
      error: null,
      conflict: null,
    });
    vi.restoreAllMocks();
  });
  afterEach(() => vi.restoreAllMocks());

  it('renders a loading indicator while the story is in flight', () => {
    useStoryStore.setState({ status: 'loading' });
    vi.spyOn(storiesApi, 'get').mockImplementation(
      () => new Promise(() => {}), // never resolves
    );
    renderEditor();

    expect(screen.getByRole('status', { name: 'Loading editor' })).toBeInTheDocument();
  });

  it('renders the happy path chapters on success', async () => {
    const story = makeLinearStory();
    vi.spyOn(storiesApi, 'get').mockResolvedValue(story);
    renderEditor();

    await waitFor(() => {
      expect(screen.getByTestId('chapter-title')).toHaveTextContent('The Keeper');
      expect(screen.getByTestId('chapter-page')).toBeInTheDocument();
    });
  });

  it('renders the editor shell with no chapters in the empty state', async () => {
    const emptyStory = makeLinearStory({ chapters: [], totalChapters: 0, wordCount: 0 });
    vi.spyOn(storiesApi, 'get').mockResolvedValue(emptyStory);
    renderEditor();

    expect(await screen.findByText(emptyStory.title)).toBeInTheDocument();
    expect(screen.getByText(/0 chapters/)).toBeInTheDocument();
    expect(screen.queryByTestId('chapter-page')).not.toBeInTheDocument();
  });

  it('renders error message and Retry button when the fetch fails', async () => {
    const err = new Error('Not found');
    (err as Error & { code?: string }).code = 'NOT_FOUND';
    vi.spyOn(storiesApi, 'get').mockRejectedValue(err);
    renderEditor();

    await waitFor(() => {
      expect(screen.getByTestId('error-alert')).toBeInTheDocument();
    });

    const retryBtn = screen.getByRole('button', { name: /retry/i });
    fireEvent.click(retryBtn);
    expect(storiesApi.get).toHaveBeenCalledTimes(2);
  });
});