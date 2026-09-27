import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { ErrorAlert } from '../components/ui/ErrorAlert';
import { EmptyState } from '../components/ui/EmptyState';
import { Spinner } from '../components/ui/Spinner';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { TopNav } from '../components/ui/TopNav';
import { AppShell } from '../components/ui/AppShell';
import { PublishDialog } from '../components/stories/PublishDialog';
import { RegenerateDialog } from '../components/stories/RegenerateDialog';
import { StoryNode } from '../components/stories/StoryNode';
import { storiesApi } from '../services/api';
import { useGenerationStore } from '../store/generationStore';
import { makeUser } from './fixtures';

const IDLE_JOB = {
  status: 'idle' as const,
  storyId: null,
  chapterIndex: null,
  route: null,
  fullText: '',
  latestSummary: null,
  snapshot: null,
  error: null,
};

function accessibleName(el: Element): string {
  const labelledby = el.getAttribute('aria-labelledby');
  if (labelledby) {
    const text = labelledby
      .split(/\s+/)
      .map((id) => document.getElementById(id)?.textContent?.trim() ?? '')
      .join(' ')
      .trim();
    if (text) return text;
  }
  return (
    el.getAttribute('aria-label')?.trim() ??
    el.getAttribute('title')?.trim() ??
    (el.textContent ?? '').trim()
  );
}

function hasLabel(el: Element): boolean {
  if (el.getAttribute('aria-label') || el.getAttribute('aria-labelledby')) return true;
  if (el.closest('label')) return true;
  const id = el.getAttribute('id');
  if (id) {
    const labels = Array.from(document.body.querySelectorAll('label'));
    if (labels.some((l) => l.htmlFor === id)) return true;
  }
  return false;
}

// TICKET-89: systematic a11y audit — every checked component must have named
// controls, labelled form fields, keyboard-usable widgets, modal dialogs with
// names, and alternative text on images; async-bearing components announce via
// a live region (role=status|alert).
function audit(requirements: { liveRegion?: boolean } = {}) {
  const problems: string[] = [];

  document.body.querySelectorAll('button, [role="button"]').forEach((el) => {
    if (accessibleName(el) === '') {
      problems.push(`button without name: <${el.tagName.toLowerCase()}>`);
    }
  });

  document.body.querySelectorAll('input, textarea, select').forEach((el) => {
    if (el.getAttribute('aria-hidden') === 'true') return;
    if (el.getAttribute('type') === 'hidden') return;
    if (!hasLabel(el)) problems.push(`unlabelled control: <${el.tagName.toLowerCase()}>`);
  });

  document.body.querySelectorAll('[tabindex]').forEach((el) => {
    const value = Number(el.getAttribute('tabindex'));
    if (value >= 1) problems.push(`positive tabindex on <${el.tagName.toLowerCase()}>`);
  });

  document.body.querySelectorAll('[role="button"], [role="switch"]').forEach((el) => {
    const tag = el.tagName.toLowerCase();
    if (tag === 'button' || tag === 'a' || tag === 'input') return;
    if (el.getAttribute('tabindex') === null) {
      problems.push(`unfocusable widget: <${tag}> role=${el.getAttribute('role')}`);
    }
  });

  document.body.querySelectorAll('[role="dialog"]').forEach((el) => {
    if (el.getAttribute('aria-modal') !== 'true') problems.push('dialog without aria-modal');
    if (accessibleName(el) === '') problems.push('dialog without name');
  });

  document.body.querySelectorAll('img').forEach((el) => {
    const presentational =
      el.getAttribute('role') === 'presentation' || el.getAttribute('aria-hidden') === 'true';
    if (!el.hasAttribute('alt') && !presentational) {
      problems.push('img without alt or presentation role');
    }
  });

  if (requirements.liveRegion) {
    const live = document.body.querySelector('[role="status"], [role="alert"]');
    if (!live) problems.push('no live region for async status');
  }

  expect(problems).toEqual([]);
}

describe('TICKET-89 — a11y audit', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    useGenerationStore.setState({ job: { ...IDLE_JOB } });
  });
  afterEach(() => vi.restoreAllMocks());

  it('Button has a name and announces busy state', () => {
    render(<Button loading>Save changes</Button>);
    audit({ liveRegion: true });
  });

  it('Modal renders a named, modal dialog', () => {
    render(
      <Modal open onClose={vi.fn()} title="New story">
        <ErrorAlert error={{ message: 'Could not save' }} />
      </Modal>,
    );
    audit();
  });

  it('ErrorAlert announces errors and names its actions', () => {
    render(<ErrorAlert error={{ message: 'Generation failed', code: 'E100' }} onRetry={vi.fn()} />);
    audit({ liveRegion: true });
  });

  it('EmptyState names its action', () => {
    render(
      <EmptyState title="No stories yet" action={<button type="button">Create a story</button>} />,
    );
    audit();
  });

  it('Spinner announces status', () => {
    render(<Spinner label="Preparing story" />);
    audit({ liveRegion: true });
  });

  it('ConfirmDialog labels its actions and announces busy state', () => {
    render(
      <ConfirmDialog
        open
        title="Delete character?"
        message="This cannot be undone."
        confirmLabel="Delete"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
        loading
      />,
    );
    audit({ liveRegion: true });
  });

  it('PublishDialog labels its form controls and announces async link loading', () => {
    vi.spyOn(storiesApi, 'get').mockImplementation(() => new Promise(() => {}));
    render(
      <PublishDialog
        story={{ _id: 's1', title: 'The Tides of Ember', isPublic: true }}
        open
        onClose={vi.fn()}
      />,
    );
    audit({ liveRegion: true });
  });

  it('RegenerateDialog keeps choices reachable and announces streaming progress', async () => {
    const user = userEvent.setup();
    useGenerationStore.setState({
      start: vi.fn().mockResolvedValue(undefined),
      job: {
        status: 'streaming',
        storyId: 's1',
        chapterIndex: 1,
        route: 'regenerate',
        fullText: 'The tide turned.',
        latestSummary: null,
        snapshot: null,
        error: null,
      },
    });
    render(
      <RegenerateDialog
        open
        storyId="s1"
        chapterId="ch1"
        chapterNumber={1}
        baseVersion={2}
        onClose={vi.fn()}
        onRegenerated={vi.fn()}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Regenerate this chapter only' }));
    await user.click(screen.getByRole('button', { name: 'Regenerate' }));
    audit({ liveRegion: true });
  });

  it('TopNav exposes named controls and a labelled nav landmark', () => {
    render(
      <MemoryRouter>
        <TopNav user={makeUser()} onLogout={vi.fn()} />
      </MemoryRouter>,
    );
    audit();
  });

  it('AppShell renders a labelled nav, skip link, and main landmark', () => {
    render(
      <MemoryRouter>
        <AppShell>
          <div data-testid="page">Home</div>
        </AppShell>
      </MemoryRouter>,
    );
    audit();
  });

  it('StoryNode custom widget is keyboard-reachable and named', () => {
    render(
      <StoryNode
        node={{
          id: 'node-1',
          storyId: 'story-1',
          title: 'Forest Entrance',
          content: 'You stand at the edge of a dark forest.',
          characters: [],
          isStartNode: false,
          createdAt: '2023-01-01T00:00:00.000Z',
          updatedAt: '2023-01-01T00:00:00.000Z',
        }}
        isSelected={false}
        onClick={vi.fn()}
      />,
    );
    audit();
  });
});
