import { useEffect, useState } from 'react';
import { Check, Copy, Globe } from 'lucide-react';
import { Button } from '../ui/Button';
import { ErrorAlert } from '../ui/ErrorAlert';
import { Modal } from '../ui/Modal';
import { Spinner } from '../ui/Spinner';
import { storiesApi } from '../../services/api';
import { useStoryStore } from '../../store/storyStore';
import { AppError, type ID } from '../../types/domain';

export interface PublishDialogProps {
  story: { _id: ID; title: string; isPublic: boolean };
  open: boolean;
  onClose: () => void;
}

export function PublishDialog({ story, open, onClose }: PublishDialogProps) {
  const publish = useStoryStore((s) => s.publish);
  const [value, setValue] = useState(story.isPublic);
  const [applied, setApplied] = useState(story.isPublic);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loadingLink, setLoadingLink] = useState(false);
  const [error, setError] = useState<AppError | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    setValue(story.isPublic);
    setApplied(story.isPublic);
    setShareToken(null);
    setCopied(false);
    setError(null);
    let cancelled = false;
    if (story.isPublic) {
      setLoadingLink(true);
      storiesApi
        .get(story._id)
        .then((s) => {
          if (!cancelled) setShareToken(s.shareToken);
        })
        .catch((e: unknown) => {
          if (!cancelled) setError(e as AppError);
        })
        .finally(() => {
          if (!cancelled) setLoadingLink(false);
        });
    }
    return () => {
      cancelled = true;
    };
  }, [open, story._id, story.isPublic]);

  const next = value === applied ? !applied : value;
  const shareUrl = shareToken ? `${window.location.origin}/s/${shareToken}` : null;
  const idle = busy || loadingLink;

  const apply = async (target: boolean) => {
    setBusy(true);
    setError(null);
    try {
      const token = await publish(story._id, target);
      setApplied(target);
      setValue(target);
      setShareToken(target && token ? token : null);
      if (target) setCopied(false);
    } catch (e) {
      setError(e as AppError);
    } finally {
      setBusy(false);
    }
  };

  const copyLink = async () => {
    if (!shareUrl || !navigator.clipboard?.writeText) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
    } catch {
      setError(new AppError('CLIPBOARD', 'Could not copy the link automatically.'));
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Share & publish"
      width="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
          <Button
            variant={next ? 'primary' : 'danger'}
            loading={busy}
            disabled={idle}
            onClick={() => void apply(next)}
            data-testid="publish-confirm"
          >
            {next ? 'Publish' : 'Unpublish'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <p className="eyebrow">Story</p>
          <h3 className="mt-0.5 truncate font-display text-xl text-[color:var(--ink-warm)]">
            {story.title}
          </h3>
        </div>

        {loadingLink ? (
          <div
            className="flex items-center gap-2 text-sm text-slate-400"
            role="status"
            aria-live="polite"
          >
            <Spinner size="sm" />
            Loading link…
          </div>
        ) : (
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-700/60 bg-slate-800/60 p-3 transition-colors duration-200 hover:border-slate-600">
            <input
              type="checkbox"
              role="switch"
              aria-label="Share this story publicly"
              checked={value}
              disabled={idle}
              onChange={(e) => setValue(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-indigo-500"
            />
            <span>
              <span className="block font-medium text-slate-200">Public share link</span>
              <span className="mt-0.5 block text-xs leading-relaxed text-slate-400">
                Anyone with the link can read the story. Publishing generates a private link you can
                revoke any time.
              </span>
            </span>
          </label>
        )}

        {error && <ErrorAlert error={error} onRetry={() => void apply(next)} />}

        {applied && shareUrl && (
          <div className="space-y-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3">
            <div className="flex items-center gap-1.5 text-sm font-medium text-emerald-300">
              <Globe className="h-4 w-4" aria-hidden="true" />
              Published
            </div>
            <label
              htmlFor="share-url"
              className="block text-xs uppercase tracking-wider text-slate-400"
            >
              Shareable link
            </label>
            <div className="flex items-center gap-2">
              <input
                id="share-url"
                readOnly
                value={shareUrl}
                data-testid="share-url"
                className="w-full min-w-0 rounded-md border border-slate-700/60 bg-slate-900/80 px-3 py-2 text-xs text-slate-300 focus:ring-2 focus:ring-indigo-500/50 focus:outline-none"
                onFocus={(e) => e.target.select()}
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => void copyLink()}
                data-testid="copy-link"
                className="shrink-0"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
                ) : (
                  <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                {copied ? 'Copied' : 'Copy link'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
