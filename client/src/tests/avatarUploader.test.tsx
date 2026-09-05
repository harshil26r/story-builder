import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AvatarUploader } from '../components/characters/AvatarUploader';

// TICKET-39: AvatarUploader.
describe('TICKET-39 — AvatarUploader', () => {
  it('renders initials fallback when no avatar', () => {
    render(<AvatarUploader characterName="Elara" onUpload={vi.fn()} />);
    expect(screen.getByTestId('avatar-initials')).toBeInTheDocument();
    expect(screen.getByText('E')).toBeInTheDocument();
  });

  it('renders current avatar image when available', () => {
    render(<AvatarUploader currentUrl="/uploads/a.png" characterName="Elara" onUpload={vi.fn()} />);
    const img = screen.getByTestId('avatar-image');
    expect(img).toHaveAttribute('src', '/uploads/a.png');
    expect(img).toHaveAttribute('alt', 'Elara avatar');
  });

  it('accepts image/* on file input', () => {
    render(<AvatarUploader characterName="Elara" onUpload={vi.fn()} />);
    expect(screen.getByTestId('avatar-file-input')).toHaveAttribute('accept', 'image/*');
  });

  it('rejects non-image with error', async () => {
    const onError = vi.fn();
    render(<AvatarUploader characterName="Elara" onUpload={vi.fn()} onError={onError} />);
    const input = screen.getByTestId('avatar-file-input');
    const file = new File(['hello'], 'a.txt', { type: 'text/plain' });
    fireEvent.change(input, { target: { files: [file] } });
    expect(onError).toHaveBeenCalledWith(expect.stringContaining('image'));
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('rejects >5MB image with error', async () => {
    const user = userEvent.setup();
    const onError = vi.fn();
    render(<AvatarUploader characterName="Elara" onUpload={vi.fn()} onError={onError} />);
    const input = screen.getByTestId('avatar-file-input');
    const big = new File([new Uint8Array(6 * 1024 * 1024)], 'big.png', { type: 'image/png' });
    await user.upload(input, big);
    expect(onError).toHaveBeenCalledWith(expect.stringContaining('5MB'));
  });

  it('calls onUpload and shows busy spinner while uploading', async () => {
    const user = userEvent.setup();
    let resolveUpload: (url: string) => void = () => undefined;
    const onUpload = vi.fn(
      () =>
        new Promise<string>((resolve) => {
          resolveUpload = resolve;
        }),
    );
    render(<AvatarUploader characterName="Elara" onUpload={onUpload} />);
    const input = screen.getByTestId('avatar-file-input');
    const file = new File(['data'], 'a.png', { type: 'image/png' });
    await user.upload(input, file);

    expect(onUpload).toHaveBeenCalledWith(file);
    expect(screen.getByRole('status', { hidden: true })).toBeInTheDocument();

    resolveUpload('/uploads/a.png');
    // wait a tick for re-render
    await new Promise((r) => setTimeout(r, 10));
  });
});