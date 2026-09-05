import { useRef, useState } from 'react';
import { ImagePlus, LoaderCircle } from 'lucide-react';
import { initials } from './CharacterCard';

export interface AvatarUploaderProps {
  currentUrl?: string | null;
  characterName?: string;
  /** Caller-provided upload fn (has the resource id + store wiring). */
  onUpload: (file: File) => Promise<string>;
  onError?: (message: string) => void;
}

const MAX_BYTES = 5 * 1024 * 1024;

export function AvatarUploader({ currentUrl, characterName = '?', onUpload, onError }: AvatarUploaderProps) {
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File | undefined | null) => {
    if (!file) return;
    setLocalError(null);
    if (!file.type.startsWith('image/')) {
      const err = 'Invalid file: an image is required.';
      setLocalError(err);
      onError?.(err);
      return;
    }
    if (file.size > MAX_BYTES) {
      const err = 'Invalid file: maximum size is 5MB.';
      setLocalError(err);
      onError?.(err);
      return;
    }
    setBusy(true);
    try {
      await onUpload(file);
    } catch (e) {
      const err = e instanceof Error ? e.message : 'Upload failed.';
      setLocalError(err);
      onError?.(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-3" data-testid="avatar-uploader">
      <div className="relative">
        {currentUrl ? (
          <img
            src={currentUrl}
            alt={`${characterName} avatar`}
            className="h-16 w-16 rounded-full object-cover ring-1 ring-slate-700"
            data-testid="avatar-image"
          />
        ) : (
          <div
            className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-800 text-xl font-semibold text-slate-200 ring-1 ring-slate-700"
            data-testid="avatar-initials"
          >
            {initials(characterName)}
          </div>
        )}
        {busy && (
          <div
            className="absolute inset-0 flex items-center justify-center rounded-full bg-black/60"
            role="status"
            aria-label="Uploading avatar"
          >
            <LoaderCircle className="h-5 w-5 animate-spin text-indigo-300" />
          </div>
        )}
      </div>

      <div className="space-y-1">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          aria-label="Upload avatar image"
          className="inline-flex items-center gap-1.5 rounded-md border border-slate-700/60 bg-slate-800/60 px-3 py-1.5 text-xs text-slate-300 transition-all duration-200 hover:border-slate-600 focus:ring-2 focus:ring-indigo-500/50 focus:outline-none disabled:opacity-50"
        >
          <ImagePlus className="h-3.5 w-3.5" aria-hidden="true" />
          Upload avatar
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          data-testid="avatar-file-input"
          onChange={(e) => void handleFile(e.target.files?.[0])}
          aria-hidden="true"
          tabIndex={-1}
        />
        {localError && (
          <p className="text-xs text-rose-400" role="alert">
            {localError}
          </p>
        )}
      </div>
    </div>
  );
}