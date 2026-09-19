import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
import { AppError } from '../../types/domain';
import { Button } from '../ui/Button';

export interface OtpVerificationProps {
  email?: string;
  purpose?: 'signup-verify' | 'password-reset';
  /** Override of the auto-focus + countdown (testable). */
  initialCountdownSec?: number;
  onSubmitOverride?: (code: string) => Promise<void>;
  onResendOverride?: () => Promise<void>;
  onSuccess?: () => void;
}

const RESEND_COOLDOWN = 60;

export function OtpVerification({
  email = '',
  purpose = 'signup-verify',
  initialCountdownSec,
  onSubmitOverride,
  onResendOverride,
  onSuccess,
}: OtpVerificationProps) {
  const verifyOtp = useAuthStore((s) => s.verifyOtp);
  const sendOtp = useAuthStore((s) => s.sendOtp);
  const clearError = useAuthStore((s) => s.clearError);

  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [countdownSec, setCountdownSec] = useState(initialCountdownSec ?? RESEND_COOLDOWN);
  const [resendBusy, setResendBusy] = useState(false);

  useEffect(() => {
    if (initialCountdownSec !== undefined) return;
    const timer = window.setInterval(() => {
      setCountdownSec((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [initialCountdownSec]);

  const handleSubmit = async () => {
    if (busy) return;
    clearError();
    setBusy(true);
    try {
      if (onSubmitOverride) {
        await onSubmitOverride(code);
      } else {
        await verifyOtp(email, code, purpose);
      }
      toast.success('Email verified. Welcome!');
      onSuccess?.();
    } catch (err: unknown) {
      const appErr = err instanceof AppError ? err : new AppError('UNKNOWN', String(err));
      toast.error(appErr.message);
    } finally {
      setBusy(false);
    }
  };

  const handleResend = async () => {
    if (resendBusy || countdownSec > 0) return;
    clearError();
    setResendBusy(true);
    try {
      if (onResendOverride) {
        await onResendOverride();
      } else {
        await sendOtp(email, purpose);
      }
      setCountdownSec(RESEND_COOLDOWN);
      toast('New code sent.');
    } catch (err: unknown) {
      const appErr = err instanceof AppError ? err : new AppError('UNKNOWN', String(err));
      toast.error(appErr.message);
    } finally {
      setResendBusy(false);
    }
  };

  return (
    <form
      aria-label="OTP verification form"
      onSubmit={(e) => {
        e.preventDefault();
        void handleSubmit();
      }}
      className="space-y-4"
    >
      {email ? (
        <p className="text-sm text-slate-600">
          We sent a code to <strong className="text-slate-900">{email}</strong>.
        </p>
      ) : null}

      <div>
        <label
          htmlFor="otp-code"
          className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-700"
        >
          Verification code
        </label>
        <input
          id="otp-code"
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          value={code}
          maxLength={6}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          onPaste={(e) => {
            const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
            setCode(text);
            e.preventDefault();
            if (text.length === 6) void handleSubmit();
          }}
          className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-center text-2xl font-mono tracking-[0.5em] text-slate-900 transition-all duration-200 placeholder:text-slate-400 focus:border-indigo-600 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
          placeholder="••••••"
          aria-label="6-digit verification code"
        />
      </div>

      <Button type="submit" loading={busy} className="w-full bg-slate-900 hover:bg-indigo-600 text-white" aria-label="Verify code">
        Verify
      </Button>

      <div className="text-center text-xs text-slate-400">
        {countdownSec > 0 ? (
          <span>
            Resend code in <span className="font-mono text-slate-300">{countdownSec}s</span>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => void handleResend()}
            disabled={resendBusy}
            className="text-indigo-400 transition-colors duration-200 hover:text-indigo-300 focus:ring-2 focus:ring-indigo-500/50 focus:outline-none"
            aria-label="Resend verification code"
          >
            Resend code
          </button>
        )}
      </div>
    </form>
  );
}
