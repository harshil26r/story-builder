import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { BookReader } from '../components/book/BookReader';
import { useStoryStore } from '../store/storyStore';
import { storiesApi } from '../services/api';
import { makeLinearStory } from './fixtures';

// TICKET-80: export buttons trigger a blob download with loading + error states.
describe('export buttons (TICKET-80)', () => {
  let clickSpy: ReturnType<typeof vi.spyOn>;

  const renderReader = () =>
    render(
      <MemoryRouter initialEntries={['/stories/s1']}>
        <Routes>
          <Route path="/stories/:id" element={<BookReader />} />
        </Routes>
      </MemoryRouter>,
    );

  beforeEach(() => {
    vi.restoreAllMocks();
    useStoryStore.setState({
      current: makeLinearStory(),
      status: 'success',
      error: null,
      conflict: null,
    });
    Object.defineProperty(URL, 'createObjectURL', {
      value: vi.fn(() => 'blob:mock-url'),
      writable: true,
      configurable: true,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      value: vi.fn(),
      writable: true,
      configurable: true,
    });
    clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it('PDF button downloads a blob and triggers an anchor click', async () => {
    vi.spyOn(storiesApi, 'exportPdf').mockResolvedValue(
      new Blob(['%PDF-1.7'], { type: 'application/pdf' }),
    );
    renderReader();

    fireEvent.click(screen.getByTestId('export-pdf'));

    await waitFor(() => expect(storiesApi.exportPdf).toHaveBeenCalledWith('s1'));
    await waitFor(() => expect(clickSpy).toHaveBeenCalled());
    expect(URL.createObjectURL).toHaveBeenCalled();
    const anchor = clickSpy.mock.contexts[0] as HTMLAnchorElement;
    expect(anchor.download).toMatch(/\.pdf$/);
  });

  it('EPUB button uses the epub API', async () => {
    vi.spyOn(storiesApi, 'exportEpub').mockResolvedValue(
      new Blob(['PK'], { type: 'application/epub+zip' }),
    );
    renderReader();

    fireEvent.click(screen.getByTestId('export-epub'));

    await waitFor(() => expect(storiesApi.exportEpub).toHaveBeenCalledWith('s1'));
  });

  it('shows a loading (disabled) state while the export is in flight', async () => {
    vi.spyOn(storiesApi, 'exportPdf').mockImplementation(() => new Promise(() => {}));
    renderReader();

    const btn = screen.getByTestId('export-pdf');
    fireEvent.click(btn);

    await waitFor(() => expect(btn).toBeDisabled());
  });

  it('shows an error message when export fails (incomplete story)', async () => {
    vi.spyOn(storiesApi, 'exportPdf').mockRejectedValue(
      new Error('This story has no content to export yet.'),
    );
    renderReader();

    fireEvent.click(screen.getByTestId('export-pdf'));

    expect(await screen.findByText(/no content to export/i)).toBeInTheDocument();
  });
});
