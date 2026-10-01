import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AsyncState } from '../components/ui/AsyncState';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorAlert } from '../components/ui/ErrorAlert';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Skeleton } from '../components/ui/Skeleton';
import { Spinner } from '../components/ui/Spinner';

// TICKET-36: UI primitives.
describe('TICKET-36 — UI primitives', () => {
  it('AsyncState renders skeleton on loading', () => {
    render(
      <AsyncState status="loading" skeleton={<div data-testid="skel">loading</div>}>
        <div>content</div>
      </AsyncState>,
    );
    expect(screen.getByTestId('skel')).toBeInTheDocument();
    expect(screen.queryByText('content')).not.toBeInTheDocument();
  });

  it('AsyncState renders error + retry on error', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(
      <AsyncState status="error" error={new Error('boom')} onRetry={onRetry}>
        <div>content</div>
      </AsyncState>,
    );
    expect(screen.getByTestId('error-alert')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /retry/i }));
    expect(onRetry).toHaveBeenCalled();
  });

  it('AsyncState renders empty on empty status', () => {
    render(<AsyncState status="empty" empty={<div data-testid="empty">nothing</div>} />);
    expect(screen.getByTestId('empty')).toBeInTheDocument();
  });

  it('AsyncState renders children on success', () => {
    render(<AsyncState status="success">content</AsyncState>);
    expect(screen.getByText('content')).toBeInTheDocument();
  });

  it('Button loading disables and shows spinner', () => {
    render(<Button loading>Go</Button>);
    const btn = screen.getByRole('button', { name: /go/i });
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByTestId('spinner')).toBeInTheDocument();
  });

  it('EmptyState shows title + description + action', () => {
    render(<EmptyState title="Empty" description="Nothing here" action={<button>Act</button>} />);
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    expect(screen.getByText('Empty')).toBeInTheDocument();
    expect(screen.getByText('Nothing here')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Act' })).toBeInTheDocument();
  });

  it('ErrorAlert shows message fields and retry', () => {
    const onRetry = vi.fn();
    render(
      <ErrorAlert
        error={{ message: 'Failed', code: 'E', fields: [{ field: 'x', message: 'bad' }] }}
        onRetry={onRetry}
      />,
    );
    expect(screen.getByText('Failed')).toBeInTheDocument();
    expect(screen.getByText('x:')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('Modal open renders dialog with a11y attrs and closes on Escape', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} title="T">
        <div>body</div>
      </Modal>,
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalled();
  });

  it('ConfirmDialog calls onConfirm', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <ConfirmDialog
        open
        title="Sure?"
        message="Do it"
        confirmLabel="Yes"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Yes' }));
    expect(onConfirm).toHaveBeenCalled();
  });

  it('Skeleton and Spinner render with a11y status', () => {
    render(<Skeleton lines={2} />);
    expect(screen.getByTestId('skeleton')).toBeInTheDocument();
    render(<Spinner label="Busy" />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});
