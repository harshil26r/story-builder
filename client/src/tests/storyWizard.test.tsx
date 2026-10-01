import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { StoryWizard } from '../components/stories/StoryWizard';
import { useStoryStore } from '../store/storyStore';
import { useCharacterStore } from '../store/characterStore';
import { useUiStore } from '../store/uiStore';
import { useGenerationStore } from '../store/generationStore';
import { storiesApi, charactersApi } from '../services/api';
import { makeLinearStory, makeCharacter } from './fixtures';
import { AppError } from '../types/domain';
import type { LinearStory } from '../types/domain';
import type { StoryUpdateRequest } from '../types/api';

const PREMISE =
  'A lighthouse keeper on a frozen island discovers a journal that predicts the day everyone disappears.';

function typePremise(text: string) {
  fireEvent.change(screen.getByLabelText(/story premise/i), {
    target: { value: text },
  });
}

function renderWizard() {
  return render(
    <MemoryRouter>
      <StoryWizard />
    </MemoryRouter>,
  );
}

async function createStory() {
  typePremise(PREMISE);
  fireEvent.click(screen.getByTestId('wizard-next'));
  fireEvent.click(screen.getByTestId('wizard-next'));
  fireEvent.click(screen.getByTestId('generate-book-btn'));
  await act(async () => {});
}

const INITIAL_JOB = {
  status: 'idle' as const,
  storyId: null,
  chapterIndex: null,
  route: null,
  fullText: '',
  latestSummary: null,
  snapshot: null,
  error: null,
};

// TICKET-46: StoryWizard debounced autosave + step UI states.
describe('TICKET-46 — StoryWizard autosave', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.scrollTo = vi.fn();
    useStoryStore.setState({
      stories: [],
      current: null,
      status: 'idle',
      conflict: null,
      error: null,
    });
    useCharacterStore.setState({
      characters: [makeCharacter()],
      status: 'success',
      error: null,
    });
    useUiStore.setState({ readingMode: 'night', darkMode: true });
    useGenerationStore.setState({ job: { ...INITIAL_JOB } });
    vi.restoreAllMocks();
    vi.spyOn(charactersApi, 'list').mockResolvedValue({
      characters: [makeCharacter()],
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('does not autosave before the story exists', async () => {
    const updateSpy = vi
      .spyOn(storiesApi, 'update')
      .mockResolvedValue({ story: makeLinearStory() });

    renderWizard();
    typePremise(PREMISE);
    await act(async () => {
      vi.advanceTimersByTime(5000);
    });
    expect(updateSpy).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId('wizard-next'));
    fireEvent.change(screen.getByLabelText(/genre/i), {
      target: { value: 'noir' },
    });
    await act(async () => {
      vi.advanceTimersByTime(5000);
    });
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it('autosaves edits with a debounce once the story exists', async () => {
    const story = makeLinearStory();
    const createSpy = vi.spyOn(storiesApi, 'create').mockResolvedValue({ story });
    const updateSpy = vi.spyOn(storiesApi, 'update').mockResolvedValue({ story });

    renderWizard();
    await createStory();

    expect(createSpy).toHaveBeenCalledTimes(1);

    await act(async () => {
      vi.advanceTimersByTime(5000);
    });
    expect(updateSpy).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId('wizard-back'));
    fireEvent.click(screen.getByTestId('wizard-back'));
    fireEvent.click(screen.getByTestId('wizard-back'));

    const edited = PREMISE + ' The tide rises.';
    typePremise(edited);

    await act(async () => {
      vi.advanceTimersByTime(599);
    });
    expect(updateSpy).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(1);
    });
    expect(updateSpy).toHaveBeenCalledTimes(1);
    const patch = updateSpy.mock.calls[0][1] as StoryUpdateRequest;
    expect(patch.premise).toBe(edited);
    expect(patch.pov).toBe('3rd');
    expect(patch.generationMode).toBe('full-ai');
    expect(patch.characterIds).toEqual([]);

    fireEvent.click(screen.getByTestId('wizard-next'));
    fireEvent.change(screen.getByLabelText(/genre/i), {
      target: { value: 'noir' },
    });
    await act(async () => {
      vi.advanceTimersByTime(600);
    });
    expect(updateSpy).toHaveBeenCalledTimes(2);
    const patch2 = updateSpy.mock.calls[1][1] as StoryUpdateRequest;
    expect(patch2.genre).toBe('noir');

    await act(async () => {
      vi.advanceTimersByTime(600);
    });
    expect(updateSpy).toHaveBeenCalledTimes(2);
  });

  it('shows Saving… while in flight then Saved afterwards', async () => {
    const story = makeLinearStory();
    vi.spyOn(storiesApi, 'create').mockResolvedValue({ story });
    let resolveUpdate: ((value: { story: LinearStory }) => void) | undefined;
    vi.spyOn(storiesApi, 'update').mockImplementation(
      () =>
        new Promise<{ story: LinearStory }>((res) => {
          resolveUpdate = res;
        }),
    );

    renderWizard();
    await createStory();

    fireEvent.click(screen.getByTestId('wizard-back'));
    fireEvent.click(screen.getByTestId('wizard-back'));
    fireEvent.click(screen.getByTestId('wizard-back'));
    const edited = PREMISE + ' The tide rises.';
    typePremise(edited);

    await act(async () => {
      vi.advanceTimersByTime(600);
    });
    expect(screen.getByTestId('autosave-status')).toHaveTextContent('Saving');

    await act(async () => {
      resolveUpdate?.({ story: makeLinearStory({ premise: edited }) });
    });
    expect(screen.getByTestId('autosave-status')).toHaveTextContent('Saved');
  });

  it('surfaces autosave errors and retries the last failed patch', async () => {
    const story = makeLinearStory();
    vi.spyOn(storiesApi, 'create').mockResolvedValue({ story });
    const updateSpy = vi
      .spyOn(storiesApi, 'update')
      .mockRejectedValue(new AppError('INTERNAL_ERROR', 'Save failed'));

    renderWizard();
    await createStory();

    fireEvent.click(screen.getByTestId('wizard-back'));
    fireEvent.click(screen.getByTestId('wizard-back'));
    fireEvent.click(screen.getByTestId('wizard-back'));
    const edited = PREMISE + ' The tide rises.';
    typePremise(edited);

    await act(async () => {
      vi.advanceTimersByTime(600);
    });
    await act(async () => {});
    expect(updateSpy).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('error-alert')).toBeInTheDocument();
    expect(screen.getByText('Save failed')).toBeInTheDocument();

    updateSpy.mockResolvedValue({ story: makeLinearStory({ premise: edited }) });
    fireEvent.click(screen.getByRole('button', { name: /retry/i }));
    await act(async () => {});
    expect(updateSpy).toHaveBeenCalledTimes(2);
    expect(screen.queryByTestId('error-alert')).not.toBeInTheDocument();
    expect(screen.getByTestId('autosave-status')).toHaveTextContent('Saved');
  });
});

