import storyService from '../services/storyService.js';
import { toPdf, toEpub } from '../services/exportService.js';

// StoryBuilder export controller (SPEC §3.2 Export, TICKET-79).
// Loads the owned, expanded story (404 for cross-user) and streams the file
// back as an attachment. Empty stories surface as 409 STORY_INCOMPLETE.

function slug(title) {
  return (
    String(title || 'story')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'story'
  );
}

function safeName(title, ext) {
  return `${slug(title)}.${ext}`;
}

export async function pdf(req, res, next) {
  try {
    const story = await storyService.get(req.user._id, req.params.id);
    const buffer = await toPdf(story, story.chapters || []);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName(story.title, 'pdf')}"`);
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  } catch (err) {
    next(err);
  }
}

export async function epub(req, res, next) {
  try {
    const story = await storyService.get(req.user._id, req.params.id);
    const buffer = await toEpub(story, story.chapters || []);
    res.setHeader('Content-Type', 'application/epub+zip');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName(story.title, 'epub')}"`);
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  } catch (err) {
    next(err);
  }
}

export default { pdf, epub };
