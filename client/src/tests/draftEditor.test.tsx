import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DraftEditor } from '../components/stories/DraftEditor';
import { PolishDiff } from '../components/stories/PolishDiff';
import { useGenerationStore } from '../store/generationStore';
import { makeChapter } from './fixtures';

// TICKET-77: AI-enhanced mode — draft editing, polish streaming, diff view,
// accept/reject, and version history (ACR-F-10).

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

describe('DraftEditor + PolishDiff (TICKET-77)', () => {
  beforeEach(() => {
    useGenerationStore.setState({ job: { ...EMPTY_JOB }, start: REAL_START });
    vi.restoreAllMocks();
  });
  afterEach(() => vi.restoreAllMocks());

  it('shows an editable textarea seeded with the current draft/content', () => {
    const chapter = makeChapter({ content: 'Raw draft text.' });
    render(<DraftEditor storyId="s1" chapter={chapter} />);
    const textarea = screen.getByRole('textbox', { name: /edit chapter 1/i });
    expect(textarea).toHaveValue('Raw draft text.');
  });

  it('reports edits through onEditDraft', () => {
    const onEditDraft = vi.fn();
    const chapter = makeChapter({ content: 'Raw draft text.' });
    render(<DraftEditor storyId="s1" chapter={chapter} onEditDraft={onEditDraft} />);
    fireEvent.change(screen.getByRole('textbox', { name: /edit chapter 1/i }), {
      target: { value: 'Raw draft text. More.' },
    });
    expect(onEditDraft).toHaveBeenCalledWith('Raw draft text. More.');
  });

  it('lists previous versions with timestamps', () => {
    const chapter = makeChapter({
      version: 2,
      versions: [
        {
          version: 1,
          content: 'v1',
          summary: 's',
          modifiedAt: '2026-01-01T10:00:00.000Z',
          mode: 'ai',
        },
        {
          version: 2,
          content: 'v2',
          summary: 's',
          modifiedAt: '2026-01-02T10:00:00.000Z',
          mode: 'user',
        },
      ],
    });
    render(<DraftEditor storyId="s1" chapter={chapter} />);
    const history = screen.getByTestId('version-history');
    expect(within(history).getByText(/v1/)).toBeInTheDocument();
    expect(within(history).getByText(/v2/)).toBeInTheDocument();
  });

  it('polish button starts the polish SSE job', () => {
    const start = vi.fn().mockResolvedValue(undefined);
    useGenerationStore.setState({ start });
    render(<DraftEditor storyId="s1" chapter={makeChapter()} />);
    fireEvent.click(screen.getByRole('button', { name: /polish draft/i }));
    expect(start).toHaveBeenCalledWith('polish', 's1', { storyId: 's1', chapterIndex: 1 });
  });

  it('streams polished text live while the polish job runs', () => {
    useGenerationStore.setState({
      job: {
        ...EMPTY_JOB,
        status: 'streaming',
        storyId: 's1',
        chapterIndex: 1,
        fullText: 'Polished so far',
      },
    });
    render(<DraftEditor storyId="s1" chapter={makeChapter()} />);
    expect(screen.getByTestId('polish-stream')).toHaveTextContent('Polished so far');
  });

  it('shows the diff on completion; Accept forwards the polished text', () => {
    const onAcceptPolish = vi.fn();
    useGenerationStore.setState({
      job: {
        ...EMPTY_JOB,
        status: 'done',
        storyId: 's1',
        chapterIndex: 1,
        fullText: 'Polished prose.',
      },
    });
    render(
      <DraftEditor
        storyId="s1"
        chapter={makeChapter({ content: 'Raw draft.' })}
        onAcceptPolish={onAcceptPolish}
      />,
    );

    expect(screen.getByTestId('polish-diff')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /accept polish/i }));
    expect(onAcceptPolish).toHaveBeenCalledWith('Polished prose.');
  });

  it('Reject keeps the original draft and notifies the parent', () => {
    const onRejectPolish = vi.fn();
    useGenerationStore.setState({
      job: {
        ...EMPTY_JOB,
        status: 'done',
        storyId: 's1',
        chapterIndex: 1,
        fullText: 'Polished prose.',
      },
    });
    render(
      <DraftEditor
        storyId="s1"
        chapter={makeChapter({ content: 'Raw draft.' })}
        onRejectPolish={onRejectPolish}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /keep draft/i }));
    expect(onRejectPolish).toHaveBeenCalled();
    expect(screen.getByRole('textbox', { name: /edit chapter 1/i })).toHaveValue('Raw draft.');
  });

  it('PolishDiff marks added and removed words', () => {
    render(
      <PolishDiff
        original="the quick fox"
        polished="the very quick fox"
        onAccept={() => {}}
        onReject={() => {}}
      />,
    );
    expect(screen.getByTestId('polish-diff')).toBeInTheDocument();
    expect(screen.getByText('very')).toHaveAttribute('data-diff', 'add');
    expect(screen.getByRole('button', { name: /accept polish/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /keep draft/i })).toBeInTheDocument();
  });
});
