import { useEffect, type ReactNode } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useAuthStore } from "./store/authStore";
import { AppShell } from "./components/ui/AppShell";
import { AuthCard } from "./components/auth/AuthCard";
import { LoginForm } from "./components/auth/LoginForm";
import { SignupForm } from "./components/auth/SignupForm";
import { OtpVerification } from "./components/auth/OtpVerification";
import { CharactersDashboard } from "./components/characters/CharactersDashboard";
import { CharacterEditor } from "./components/characters/CharacterEditor";
import { StoriesDashboard } from "./components/stories/StoriesDashboard";
import { StoryWizard } from "./components/stories/StoryWizard";
import { BookReader } from "./components/book/BookReader";
import { StoryEditor } from "./components/stories/StoryEditor";
import { PublicReader } from "./components/book/PublicReader";
import { NotFoundPage } from "./components/pages/NotFoundPage";
import { Spinner } from "./components/ui/Spinner";
import { bootstrap } from "./services/bootstrap";

function AuthGate({ children }: { children: ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const status = useAuthStore((s) => s.status);

  useEffect(() => {
    void bootstrap();
  }, []);

  const checked = status === "success" || status === "empty" || status === "error";
  if (status === "loading" || (status === "idle" && user === null && !checked)) {
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
    return <Navigate to="/" replace state={{ from: location.pathname }} />;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route
        path="/auth/login"
        element={
          <GuestGate>
            <AuthCard mode="login">
              <LoginForm />
            </AuthCard>
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
            <AuthCard mode="verify">
              <OtpVerification email="" purpose="signup-verify" />
            </AuthCard>
          </GuestGate>
        }
      />
      <Route
        path="/"
        element={
          <AuthGate>
            <StoriesDashboard />
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
  );
}