describe('TICKET-46 — StoryWizard 4 UI states (characters step)', () => {
  beforeEach(() => {
    useStoryStore.setState({
      stories: [],
      current: null,
      status: 'idle',
      conflict: null,
      error: null,
    });
    useCharacterStore.setState({ characters: [], status: 'idle', error: null });
    useUiStore.setState({ readingMode: 'night', darkMode: true });
    useGenerationStore.setState({ job: { ...INITIAL_JOB } });
    vi.restoreAllMocks();
    vi.spyOn(charactersApi, 'list').mockResolvedValue({
      characters: [makeCharacter()],
    });
    window.scrollTo = vi.fn();
  });

  afterEach(() => vi.restoreAllMocks());

  const goToStep3 = () => {
    typePremise(PREMISE);
    fireEvent.click(screen.getByTestId('wizard-next'));
    fireEvent.click(screen.getByTestId('wizard-next'));
  };

  it('loading state shows a spinner', async () => {
    useCharacterStore.setState({
      characters: [makeCharacter()],
      status: 'loading',
      error: null,
    });
    renderWizard();
    goToStep3();
    expect(screen.getByRole('status', { name: /loading characters/i })).toBeInTheDocument();
  });

  it('error state shows an ErrorAlert', async () => {
    useCharacterStore.setState({
      characters: [],
      status: 'error',
      error: new AppError('X', 'Boom'),
    });
    vi.spyOn(charactersApi, 'list').mockRejectedValue(new AppError('X', 'Boom'));
    renderWizard();
    goToStep3();
    await act(async () => {});
    expect(screen.getByTestId('error-alert')).toBeInTheDocument();
    expect(screen.getByText('Boom')).toBeInTheDocument();
  });

  it('empty state shows a create-characters CTA', async () => {
    useCharacterStore.setState({
      characters: [],
      status: 'empty',
      error: null,
    });
    vi.spyOn(charactersApi, 'list').mockResolvedValue({ characters: [] });
    renderWizard();
    goToStep3();
    await act(async () => {});
    expect(screen.getByTestId('characters-empty')).toBeInTheDocument();
    expect(screen.getByTestId('characters-create-cta')).toBeInTheDocument();
  });

  it('success state shows the characters list interactively', async () => {
    useCharacterStore.setState({
      characters: [makeCharacter()],
      status: 'success',
      error: null,
    });
    renderWizard();
    goToStep3();
    expect(screen.getByTestId('characters-step')).toBeInTheDocument();
    expect(screen.getByText('Elara')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('character-toggle-c1'));
    expect(screen.getByText('Choose characters (1 selected)')).toBeInTheDocument();
  });
});
