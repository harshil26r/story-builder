import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PublishDialog } from '../components/stories/PublishDialog';
import { StoriesDashboard } from '../components/stories/StoriesDashboard';
import { useStoryStore } from '../store/storyStore';
import { storiesApi } from '../services/api';
import { AppError } from '../types/domain';
import { makeLinearStory, makeStorySummary } from './fixtures';

// TICKET-83: Publish dialog + share link.
describe('TICKET-83 — PublishDialog', () => {
  beforeEach(() => {
    useStoryStore.setState({
      stories: [],
      current: null,
      status: 'idle',
      error: null,
      conflict: null,
    });
    vi.restoreAllMocks();
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
  });
  afterEach(() => vi.restoreAllMocks());

  function renderDialog(story: { _id: string; title: string; isPublic: boolean }) {
    return render(<PublishDialog story={story} open onClose={vi.fn()} />);
  }

  it('renders as an accessible labelled modal dialog', () => {
    renderDialog({ _id: 's1', title: 'The Tides of Ember', isPublic: false });
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByRole('switch')).toBeInTheDocument();
    expect(screen.getByText('The Tides of Ember')).toBeInTheDocument();
  });

  it('toggles isPublic via publish(id, isPublic) and shows shareable URL when published', async () => {
    vi.spyOn(storiesApi, 'publish').mockResolvedValue({ isPublic: true, shareToken: 'tok123' });
    renderDialog({ _id: 's1', title: 'The Tides of Ember', isPublic: false });

    fireEvent.click(screen.getByRole('switch'));
    fireEvent.click(screen.getByRole('button', { name: 'Publish' }));

    expect(storiesApi.publish).toHaveBeenCalledWith('s1', true);
    await waitFor(() => {
      expect(screen.getByDisplayValue(`${window.location.origin}/s/tok123`)).toBeInTheDocument();
    });
  });

  it('shows shareable URL in the <origin>/s/<shareToken> format when story is already published', async () => {
    vi.spyOn(storiesApi, 'get').mockResolvedValue(
      makeLinearStory({ isPublic: true, shareToken: 'fancy-token' }),
    );
    renderDialog({ _id: 's1', title: 'The Tides of Ember', isPublic: true });

    expect(screen.getByText('Loading link…')).toBeInTheDocument();
    const url = await screen.findByDisplayValue(`${window.location.origin}/s/fancy-token`);
    expect(url).toHaveValue(`${window.location.origin}/s/fancy-token`);
  });

  it('copies the shareable link to the clipboard', async () => {
    vi.spyOn(storiesApi, 'get').mockResolvedValue(
      makeLinearStory({ isPublic: true, shareToken: 'tokcp' }),
    );
    renderDialog({ _id: 's1', title: 'The Tides of Ember', isPublic: true });

    const copyBtn = await screen.findByRole('button', { name: /copy link/i });
    fireEvent.click(copyBtn);

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        `${window.location.origin}/s/tokcp`,
      );
    });
    expect(screen.getByText('Copied')).toBeInTheDocument();
  });

  it('shows an Unpublish option when published and unpublishes via publish(id, false)', async () => {
    vi.spyOn(storiesApi, 'get').mockResolvedValue(
      makeLinearStory({ isPublic: true, shareToken: 'tokun' }),
    );
    vi.spyOn(storiesApi, 'publish').mockResolvedValue({ isPublic: false, shareToken: '' });
    renderDialog({ _id: 's1', title: 'The Tides of Ember', isPublic: true });

    await screen.findByDisplayValue(`${window.location.origin}/s/tokun`);
    fireEvent.click(screen.getByRole('button', { name: 'Unpublish' }));

    await waitFor(() => {
      expect(storiesApi.publish).toHaveBeenCalledWith('s1', false);
    });
    await waitFor(() => {
      expect(
        screen.queryByDisplayValue(`${window.location.origin}/s/tokun`),
      ).not.toBeInTheDocument();
    });
  });

  it('disables controls while the publish request is in flight', async () => {
    let resolvePublish!: (v: { isPublic: boolean; shareToken: string }) => void;
    vi.spyOn(storiesApi, 'publish').mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvePublish = resolve;
        }),
    );
    renderDialog({ _id: 's1', title: 'The Tides of Ember', isPublic: false });

    fireEvent.click(screen.getByRole('switch'));
    const confirm = screen.getByRole('button', { name: 'Publish' });
    fireEvent.click(confirm);

    expect(confirm).toBeDisabled();
    expect(screen.getByRole('switch')).toBeDisabled();

    resolvePublish({ isPublic: true, shareToken: 'tokbusy' });
    await waitFor(() => {
      expect(screen.getByDisplayValue(`${window.location.origin}/s/tokbusy`)).toBeInTheDocument();
    });
  });

  it('shows an ErrorAlert when the publish request fails', async () => {
    vi.spyOn(storiesApi, 'publish').mockRejectedValue(new AppError('SERVER', 'Publish failed'));
    renderDialog({ _id: 's1', title: 'The Tides of Ember', isPublic: false });

    fireEvent.click(screen.getByRole('switch'));
    fireEvent.click(screen.getByRole('button', { name: 'Publish' }));

    expect(await screen.findByTestId('error-alert')).toBeInTheDocument();
    expect(screen.getByText('Publish failed')).toBeInTheDocument();
  });

  it('dashboard Share button opens the publish dialog for that story', async () => {
    useStoryStore.setState({ status: 'success', stories: [makeStorySummary()] });
    vi.spyOn(storiesApi, 'list').mockResolvedValue({ stories: [makeStorySummary()] });
    render(
      <MemoryRouter>
        <StoriesDashboard />
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByTestId('share-story-btn'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Share & publish')).toBeInTheDocument();
    expect(screen.getAllByText('The Tides of Ember').length).toBeGreaterThan(0);
  });
});
