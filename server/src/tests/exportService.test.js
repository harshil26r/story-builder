import { describe, it, expect } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { toPdf, toEpub } from '../services/exportService.js';
import { StoryIncompleteError } from '../utils/errors.js';

// TICKET-78: export service — PDF via pdf-lib, EPUB via epub-gen (ACR-B-17,
// ACR-B-18). Empty/draft story → StoryIncompleteError.
const story = {
  title: 'The Clockwork Heart',
  genre: 'fantasy',
  tone: 'wistful',
  pov: '3rd',
};

const chapters = [
  {
    order: 1,
    title: 'The Brass Heart',
    summary: 'A clockmaker finds a living heart.',
    content:
      'Mara turned the key. The brass heart beat once, then again.\n\nShe stepped back, breath held.',
  },
  {
    order: 2,
    title: 'The Long Night',
    summary: 'The heart restores a dead bird.',
    content: 'By midnight the workshop was full of wings.\n\nEvery clock had stopped.',
  },
];

describe('exportService (TICKET-78)', () => {
  it('toPdf returns a Buffer beginning with %PDF', async () => {
    const buf = await toPdf(story, chapters);
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.subarray(0, 4).toString('latin1')).toBe('%PDF');
    expect(buf.length).toBeGreaterThan(1000);
  });

  it('toPdf includes a TOC for multi-chapter (linear) stories', async () => {
    const buf = await toPdf(story, chapters);
    const pdf = await PDFDocument.load(buf);
    // A TOC page + chapter pages => at least 3 pages.
    expect(pdf.getPageCount()).toBeGreaterThanOrEqual(3);
  });

  it('toEpub returns a valid zip buffer with mimetype and chapters', async () => {
    const buf = await toEpub(story, chapters);
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.subarray(0, 2).toString('latin1')).toBe('PK');
    expect(buf.includes(Buffer.from('mimetype'))).toBe(true);
  });

  it('throws StoryIncompleteError for an empty chapter list', async () => {
    await expect(toPdf(story, [])).rejects.toBeInstanceOf(StoryIncompleteError);
    await expect(toEpub(story, [])).rejects.toBeInstanceOf(StoryIncompleteError);
  });

  it('throws StoryIncompleteError when every chapter is blank', async () => {
    const blank = [{ order: 1, title: 'Empty', content: '   ', summary: '' }];
    await expect(toPdf(story, blank)).rejects.toBeInstanceOf(StoryIncompleteError);
  });
});
