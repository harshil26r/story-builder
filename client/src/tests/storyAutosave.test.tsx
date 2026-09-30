import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { StoryEditor } from '../components/stories/StoryEditor';
import { useStoryStore } from '../store/storyStore';
import { useUiStore } from '../store/uiStore';
import { storiesApi } from '../services/api';
import { makeLinearStory, makeChapter } from './fixtures';

const AUTOSAVE_MS = 800;

// TICKET-58: StoryEditor autosave now persists chapter content for real — the
// debounced patch hits storiesApi.saveChapter (not the old premise workaround),
// a 409 CONFLICT drives the conflict banner, and network errors keep the patch
// pending behind an error alert with retry.
describe('StoryEditor autosave (TICKET-58)', () => {
  const renderEditor = () =>
    render(
      <MemoryRouter initialEntries={['/stories/s1/manage']}>
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
    useUiStore.setState({ readerMode: 'edit' });
    vi.restoreAllMocks();
  });

  afterEach(() => {
    useUiStore.setState({ readerMode: 'read' });
    vi.restoreAllMocks();
  });

  it('debounces an edit into a single saveChapter(content, baseVersion) and shows saving → saved', async () => {
    useStoryStore.setState({ current: makeLinearStory(), status: 'success' });
    const saveChapter = vi.spyOn(storiesApi, 'saveChapter').mockResolvedValue({
      chapter: makeChapter({ content: 'The keeper burned the journal.', version: 2 }),
    });
    renderEditor();

    const ta = screen.getByTestId('chapter-editor-1');
    fireEvent.change(ta, { target: { value: 'The keeper burned the journal.' } });
    expect(screen.getByTestId('autosave-status')).toHaveTextContent('saving');

    await waitFor(
      () =>
        expect(saveChapter).toHaveBeenCalledWith('s1', 'ch1', {
          content: 'The keeper burned the journal.',
          baseVersion: 1,
        }),
      { timeout: AUTOSAVE_MS * 3 },
    );
    expect(saveChapter).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.getByTestId('autosave-status')).toHaveTextContent('saved'), {
      timeout: AUTOSAVE_MS * 3,
    });
  });

  it('resets the debounce window on further edits — one save carrying the latest text', async () => {
    useStoryStore.setState({ current: makeLinearStory(), status: 'success' });
    const saveChapter = vi
      .spyOn(storiesApi, 'saveChapter')
      .mockResolvedValue({ chapter: makeChapter() });
    renderEditor();

    const ta = screen.getByTestId('chapter-editor-1');
    fireEvent.change(ta, { target: { value: 'first draft' } });
    await new Promise((resolve) => setTimeout(resolve, 300));
    fireEvent.change(ta, { target: { value: 'second draft' } });
    fireEvent.change(ta, { target: { value: 'final draft' } });

    await waitFor(() => expect(saveChapter).toHaveBeenCalledTimes(1), { timeout: AUTOSAVE_MS * 3 });
    expect(saveChapter).toHaveBeenCalledWith('s1', 'ch1', {
      content: 'final draft',
      baseVersion: 1,
    });
  });

  it('uses the server-bumped version for the next autosave', async () => {
    useStoryStore.setState({ current: makeLinearStory(), status: 'success' });
    const saveChapter = vi
      .spyOn(storiesApi, 'saveChapter')
      .mockResolvedValue({ chapter: makeChapter({ content: 'first save', version: 2 }) });
    renderEditor();

    const ta = screen.getByTestId('chapter-editor-1');
    fireEvent.change(ta, { target: { value: 'first save' } });
    await waitFor(() => expect(saveChapter).toHaveBeenCalledTimes(1), { timeout: AUTOSAVE_MS * 3 });
    await waitFor(() => expect(screen.getByTestId('autosave-status')).toHaveTextContent('saved'), {
      timeout: AUTOSAVE_MS * 3,
    });

    fireEvent.change(ta, { target: { value: 'second save' } });
    await waitFor(
      () =>
        expect(saveChapter).toHaveBeenLastCalledWith('s1', 'ch1', {
          content: 'second save',
          baseVersion: 2,
        }),
      { timeout: AUTOSAVE_MS * 3 },
    );
  });

  it('surfaces the conflict banner on 409 and "Open latest" refetches the story', async () => {
    useStoryStore.setState({ current: makeLinearStory(), status: 'success' });
    const get = vi.spyOn(storiesApi, 'get').mockResolvedValue(makeLinearStory());
    vi.spyOn(storiesApi, 'saveChapter').mockRejectedValue({
      code: 'CONFLICT',
      message: 'This chapter was edited elsewhere. Reload to see the latest version.',
    });
    renderEditor();

    const ta = screen.getByTestId('chapter-editor-1');
    fireEvent.change(ta, { target: { value: 'my edit' } });

    await waitFor(() => expect(screen.getByTestId('conflict-banner')).toBeInTheDocument(), {
      timeout: AUTOSAVE_MS * 3,
    });
    expect(screen.getByText('This chapter changed on another device')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('conflict-open-latest'));
    await waitFor(() => expect(get).toHaveBeenCalledTimes(1), { timeout: AUTOSAVE_MS * 3 });
    expect(get).toHaveBeenCalledWith('s1', { withVersions: true });
  });

  it('network error keeps the draft + pending patch; retry re-sends it', async () => {
    useStoryStore.setState({ current: makeLinearStory(), status: 'success' });
    const saveChapter = vi
      .spyOn(storiesApi, 'saveChapter')
      .mockRejectedValue(new Error('Network down'));
    renderEditor();

    const ta = screen.getByTestId('chapter-editor-1');
    fireEvent.change(ta, { target: { value: 'Will this persist?' } });

    await waitFor(() => expect(screen.getByTestId('error-alert')).toBeInTheDocument(), {
      timeout: AUTOSAVE_MS * 3,
    });
    expect(ta).toHaveValue('Will this persist?');
    expect(saveChapter).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: /retry/i }));
    await waitFor(() => expect(saveChapter).toHaveBeenCalledTimes(2), { timeout: AUTOSAVE_MS * 3 });
    expect(saveChapter).toHaveBeenLastCalledWith('s1', 'ch1', {
      content: 'Will this persist?',
      baseVersion: 1,
    });
  });
});
