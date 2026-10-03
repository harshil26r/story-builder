import aiService from '../services/aiService.js';
import { sseStream } from '../utils/sse.js';

// StoryBuilder AI controller (SPEC §3.2/§3.3). Thin: parses the body, sets SSE
// headers once via sseStream, and hands off to aiService. HTTP always stays 200;
// provider/validation failures surface as an `error` event (never an HTML 500).

// ── POST /api/ai/generate-chapter ────────────────────────────────────────────
export function generateChapter(req, res) {
  const { storyId, chapterIndex, resumeGenerationId } = req.body;
  return sseStream(req, res, ({ io, signal }) =>
    aiService.generateChapter(
      { userId: req.session.userId, storyId, chapterIndex, resumeGenerationId },
      { io, signal },
    ),
  );
}

export function regenerateChapter(req, res) {
  const { chapterId, mode, resumeGenerationId } = req.body;
  return sseStream(req, res, ({ io, signal }) =>
    aiService.regenerateChapter(
      { userId: req.session.userId, storyId: req.params.id, chapterId, mode, resumeGenerationId },
      { io, signal },
    ),
  );
}

export function continueStory(req, res) {
  const { chaptersCount, resumeGenerationId } = req.body;
  return sseStream(req, res, ({ io, signal }) =>
    aiService.continueStory(
      { userId: req.session.userId, storyId: req.params.id, chaptersCount, resumeGenerationId },
      { io, signal },
    ),
  );
}

export function polishDraft(req, res) {
  const { storyId, chapterIndex } = req.body;
  return sseStream(req, res, ({ io, signal }) =>
    aiService.polishDraft({ userId: req.session.userId, storyId, chapterIndex }, { io, signal }),
  );
}

// ── POST /api/ai/generate-node ────────────────────────────────────────────────
export function generateNode(req, res) {
  const { storyId, parentNodeId } = req.body;
  return sseStream(req, res, ({ io, signal }) =>
    aiService.generateNode({ userId: req.session.userId, storyId, parentNodeId }, { io, signal }),
  );
}

// ── POST /api/ai/generate-cover (JSON, not SSE) ───────────────────────────────
export async function generateCover(req, res, next) {
  const { storyId, description } = req.body;
  try {
    const result = await aiService.generateCover({
      userId: req.session.userId,
      storyId,
      description,
    });
    return res.json(result);
  } catch (err) {
    return next(err);
  }
}

export default {
  generateChapter,
  regenerateChapter,
  continueStory,
  polishDraft,
  generateNode,
  generateCover,
};
