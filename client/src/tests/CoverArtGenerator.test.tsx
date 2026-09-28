import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { CoverArtGenerator } from '../components/book/CoverArtGenerator';
import { useStoryStore } from '../store/storyStore';
import { storiesApi } from '../services/api';
import { AppError } from '../types/domain';
import { makeLinearStory } from './fixtures';

// TICKET-86: CoverArtGenerator — description textarea (prefill), generate,
// preview with altText, save via story store, and graceful AI-unavailable error.
const COVER_IMG = 'data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22/%3E';
const ALT = 'A lone lighthouse under a storm sky, high-contrast woodcut.';
const PREMISE = makeLinearStory().premise;

describe('TICKET-86 — CoverArtGenerator', () => {
  beforeEach(() => {
    useStoryStore.setState({
      current: makeLinearStory(),
      stories: [],
      status: 'success',
      error: null,
      conflict: null,
    });
    vi.restoreAllMocks();
  });
  afterEach(() => vi.restoreAllMocks());

  it('shows a description textarea prefilled from the description prop', () => {
    render(<CoverArtGenerator storyId="s1" description="neon city at dusk, moody" />);
    expect(screen.getByLabelText('Cover description')).toHaveValue('neon city at dusk, moody');
  });

  it('prefills from the story premise when no description is passed', () => {
    render(<CoverArtGenerator storyId="s1" />);
    expect(screen.getByLabelText('Cover description')).toHaveValue(PREMISE);
  });

  it('generates a cover and shows the image preview with the returned altText', async () => {
    const user = userEvent.setup();
    vi.spyOn(storiesApi, 'generateCover').mockResolvedValue({ imageUrl: COVER_IMG, altText: ALT });
    render(<CoverArtGenerator storyId="s1" />);

    await user.click(screen.getByRole('button', { name: 'Generate Cover' }));

    expect(storiesApi.generateCover).toHaveBeenCalledWith('s1', PREMISE);
    const img = await screen.findByTestId('cover-preview-image');
    expect(img).toHaveAttribute('src', COVER_IMG);
    expect(img).toHaveAttribute('alt', ALT);
  });

  it('sends the edited textarea value when generating', async () => {
    const user = userEvent.setup();
    vi.spyOn(storiesApi, 'generateCover').mockResolvedValue({ imageUrl: COVER_IMG, altText: ALT });
    render(<CoverArtGenerator storyId="s1" />);

    const textarea = screen.getByLabelText('Cover description');
    await user.clear(textarea);
    await user.type(textarea, 'a neon city at dusk reflected in rain');
    await user.click(screen.getByRole('button', { name: 'Generate Cover' }));

    expect(storiesApi.generateCover).toHaveBeenCalledWith(
      's1',
      'a neon city at dusk reflected in rain',
    );
  });

  it('disables controls and exposes aria-busy while generating', async () => {
    const user = userEvent.setup();
    let resolveGen!: (v: { imageUrl: string; altText: string }) => void;
    vi.spyOn(storiesApi, 'generateCover').mockImplementation(
      () =>
        new Promise((res) => {
          resolveGen = res;
        }),
    );
    render(<CoverArtGenerator storyId="s1" />);

    await user.click(screen.getByRole('button', { name: 'Generate Cover' }));

    expect(screen.getByRole('button', { name: /Generate Cover/ })).toBeDisabled();
    expect(screen.getByLabelText('Cover description')).toBeDisabled();
    expect(screen.getByTestId('spinner')).toBeInTheDocument();
    expect(screen.getByTestId('cover-art-generator')).toHaveAttribute('aria-busy', 'true');

    resolveGen({ imageUrl: COVER_IMG, altText: ALT });
    expect(await screen.findByTestId('cover-preview-image')).toBeInTheDocument();
  });

  it('saves the generated cover to the story via the store', async () => {
    const user = userEvent.setup();
    const onGenerated = vi.fn();
    vi.spyOn(storiesApi, 'generateCover').mockResolvedValue({ imageUrl: COVER_IMG, altText: ALT });
    vi.spyOn(storiesApi, 'update').mockResolvedValue({
      story: makeLinearStory({ coverImageUrl: COVER_IMG }),
    });
    render(<CoverArtGenerator storyId="s1" onGenerated={onGenerated} />);

    await user.click(screen.getByRole('button', { name: 'Generate Cover' }));
    await screen.findByTestId('cover-preview-image');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(storiesApi.update).toHaveBeenCalledWith('s1', {
        coverImageUrl: COVER_IMG,
        baseVersion: 1,
      }),
    );
    expect(useStoryStore.getState().current?.coverImageUrl).toBe(COVER_IMG);
    expect(screen.getByTestId('cover-saved')).toBeInTheDocument();
    expect(onGenerated).toHaveBeenCalledWith(COVER_IMG);
  });

  it('shows an ErrorAlert with Retry when AI is unavailable, then recovers', async () => {
    const user = userEvent.setup();
    vi.spyOn(storiesApi, 'generateCover')
      .mockRejectedValueOnce(
        new AppError('AI_UNAVAILABLE', 'AI generation is unavailable right now'),
      )
      .mockResolvedValueOnce({ imageUrl: COVER_IMG, altText: ALT });
    render(<CoverArtGenerator storyId="s1" />);

    await user.click(screen.getByRole('button', { name: 'Generate Cover' }));

    const alert = await screen.findByTestId('error-alert');
    expect(alert).toHaveTextContent('AI generation is unavailable right now');

    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByTestId('cover-preview-image')).toBeInTheDocument();
  });
});
