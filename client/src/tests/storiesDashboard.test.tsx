import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { StoriesDashboard } from '../components/stories/StoriesDashboard';
import { useStoryStore } from '../store/storyStore';
import { storiesApi } from '../services/api';
import { makeStorySummary } from './fixtures';

// TICKET-45: StoriesDashboard (4 states).
describe('TICKET-45 — StoriesDashboard', () => {
  const renderAt = () =>
    render(
      <MemoryRouter>
        <StoriesDashboard />
      </MemoryRouter>,
    );

  beforeEach(() => {
    useStoryStore.setState({ stories: [], status: 'idle', error: null, conflict: null, current: null });
    vi.restoreAllMocks();
  });
  afterEach(() => vi.restoreAllMocks());

  it('renders skeleton grid while loading', () => {
    useStoryStore.setState({ status: 'loading' });
    renderAt();
    expect(screen.getAllByTestId('skeleton-card').length).toBeGreaterThan(0);
  });

  it('renders empty state with create CTA', () => {
    useStoryStore.setState({ status: 'empty' });
    renderAt();
    expect(screen.getByTestId('create-story-cta')).toBeInTheDocument();
    expect(screen.getAllByText(/start your first story/i)[0]).toBeInTheDocument();
  });

  it('renders error + retry', async () => {
    useStoryStore.setState({ status: 'error', error: { name: 'AppError', message: 'Oops', code: 'X' } as never });
    vi.spyOn(storiesApi, 'list').mockResolvedValue({ stories: [] });
    renderAt();
    expect(screen.getByTestId('error-alert')).toBeInTheDocument();
  });

  it('renders story cards on success', async () => {
    useStoryStore.setState({ status: 'success', stories: [makeStorySummary()] });
    renderAt();
    expect(screen.getByTestId('stories-grid')).toBeInTheDocument();
    expect(screen.getByText('The Tides of Ember')).toBeInTheDocument();
    expect(screen.getByTestId('story-card')).toBeInTheDocument();
  });
});