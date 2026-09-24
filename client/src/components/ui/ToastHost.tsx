import { AnimatePresence, motion } from 'framer-motion';
import { useToastStore } from '../../store/toastStore';
import { ToastView } from './Toast';

/** Global toast stack (driven by ui/Toast store, mounted in AppShell). */
export function ToastHost() {
  const toasts = useToastStore((s) => s.toasts);

  if (toasts.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed bottom-4 right-4 z-[70] flex w-full max-w-sm flex-col gap-2"
      aria-label="Notifications"
      aria-live="polite"
      data-testid="toast-host"
    >
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="pointer-events-auto"
          >
            <ToastView toast={t} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
