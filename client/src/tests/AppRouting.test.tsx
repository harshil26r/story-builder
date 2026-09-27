import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../App';
import { useAuthStore } from '../store/authStore';
import { useStoryStore } from '../store/storyStore';
import { useCharacterStore } from '../store/characterStore';
import { storiesApi, charactersApi } from '../services/api';
import { makeUser, makeStorySummary, makeCharacter } from './fixtures';

// The App gates on `bootstrap()`, whose module-level `bootstrapped` flag would
// leak across tests and whose CSRF prefetch needs a live cookie. Fake it so the
// route guards are exercised purely from store state (which authStore.test.ts
// covers separately).
vi.mock('../services/bootstrap', () => ({
  bootstrap: vi.fn().mockResolvedValue(undefined),
  isBootstrapPending: () => false,
}));

// TICKET-21: App routing + AppShell + TopNav.
describe('TICKET-21 — App routing', () => {
  const renderAt = (path: string) =>
    render(
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>,
    );

  beforeEach(() => {
    useAuthStore.setState({ user: null, status: 'idle', error: null, googleEnabled: false });
    useStoryStore.setState({
      stories: [],
      current: null,
      status: 'idle',
      error: null,
      conflict: null,
    });
    useCharacterStore.setState({ characters: [], status: 'idle', error: null });
    vi.restoreAllMocks();
  });
  afterEach(() => vi.restoreAllMocks());

  it('routes /auth/login to the login form', () => {
    renderAt('/auth/login');
    expect(screen.getByRole('form', { name: /login form/i })).toBeInTheDocument();
  });

  it('routes /auth/signup to the signup form', () => {
    renderAt('/auth/signup');
    expect(screen.getByRole('form', { name: /signup form/i })).toBeInTheDocument();
  });

  it('/ renders Reader X website when there is no session, and /dashboard redirects to /auth/login', async () => {
    useAuthStore.setState({ user: null, status: 'empty', error: null });
    renderAt('/');
    expect(screen.getByRole('heading', { name: /get the ultimate ai story & book builder/i })).toBeInTheDocument();

    renderAt('/dashboard');
    expect(await screen.findByRole('form', { name: /login form/i })).toBeInTheDocument();
  });

  it('renders TopNav with user name + logout when logged in', async () => {
    const user = makeUser();
    useAuthStore.setState({ user, status: 'success', error: null });
    vi.spyOn(storiesApi, 'list').mockResolvedValue({ stories: [makeStorySummary()] });
    renderAt('/');

    await waitFor(() => {
      expect(screen.getByTestId('user-name')).toHaveTextContent(user.name);
    });
    expect(screen.getByRole('button', { name: 'Logout' })).toBeInTheDocument();
  });

  it('guest routes redirect to / when already logged in', async () => {
    const user = makeUser();
    useAuthStore.setState({ user, status: 'success', error: null });
    vi.spyOn(storiesApi, 'list').mockResolvedValue({ stories: [makeStorySummary()] });
    renderAt('/auth/login');

    // Guests are bounced to the dashboard (which lists stories).
    await waitFor(() => {
      expect(screen.getByTestId('stories-grid')).toBeInTheDocument();
    });
    expect(screen.queryByRole('form', { name: /login form/i })).not.toBeInTheDocument();
  });
});

// TICKET-40: Character routing + page shell.
describe('TICKET-40 — character routes', () => {
  const renderAt = (path: string) =>
    render(
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>,
    );

  beforeEach(() => {
    useAuthStore.setState({ user: null, status: 'idle', error: null, googleEnabled: false });
    useStoryStore.setState({
      stories: [],
      current: null,
      status: 'idle',
      error: null,
      conflict: null,
    });
    useCharacterStore.setState({ characters: [makeCharacter()], status: 'success', error: null });
    vi.restoreAllMocks();
  });
  afterEach(() => vi.restoreAllMocks());

  it('/characters renders CharactersDashboard when authenticated', async () => {
    useAuthStore.setState({ user: makeUser(), status: 'success', error: null });
    useCharacterStore.setState({ characters: [makeCharacter()], status: 'success', error: null });
    vi.spyOn(charactersApi, 'list').mockResolvedValue({ characters: [makeCharacter()] });
    renderAt('/characters');

    await waitFor(() => {
      expect(screen.getByTestId('characters-grid')).toBeInTheDocument();
    });
    expect(screen.getByRole('heading', { name: 'Characters' })).toBeInTheDocument();
  });

  it('/characters/:id renders CharacterEditor when authenticated', async () => {
    useAuthStore.setState({ user: makeUser(), status: 'success', error: null });
    useCharacterStore.setState({ characters: [makeCharacter()], status: 'success', error: null });
    renderAt('/characters/c1');

    await waitFor(() => {
      expect(screen.getByLabelText('Name *')).toBeInTheDocument();
    });
    expect(screen.getByLabelText('Name *')).toHaveValue('Elara');
  });

  it('/characters/:id/new renders the create form', async () => {
    useAuthStore.setState({ user: makeUser(), status: 'success', error: null });
    useCharacterStore.setState({ characters: [makeCharacter()], status: 'success', error: null });
    renderAt('/characters/new');

    await waitFor(() => {
      expect(screen.getByLabelText('Name *')).toBeInTheDocument();
    });
    expect(screen.getByRole('heading', { name: /new character/i })).toBeInTheDocument();
  });

  it('/characters redirects to login when unauthenticated', async () => {
    useAuthStore.setState({ user: null, status: 'empty', error: null });
    renderAt('/characters');
    expect(await screen.findByRole('form', { name: /login form/i })).toBeInTheDocument();
  });
});
