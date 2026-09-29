import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import type { RegenerateDialogProps } from '../components/stories/RegenerateDialog';
import { RegenerateDialog } from '../components/stories/RegenerateDialog';
import { useGenerationStore } from '../store/generationStore';

// TICKET-59: Regenerate UI (only/onward) — dialog options, drift warning,
// baseVersion pass-through, streaming progress, and cancel (ACR-F-10).

const EMPTY_JOB = {
  status: 'idle' as const,
  storyId: null,
  chapterIndex: null,
  route: null,
  fullText: '',
  latestSummary: null,
  snapshot: null,
  error: null,
};

const REAL_START = useGenerationStore.getState().start;
const REAL_ABORT = useGenerationStore.getState().abort;

function renderDialog(overrides: Partial<RegenerateDialogProps> = {}) {
  const props: RegenerateDialogProps = {
    open: true,
    storyId: 's1',
    chapterId: 'ch1',
    chapterNumber: 1,
    baseVersion: 3,
    onClose: vi.fn(),
    onRegenerated: vi.fn(),
    ...overrides,
  };
  render(<RegenerateDialog {...props} />);
  return props;
}

describe('RegenerateDialog (TICKET-59)', () => {
  beforeEach(() => {
    useGenerationStore.setState({ job: { ...EMPTY_JOB }, start: REAL_START, abort: REAL_ABORT });
    vi.restoreAllMocks();
  });
  afterEach(() => vi.restoreAllMocks());

  it('opens as an accessible dialog showing the two regeneration options', () => {
    renderDialog();
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(
      screen.getByRole('button', { name: 'Regenerate this chapter only' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Regenerate this chapter and all onward' }),
    ).toBeInTheDocument();
  });

  it('shows the drift warning only when "onward" is selected', async () => {
    const user = userEvent.setup();
    renderDialog({ chapterNumber: 2 });

    expect(screen.queryByTestId('regenerate-onward-warning')).not.toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: 'Regenerate this chapter and all onward' }),
    );
    expect(screen.getByTestId('regenerate-onward-warning')).toHaveTextContent(
      'Chapters after 2 may diverge from the original',
    );

    await user.click(screen.getByRole('button', { name: 'Regenerate this chapter only' }));
    expect(screen.queryByTestId('regenerate-onward-warning')).not.toBeInTheDocument();
  });

  it('passes baseVersion and the chosen mode when confirming', async () => {
    const user = userEvent.setup();
    const start = vi.fn().mockResolvedValue(undefined);
    useGenerationStore.setState({ start });
    renderDialog({ baseVersion: 7 });

    await user.click(
      screen.getByRole('button', { name: 'Regenerate this chapter and all onward' }),
    );
    await user.click(screen.getByRole('button', { name: 'Regenerate' }));

    expect(start).toHaveBeenCalledWith('regenerate', 's1', {
      chapterId: 'ch1',
      mode: 'onward',
      baseVersion: 7,
    });
  });

  it('streams progress text bound to the generation store during regeneration', async () => {
    const user = userEvent.setup();
    const start = vi.fn().mockResolvedValue(undefined);
    useGenerationStore.setState({
      start,
      job: {
        ...EMPTY_JOB,
        status: 'streaming',
        storyId: 's1',
        chapterIndex: 1,
        route: 'regenerate',
        fullText: 'The lighthouse blazed.',
      },
    });
    renderDialog();

    await user.click(screen.getByRole('button', { name: 'Regenerate this chapter only' }));
    await user.click(screen.getByRole('button', { name: 'Regenerate' }));

    expect(start).toHaveBeenCalledWith('regenerate', 's1', {
      chapterId: 'ch1',
      mode: 'only',
      baseVersion: 3,
    });

    const progress = screen.getByTestId('regenerate-progress');
    expect(progress).toHaveTextContent('The lighthouse blazed.');
    expect(screen.getByRole('button', { name: /stop/i })).toBeInTheDocument();
  });

  it('cancels an in-flight regeneration and closes', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const abort = vi.fn();
    useGenerationStore.setState({
      start: vi.fn().mockResolvedValue(undefined),
      abort,
      job: {
        ...EMPTY_JOB,
        status: 'streaming',
        storyId: 's1',
        chapterIndex: 1,
        route: 'regenerate',
        fullText: 'half-written',
      },
    });
    renderDialog({ onClose });

    await user.click(screen.getByRole('button', { name: 'Regenerate this chapter only' }));
    await user.click(screen.getByRole('button', { name: 'Regenerate' }));
    await user.click(screen.getByRole('button', { name: /stop/i }));

    expect(abort).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('notifies onRegenerated when the regenerate job completes', async () => {
    const user = userEvent.setup();
    const onRegenerated = vi.fn();
    const start = vi.fn(() => {
      useGenerationStore.setState({
        job: {
          ...EMPTY_JOB,
          status: 'done',
          storyId: 's1',
          chapterIndex: 1,
          route: 'regenerate',
          fullText: 'A freshly rewritten chapter.',
        },
      });
      return Promise.resolve();
    });
    useGenerationStore.setState({ start });
    renderDialog({ onRegenerated });

    await user.click(screen.getByRole('button', { name: 'Regenerate this chapter only' }));
    await user.click(screen.getByRole('button', { name: 'Regenerate' }));

    await waitFor(() => expect(onRegenerated).toHaveBeenCalledTimes(1));
  });
});
