import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Toaster } from 'react-hot-toast';
import { MemoryRouter } from 'react-router-dom';
import { AuthCard } from '../components/auth/AuthCard';
import { LoginForm } from '../components/auth/LoginForm';
import { SignupForm } from '../components/auth/SignupForm';
import { useAuthStore } from '../store/authStore';
import { authApi } from '../services/api';
import { AppError } from '../types/domain';
import { makeUser } from './fixtures';

// TICKET-20: Auth UI — AuthCard + LoginForm + SignupForm.
describe('TICKET-20 — AuthCard', () => {
  it('renders login mode with link to signup', () => {
    render(
      <MemoryRouter>
        <AuthCard mode="login">
          <div>form</div>
        </AuthCard>
      </MemoryRouter>,
    );
    expect(screen.getByText('Welcome back')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /create an account/i })).toHaveAttribute(
      'href',
      '/auth/signup',
    );
  });

  it('renders signup mode with link to login', () => {
    render(
      <MemoryRouter>
        <AuthCard mode="signup">
          <div>form</div>
        </AuthCard>
      </MemoryRouter>,
    );
    expect(screen.getByText('Start writing')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /sign in/i })).toHaveAttribute('href', '/auth/login');
  });
});

describe('TICKET-20 — LoginForm', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, status: 'idle', error: null, googleEnabled: false });
  });
  afterEach(() => vi.restoreAllMocks());

  it('renders email + password with aria-labels and focus rings', () => {
    render(<LoginForm />);
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    const form = screen.getByRole('form', { name: /login form/i });
    expect(form).toBeInTheDocument();
  });

  it('submits credentials via the auth store', async () => {
    const user = userEvent.setup();
    const loginSpy = vi.spyOn(authApi, 'login').mockResolvedValue({ ok: true });
    vi.spyOn(authApi, 'me').mockResolvedValue({ user: makeUser() });

    render(<LoginForm />);
    await user.type(screen.getByLabelText('Email'), 'jane@example.com');
    await user.type(screen.getByLabelText('Password'), 'password1');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(loginSpy).toHaveBeenCalledWith({ email: 'jane@example.com', password: 'password1' });
  });

  it('shows an error toast when login fails', async () => {
    const user = userEvent.setup();
    vi.spyOn(authApi, 'login').mockRejectedValue(
      new AppError('UNAUTHORIZED', 'Email or password is wrong'),
    );
    render(
      <>
        <LoginForm />
        <Toaster />
      </>,
    );
    await user.type(screen.getByLabelText('Email'), 'a@b.c');
    await user.type(screen.getByLabelText('Password'), 'bad');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText('Email or password is wrong')).toBeInTheDocument();
  });
});

describe('TICKET-20 — SignupForm', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, status: 'idle', error: null, googleEnabled: false });
    vi.restoreAllMocks();
  });
  afterEach(() => vi.restoreAllMocks());

  it('renders name/email/password fields', () => {
    render(
      <MemoryRouter>
        <SignupForm />
      </MemoryRouter>,
    );
    expect(screen.getByLabelText('Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
  });

  it('submits signup and navigates to verify', async () => {
    const user = userEvent.setup();
    const signupSpy = vi.spyOn(authApi, 'signup').mockResolvedValue({ ok: true });
    render(
      <MemoryRouter>
        <SignupForm />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText('Name'), 'Jane');
    await user.type(screen.getByLabelText('Email'), 'jane@example.com');
    await user.type(screen.getByLabelText('Password'), 'password1');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    expect(signupSpy).toHaveBeenCalledWith({
      name: 'Jane',
      email: 'jane@example.com',
      password: 'password1',
    });
  });
});
