import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { ConfirmDialog } from './ConfirmDialog';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

/** Promise-based confirm dialog (renders a transient ConfirmDialog at body root). */
export function confirm(opts: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    const mount = document.createElement('div');
    document.body.appendChild(mount);
    const root = createRoot(mount);

    const cleanup = (result: boolean) => {
      root.unmount();
      mount.remove();
      resolve(result);
    };

    root.render(
      createElement(ConfirmDialogView, {
        opts,
        onConfirm: () => cleanup(true),
        onCancel: () => cleanup(false),
      }),
    );
  });
}

function ConfirmDialogView({
  opts,
  onConfirm,
  onCancel,
}: {
  opts: ConfirmOptions;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return createElement(ConfirmDialog, {
    open: true,
    title: opts.title,
    message: opts.message,
    confirmLabel: opts.confirmLabel,
    cancelLabel: opts.cancelLabel,
    danger: opts.danger,
    onConfirm,
    onCancel,
  });
}