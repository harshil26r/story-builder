import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CreateStoryPage } from '../components/stories/CreateStoryPage';
import { StoryWizard } from '../components/stories/StoryWizard';
import { useStoryStore } from '../store/storyStore';
import { useCharacterStore } from '../store/characterStore';
import { useUiStore } from '../store/uiStore';

const PREMISE =
  'A smuggler sails a burning sea to save her sister from the tide-queen.';

describe('CreateStoryPage — multiple creation paths', () => {
  it('offers a full-AI, AI-assisted, short-story, branching, and remix option', () => {
    render(
      <MemoryRouter>
        <CreateStoryPage />
      </MemoryRouter>,
    );
    expect(screen.getByTestId('create-options')).toBeInTheDocument();
    for (const key of ['full-ai', 'ai-assisted', 'short-story', 'branching', 'remix']) {
      expect(screen.getByTestId(`create-option-${key}`)).toBeInTheDocument();
    }
  });

  it('routes Remix to Explore and the others to the wizard', () => {
    render(
      <MemoryRouter>
        <CreateStoryPage />
      </MemoryRouter>,
    );
    expect(screen.getByTestId('create-option-remix')).toHaveAttribute('href', '/explore');
    expect(screen.getByTestId('create-option-full-ai')).toHaveAttribute('href', '/stories/new');
    expect(screen.getByTestId('create-option-branching')).toHaveAttribute('href', '/stories/new');
  });
});

describe('StoryWizard — creation presets & inspiration', () => {
  beforeEach(() => {
    window.scrollTo = vi.fn();
    useStoryStore.setState({
      stories: [],
      current: null,
      status: 'idle',
      conflict: null,
      error: null,
    });
    useCharacterStore.setState({ characters: [], status: 'idle', error: null });
    useUiStore.setState({ readingMode: 'night', darkMode: true });
    vi.restoreAllMocks();
  });
  afterEach(() => vi.restoreAllMocks());

  it('prefills the premise and shows the remix banner from navigation state', () => {
    render(
      <MemoryRouter
        initialEntries={[
          {
            pathname: '/stories/new',
            state: {
              preset: {
                structureType: 'branching',
                generationMode: 'ai-enhanced',
                genre: 'fantasy',
                tone: 'dark',
              },
              inspiration: { title: 'The Tides of Ember', premise: PREMISE },
            },
          },
        ]}
      >
        <StoryWizard />
      </MemoryRouter>,
    );

    expect(screen.getByLabelText(/story premise/i)).toHaveValue(PREMISE);
    expect(screen.getByTestId('inspiration-banner')).toHaveTextContent('The Tides of Ember');

    fireEvent.click(screen.getByTestId('wizard-next'));
    expect(screen.getByTestId('structure-branching')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByLabelText(/genre/i)).toHaveValue('fantasy');
    expect(screen.getByLabelText(/tone/i)).toHaveValue('dark');
    expect(screen.getByRole('button', { name: /AI-enhanced/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('falls back to defaults with no navigation state', () => {
    render(
      <MemoryRouter>
        <StoryWizard />
      </MemoryRouter>,
    );
    expect(screen.getByLabelText(/story premise/i)).toHaveValue('');
    expect(screen.queryByTestId('inspiration-banner')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/story premise/i), { target: { value: PREMISE } });
    fireEvent.click(screen.getByTestId('wizard-next'));
    expect(screen.getByTestId('structure-linear')).toHaveAttribute('aria-pressed', 'true');
  });
});
