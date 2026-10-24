import { useEffect, type ReactNode } from 'react';
import { Link, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/authStore';
import { AppShell } from './components/ui/AppShell';
import { AuthCard } from './components/auth/AuthCard';
import { LoginForm } from './components/auth/LoginForm';
import { SignupForm } from './components/auth/SignupForm';
import { OtpVerification } from './components/auth/OtpVerification';
import { CharactersDashboard } from './components/characters/CharactersDashboard';
import { CharacterEditor } from './components/characters/CharacterEditor';
import { StoriesDashboard } from './components/stories/StoriesDashboard';
import { CreateStoryPage } from './components/stories/CreateStoryPage';
import { StoryWizard } from './components/stories/StoryWizard';
import { ExplorePage } from './components/explore/ExplorePage';
import { BookReader } from './components/book/BookReader';
import { StoryEditor } from './components/stories/StoryEditor';
import { PublicReader } from './components/book/PublicReader';
import { NotFoundPage } from './components/pages/NotFoundPage';
import { WebsitePage } from './components/website/WebsitePage';
import { Spinner } from './components/ui/Spinner';
import { bootstrap } from './services/bootstrap';

function AuthGate({ children }: { children: ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const status = useAuthStore((s) => s.status);

  useEffect(() => {
    void bootstrap();
  }, []);

  const checked = status === 'success' || status === 'empty' || status === 'error';
  if (status === 'loading' || (status === 'idle' && user === null && !checked)) {
    return (
      <AppShell>
        <div
          className="flex min-h-[50vh] items-center justify-center"
          role="status"
          aria-label="Authenticating"
        >
          <Spinner size="lg" />
        </div>
      </AppShell>
    );
  }
  if (!user) {
    return <Navigate to="/auth/login" replace />;
  }
  return <AppShell>{children}</AppShell>;
}

function GuestGate({ children }: { children: ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const location = useLocation();
  if (user) {
    const from = (location.state as { from?: string } | null)?.from || '/';
    return <Navigate to={from} replace state={{ from: location.pathname }} />;
  }
  return <>{children}</>;
}

function HomeRoute() {
  const user = useAuthStore((s) => s.user);
  const status = useAuthStore((s) => s.status);

  useEffect(() => {
    void bootstrap();
  }, []);

  const checked = status === 'success' || status === 'empty' || status === 'error';
  if (status === 'loading' || (status === 'idle' && user === null && !checked)) {
    return (
      <AppShell>
        <div
          className="flex min-h-[50vh] items-center justify-center"
          role="status"
          aria-label="Authenticating"
        >
          <Spinner size="lg" />
        </div>
      </AppShell>
    );
  }

  if (user) {
    return (
      <AppShell>
        <StoriesDashboard />
      </AppShell>
    );
  }

  return <WebsitePage />;
}

function LoginRoute() {
  const navigate = useNavigate();
  return (
    <AuthCard mode="login">
      <LoginForm onNeedOtp={(email) => navigate('/auth/verify', { state: { email } })} />
    </AuthCard>
  );
}

/** `/auth/verify` — email comes from the signup/login flow (navigation state). */
function VerifyEmailRoute() {
  const location = useLocation();
  const navigate = useNavigate();
  const email = (location.state as { email?: string } | null)?.email ?? '';

  if (!email) {
    return (
      <AuthCard mode="verify">
        <div className="space-y-3 text-center text-sm text-slate-400">
          <p>No verification in progress.</p>
          <p className="text-xs">
            <Link
              to="/auth/signup"
              className="text-indigo-400 hover:text-indigo-300 focus:ring-2 focus:ring-indigo-500/50 focus:outline-none"
            >
              Sign up
            </Link>{' '}
            or{' '}
            <Link
              to="/auth/login"
              className="text-indigo-400 hover:text-indigo-300 focus:ring-2 focus:ring-indigo-500/50 focus:outline-none"
            >
              log in
            </Link>{' '}
            to receive a verification code.
          </p>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard mode="verify">
      <OtpVerification
        email={email}
        purpose="signup-verify"
        onSuccess={() => navigate('/', { replace: true })}
      />
    </AuthCard>
  );
}

export default function App() {
  return (
    <>
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#0f172a',
            color: '#e2e8f0',
            border: '1px solid rgba(51, 65, 85, 0.8)',
            fontSize: '0.875rem',
          },
          success: { iconTheme: { primary: '#34d399', secondary: '#0f172a' } },
          error: { iconTheme: { primary: '#f87171', secondary: '#0f172a' } },
        }}
      />
      <Routes>
        <Route
          path="/auth/login"
          element={
            <GuestGate>
              <LoginRoute />
            </GuestGate>
          }
        />
        <Route
          path="/auth/signup"
          element={
            <GuestGate>
              <AuthCard mode="signup">
                <SignupForm />
              </AuthCard>
            </GuestGate>
          }
        />
        <Route
          path="/auth/verify"
          element={
            <GuestGate>
              <VerifyEmailRoute />
            </GuestGate>
          }
        />
        <Route path="/" element={<HomeRoute />} />
        <Route
          path="/dashboard"
          element={
            <AuthGate>
              <StoriesDashboard />
            </AuthGate>
          }
        />
        <Route path="/website" element={<WebsitePage />} />
        <Route path="/explore" element={<ExplorePage />} />
        <Route
          path="/create"
          element={
            <AuthGate>
              <CreateStoryPage />
            </AuthGate>
          }
        />
        <Route
          path="/characters"
          element={
            <AuthGate>
              <CharactersDashboard />
            </AuthGate>
          }
        />
        <Route
          path="/characters/:id"
          element={
            <AuthGate>
              <CharacterEditor />
            </AuthGate>
          }
        />
        <Route
          path="/stories/new"
          element={
            <AuthGate>
              <StoryWizard />
            </AuthGate>
          }
        />
        <Route
          path="/stories/:id"
          element={
            <AuthGate>
              <BookReader />
            </AuthGate>
          }
        />
        <Route
          path="/stories/:id/manage"
          element={
            <AuthGate>
              <StoryEditor />
            </AuthGate>
          }
        />
        <Route path="/s/:shareToken" element={<PublicReader />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  );
}
