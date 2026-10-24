import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import crypto from 'crypto';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import EpubGen from 'epub-gen';
import sanitizeHtml from 'sanitize-html';
import { StoryIncompleteError } from '../utils/errors.js';

// StoryBuilder export service — PDF (pdf-lib) + EPUB (epub-gen) for
// single/linear stories (SPEC §7 Export, TICKET-78). Branching exports are a
// separate concern. Clean reflow, not pixel-perfect UI matching:
// 2cm margins, serif body, drop caps, chapter headers, page numbers, TOC.

const PAGE_W = 595.28; // A4 portrait, points
const PAGE_H = 841.89;
const MARGIN = 2 * 28.3465; // 2cm
const CONTENT_W = PAGE_W - MARGIN * 2;
const BODY_SIZE = 11;
const LEADING = 16;

const INK = rgb(0.12, 0.1, 0.09);
const MUTED = rgb(0.45, 0.42, 0.4);

function assertComplete(chapters) {
  const hasContent =
    Array.isArray(chapters) &&
    chapters.some((c) => typeof c.content === 'string' && c.content.trim().length > 0);
  if (!hasContent) throw new StoryIncompleteError();
}

function orderedChapters(chapters) {
  return [...chapters].sort((a, b) => (a.order || 0) - (b.order || 0));
}

// Greedy word-wrap against a measured font.
function wrapText(text, font, size, maxWidth) {
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      line = candidate;
    } else {
      if (line) lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

async function toPdf(story = {}, chapters = []) {
  assertComplete(chapters);
  const ordered = orderedChapters(chapters);

  const doc = await PDFDocument.create();
  doc.setTitle(story.title || 'Untitled Story');
  doc.setAuthor(story.authorName || 'Story Builder');
  const serif = await doc.embedFont(StandardFonts.TimesRoman);
  const serifBold = await doc.embedFont(StandardFonts.TimesRomanBold);

  // ── Table of contents (multi-chapter / linear) ─────────────────────────────
  if (ordered.length > 1) {
    let page = doc.addPage([PAGE_W, PAGE_H]);
    let y = PAGE_H - MARGIN;
    page.drawText('Contents', { x: MARGIN, y, size: 20, font: serifBold, color: INK });
    y -= 34;
    for (const ch of ordered) {
      const label = `${ch.order}. ${ch.title || `Chapter ${ch.order}`}`;
      page.drawText(label, { x: MARGIN, y, size: BODY_SIZE, font: serif, color: INK });
      y -= LEADING;
    }
  }

  // ── Chapters ───────────────────────────────────────────────────────────────
  for (const ch of ordered) {
    let page = doc.addPage([PAGE_W, PAGE_H]);
    let y = PAGE_H - MARGIN;

    page.drawText(`${ch.order}. ${ch.title || `Chapter ${ch.order}`}`, {
      x: MARGIN,
      y,
      size: 18,
      font: serifBold,
      color: INK,
    });
    y -= 30;

    const paragraphs = String(ch.content || '').split(/\n{2,}/);
    let dropCapPending = true;

    for (const paragraph of paragraphs) {
      const text = paragraph.trim();
      if (!text) continue;

      if (dropCapPending) {
        // Drop cap: first glyph larger, remainder flows after it on line one.
        const first = text.charAt(0);
        const rest = text.slice(1).trimStart();
        page.drawText(first, { x: MARGIN, y: y - 8, size: 30, font: serifBold, color: INK });
        const firstWidth = serifBold.widthOfTextAtSize(first, 30) + 6;
        const lines = wrapText(rest, serif, BODY_SIZE, CONTENT_W - firstWidth);
        if (lines.length) {
          page.drawText(lines[0], {
            x: MARGIN + firstWidth,
            y,
            size: BODY_SIZE,
            font: serif,
            color: INK,
          });
          for (let i = 1; i < lines.length; i += 1) {
            y -= LEADING;
            if (y < MARGIN) {
              page = doc.addPage([PAGE_W, PAGE_H]);
              y = PAGE_H - MARGIN;
            }
            page.drawText(lines[i], { x: MARGIN, y, size: BODY_SIZE, font: serif, color: INK });
          }
        }
        dropCapPending = false;
      } else {
        const lines = wrapText(text, serif, BODY_SIZE, CONTENT_W);
        for (const line of lines) {
          page.drawText(line, { x: MARGIN, y, size: BODY_SIZE, font: serif, color: INK });
          y -= LEADING;
          if (y < MARGIN) {
            page = doc.addPage([PAGE_W, PAGE_H]);
            y = PAGE_H - MARGIN;
          }
        }
      }
      y -= LEADING * 0.4; // paragraph gap
    }
  }

  // ── Page numbers ───────────────────────────────────────────────────────────
  const pages = doc.getPages();
  pages.forEach((page, index) => {
    const label = String(index + 1);
    page.drawText(label, {
      x: PAGE_W / 2 - serif.widthOfTextAtSize(label, 9) / 2,
      y: MARGIN / 2,
      size: 9,
      font: serif,
      color: MUTED,
    });
  });

  return Buffer.from(await doc.save());
}

function chapterHtml(chapter) {
  const blocks = String(chapter.content || '')
    .split(/\n{2,}/)
    .map((b) => sanitizeHtml(b.trim(), { allowedTags: [], allowedAttributes: {} }))
    .filter(Boolean)
    .map((b) => `<p>${b}</p>`)
    .join('\n');
  const title = sanitizeHtml(chapter.title || `Chapter ${chapter.order}`, { allowedTags: [] });
  return `<h1>${title}</h1>\n${blocks}`;
}

async function toEpub(story = {}, chapters = []) {
  assertComplete(chapters);
  const ordered = orderedChapters(chapters);

  const tmpDir = path.join(os.tmpdir(), `sb-epub-${crypto.randomBytes(8).toString('hex')}`);
  await fs.mkdir(tmpDir, { recursive: true });
  const output = path.join(tmpDir, 'story.epub');

  const content = ordered.map((ch) => ({
    title: ch.title || `Chapter ${ch.order}`,
    data: chapterHtml(ch),
  }));

  const options = {
    title: story.title || 'Untitled Story',
    author: story.authorName || 'Story Builder',
    output,
    version: 3,
    lang: 'en',
    tocTitle: 'Contents',
    content,
  };
  if (story.coverImageUrl) {
    const cover = String(story.coverImageUrl).trim();
    try {
      const url = new URL(cover);
      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        throw new Error('Invalid cover URL');
      }
      const hostname = url.hostname.toLowerCase();
      if (
        hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname === '::1' ||
        hostname === '0.0.0.0' ||
        /^10\./.test(hostname) ||
        /^192\.168\./.test(hostname) ||
        /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname) ||
        /^169\.254\./.test(hostname) ||
        /^fc00:|^fd[0-9a-f]{2}:|^fe80:/i.test(hostname)
      ) {
        throw new Error('Invalid cover URL');
      }
      options.cover = cover;
    } catch (err) {
      // Only allow validated public http(s) URLs as covers; skip otherwise
      // to prevent LFI/SSRF
    }
  }

  try {
    await new EpubGen(options).promise;
    return await fs.readFile(output);
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
}

export { toPdf, toEpub };
export default { toPdf, toEpub };
