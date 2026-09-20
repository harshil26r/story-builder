import { useState } from 'react';
import { BookOpenText, Download, FileText, Moon, NotebookPen, Sun, Trash2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { Spinner } from '../ui/Spinner';
import type { ReaderMode, ReadingMode } from '../../store/uiStore';

export interface ReadingToolbarProps {
  readerMode: ReaderMode;
  onReaderModeChange: (mode: ReaderMode) => void;
  readingMode: ReadingMode;
  onReadingModeChange: (mode: ReadingMode) => void;
  onExport: (kind: 'pdf' | 'epub') => Promise<void>;
  onDelete?: () => void;
  onPublishToggle?: () => void;
  isPublic?: boolean;
  exporting?: 'pdf' | 'epub' | null;
}

export function ReadingToolbar({
  readerMode,
  onReaderModeChange,
  readingMode,
  onReadingModeChange,
  onExport,
  onDelete,
  onPublishToggle,
  isPublic,
  exporting,
}: ReadingToolbarProps) {
  const [exportError, setExportError] = useState<string | null>(null);

  const handleExport = async (kind: 'pdf' | 'epub') => {
    setExportError(null);
    try {
      await onExport(kind);
    } catch (e) {
      setExportError(e instanceof Error ? e.message : 'Export failed.');
    }
  };

  return (
    <div
      className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-800/80 bg-slate-900/70 p-2 shadow-lg shadow-black/30 backdrop-blur-md"
      data-testid="reading-toolbar"
      data-reading-mode={readingMode}
    >
      {/* Read/Edit toggle */}
      <div className="flex items-center rounded-md border border-slate-700/60 bg-slate-800/60 p-0.5">
        <button
          type="button"
          onClick={() => onReaderModeChange('read')}
          aria-pressed={readerMode === 'read'}
          className={`flex items-center gap-1 rounded px-2.5 py-1 text-xs transition-colors ${
            readerMode === 'read'
              ? 'bg-indigo-500/20 text-indigo-300'
              : 'text-slate-400 hover:text-slate-200'
          } focus:ring-2 focus:ring-indigo-500/50 focus:outline-none`}
        >
          <BookOpenText className="h-3.5 w-3.5" aria-hidden="true" />
          Read
        </button>
        <button
          type="button"
          onClick={() => onReaderModeChange('edit')}
          aria-pressed={readerMode === 'edit'}
          className={`flex items-center gap-1 rounded px-2.5 py-1 text-xs transition-colors ${
            readerMode === 'edit'
              ? 'bg-indigo-500/20 text-indigo-300'
              : 'text-slate-400 hover:text-slate-200'
          } focus:ring-2 focus:ring-indigo-500/50 focus:outline-none`}
        >
          <NotebookPen className="h-3.5 w-3.5" aria-hidden="true" />
          Edit
        </button>
      </div>

      {/* Reading mode toggle */}
      <button
        type="button"
        onClick={() => onReadingModeChange(readingMode === 'night' ? 'paper' : 'night')}
        aria-label={readingMode === 'night' ? 'Switch to paper mode' : 'Switch to night mode'}
        aria-pressed={readingMode === 'paper'}
        className="flex items-center gap-1.5 rounded-md border border-slate-700/60 bg-slate-800/60 px-2.5 py-1.5 text-xs text-slate-300 transition-colors hover:border-slate-600 focus:ring-2 focus:ring-indigo-500/50 focus:outline-none"
      >
        {readingMode === 'night' ? (
          <>
            <Moon className="h-3.5 w-3.5" aria-hidden="true" /> Night
          </>
        ) : (
          <>
            <Sun className="h-3.5 w-3.5" aria-hidden="true" /> Paper
          </>
        )}
      </button>

      {onPublishToggle && (
        <Button
          variant={isPublic ? 'secondary' : 'outline'}
          size="sm"
          onClick={onPublishToggle}
          data-testid="publish-toggle"
          aria-pressed={!!isPublic}
        >
          {isPublic ? 'Unpublish' : 'Publish'}
        </Button>
      )}

      <div className="ml-auto flex items-center gap-2">
        {exportError && <p className="text-xs text-rose-400">{exportError}</p>}
        <Button
          variant="outline"
          size="sm"
          onClick={() => void handleExport('pdf')}
          disabled={exporting === 'pdf'}
          data-testid="export-pdf"
        >
          {exporting === 'pdf' ? (
            <Spinner size="sm" />
          ) : (
            <FileText className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          PDF
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void handleExport('epub')}
          disabled={exporting === 'epub'}
          data-testid="export-epub"
        >
          {exporting === 'epub' ? (
            <Spinner size="sm" />
          ) : (
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          EPUB
        </Button>
        {onDelete && (
          <Button
            variant="danger"
            size="sm"
            onClick={onDelete}
            aria-label="Delete story"
            data-testid="delete-story"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
        )}
      </div>
    </div>
  );
}
