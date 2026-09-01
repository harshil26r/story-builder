import { CheckCircle2, Info, X, XCircle } from 'lucide-react';
import type { Toast, ToastKind } from '../../store/toastStore';
import { useToastStore } from '../../store/toastStore';

export interface ToastViewProps {
  toast: Toast;
}

const KIND_STYLES: Record<ToastKind, { icon: typeof Info; cls: string; label: string }> = {
  info: { icon: Info, cls: 'border-sky-500/30 text-sky-300', label: 'Info' },
  error: { icon: XCircle, cls: 'border-rose-500/30 text-rose-300', label: 'Error' },
  success: { icon: CheckCircle2, cls: 'border-emerald-500/30 text-emerald-300', label: 'Success' },
};

export function ToastView({ toast }: ToastViewProps) {
  const dismiss = useToastStore((s) => s.dismiss);
  const { icon: Icon, cls, label } = KIND_STYLES[toast.kind];

  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex items-start gap-2.5 rounded-lg border bg-slate-900/95 px-4 py-3 shadow-xl shadow-black/30 backdrop-blur-md ${cls}`}
      data-testid="toast"
    >
      <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wider opacity-80">{label}</p>
        <p className="text-sm text-slate-200">{toast.message}</p>
      </div>
      <button
        onClick={() => dismiss(toast.id)}
        aria-label="Dismiss notification"
        className="rounded p-0.5 text-slate-400 transition-colors hover:text-slate-200 focus:ring-2 focus:ring-indigo-500/50 focus:outline-none"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}