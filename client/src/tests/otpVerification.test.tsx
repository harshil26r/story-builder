import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Toaster } from 'react-hot-toast';
import { OtpVerification } from '../components/auth/OtpVerification';
import { AppError } from '../types/domain';

// TICKET-26: OtpVerification.
describe('TICKET-26 — OtpVerification', () => {
  it('auto-focuses the code input and renders resend countdown', () => {
    render(<OtpVerification email="a@b.c" initialCountdownSec={30} onSubmitOverride={vi.fn()} />);
    const input = screen.getByLabelText('6-digit verification code');
    expect(input).toHaveFocus();
    expect(screen.getByText(/resend code in/i)).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /resend verification code/i }),
    ).not.toBeInTheDocument();
  });

  it('enables resend after countdown reaches zero', () => {
    render(<OtpVerification email="a@b.c" initialCountdownSec={0} onSubmitOverride={vi.fn()} />);
    expect(screen.getByRole('button', { name: /resend verification code/i })).toBeInTheDocument();
  });

  it('calls onResendOverride on resend click', async () => {
    const user = userEvent.setup();
    const onResend = vi.fn().mockResolvedValue(undefined);
    render(
      <OtpVerification
        email="a@b.c"
        initialCountdownSec={0}
        onResendOverride={onResend}
        onSubmitOverride={vi.fn()}
      />,
    );
    await user.click(screen.getByRole('button', { name: /resend verification code/i }));
    expect(onResend).toHaveBeenCalled();
  });

  it('submits the code via onSubmitOverride', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<OtpVerification email="a@b.c" initialCountdownSec={0} onSubmitOverride={onSubmit} />);
    await user.type(screen.getByLabelText('6-digit verification code'), '123456');
    await user.click(screen.getByRole('button', { name: /verify code/i }));
    expect(onSubmit).toHaveBeenCalledWith('123456');
  });

  it('paste support sanitizes digits', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<OtpVerification email="a@b.c" initialCountdownSec={0} onSubmitOverride={onSubmit} />);
    const input = screen.getByLabelText('6-digit verification code');
    // userEvent.paste on a controlled input
    input.focus();
    await user.paste('12a34b56');
    expect(input).toHaveValue('123456');
  });

  it('shows an error toast when submit fails', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockRejectedValue(new AppError('OTP_INVALID', 'Wrong code'));
    render(
      <>
        <OtpVerification email="a@b.c" initialCountdownSec={0} onSubmitOverride={onSubmit} />
        <Toaster />
      </>,
    );
    await user.type(screen.getByLabelText('6-digit verification code'), '000000');
    await user.click(screen.getByRole('button', { name: /verify code/i }));
    expect(await screen.findByText('Wrong code')).toBeInTheDocument();
  });
});
