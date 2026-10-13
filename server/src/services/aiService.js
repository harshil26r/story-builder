import crypto from 'crypto';
import Story from '../models/Story.js';
import Chapter from '../models/Chapter.js';
import Character from '../models/Character.js';
import BranchNode from '../models/BranchNode.js';
import { client, model, maxTokensPerChapter } from '../config/gemini.js';
import {
  buildSystemPrompt,
  buildSummaryBlock,
  buildChapterPrompt,
  buildPolishPrompt,
  buildCoverPrompt,
} from './promptTemplates.js';
import { recordAiUsage } from '../middleware/rateLimit.js';
import { AppError, NotFoundError } from '../utils/errors.js';
import { saveChapterVersion, computeWordCount } from './storyService.js';
import nodeService from './nodeService.js';

// StoryBuilder AI service — SPEC §3.3/§3.4 (TICKET-52, 55, 56, 57).
// Orphaned SSE is killed via internal AbortControllers linked to the request's
// 'close' event (the route wires it to the passed `signal`).

const SNAPSHOT_EVERY = 25;
const JOB_TTL_MS = 10 * 60 * 1000;
const MAX_RESUMES = 1;
const OVERFLOW_ROUNDS = 8; // hard cap on max_tokens continuation rounds

const jobs = new Map();
let jobSweep = null;

function newJobId() {
  return crypto.randomBytes(12).toString('hex');
}

function scheduleSweep() {
  if (jobSweep) clearTimeout(jobSweep);
  jobSweep = setTimeout(() => {
    const cutoff = Date.now() - JOB_TTL_MS;
    for (const [id, job] of jobs) {
      if (job.createdAt < cutoff) jobs.delete(id);
    }
    jobSweep = null;
  }, JOB_TTL_MS);
  jobSweep.unref?.();
}

function emit(io, event, data) {
  if (io && typeof io.send === 'function') io.send(event, data);
}

function emitError(io, code, message) {
  emit(io, 'error', { code, message });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function words(text) {
  return typeof text === 'string' && text.trim() ? text.trim().split(/\s+/).length : 0;
}

async function loadExpandedStory(storyId) {
  const story = await Story.findById(storyId);
  if (!story) throw new NotFoundError('Story not found.');
  const characters = await Character.find({ _id: { $in: story.characters || [] } })
    .lean()
    .exec();
  return { story, characters: characters.map((c) => ({ ...c, _id: String(c._id) })) };
}

async function loadOwnedStory(userId, storyId) {
  const { story, characters } = await loadExpandedStory(storyId);
  if (story.userId.toString() !== String(userId)) {
    throw new NotFoundError('Story not found.');
  }
  return { story, characters };
}

function buildSystemBlocks({ story, characters }) {
  const systemText = buildSystemPrompt({
    genre: story.genre,
    tone: story.tone,
    audience: story.targetAudience,
    pov: story.pov,
    structureType: story.structureType,
    characters,
  });
  // Cached system block (SPEC §6.7) — byte-identical across chapters.
  return [{ type: 'text', text: systemText, cache_control: { type: 'ephemeral' } }];
}

async function priorChapterContext(storyId, chapterIndex) {
  const prior = await Chapter.find({ storyId, order: { $lt: chapterIndex } })
    .sort({ order: 1 })
    .lean()
    .exec();
  const summaries = prior.map((c) => ({ order: c.order, summary: c.summary || '' }));
  const lastLine = prior.length ? prior[prior.length - 1].content : '';
  return { summaries, lastLine };
}

function deriveGoal(story, summaries, chapterIndex) {
  if (chapterIndex === 1) return story.premise;
  const last = summaries.length ? summaries[summaries.length - 1].summary : '';
  return `Continuation from the prior chapter${last ? `: ${last}` : '.'}`;
}

// ── Branching (TICKET-75) ─────────────────────────────────────────────────────

// Parses [[CHOICE: label]] markers from an AI node scene (SPEC §6.1 branching).
// Labels are trimmed, deduped (case-insensitive), length-checked (2..80), and
// capped at 4. The 0/1-vs-2-4 attachment decision lives in generateNode.
export function parseNodeChoices(text) {
  const lines = typeof text === 'string' ? text.split('\n') : [];
  const seen = new Set();
  const labels = [];
  for (const line of lines) {
    const match = /\[\[CHOICE:\s*([^\]]+)\]\]/.exec(line);
    if (!match) continue;
    const label = match[1].trim();
    if (label.length < 2 || label.length > 80) continue;
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    labels.push(label);
    if (labels.length >= 4) break;
  }
  return labels;
}

// Walks the parent chain upward collecting summaries (capped like consistency
// chaining) + the closing line of the immediate parent for the "CURRENT EVENT".
async function priorNodeContext(storyId, parentNodeId) {
  const summaries = [];
  let lastLine = '';
  if (parentNodeId) {
    const parent = await BranchNode.findById(parentNodeId).exec();
    if (!parent || parent.storyId.toString() !== String(storyId)) {
      throw new NotFoundError('Parent branch node not found.');
    }
    lastLine = parent.content || '';
    const chain = [];
    let current = parent;
    while (current && chain.length < 5) {
      chain.unshift(current);
      if (!current.parentId) break;
      current = await BranchNode.findById(current.parentId).exec();
    }
    chain.forEach((n, i) => {
      if (n && n.summary) summaries.push({ order: i + 1, summary: n.summary });
    });
  }
  return { summaries, lastLine };
}

function buildNodePrompt({ story, summaryBlock, opening }) {
  return [
    'USER TURN — BRANCHING SCENE',
    '',
    summaryBlock || '',
    '',
    '== THIS SCENE ==',
    `Story: ${story.title || 'Untitled'}`,
    `Premise: ${story.premise || ''}`,
    opening || 'Continue from the scene established in the STORY SO FAR.',
    'Write ONE self-contained scene from a single point of view. It must be',
    'comprehensible on its own — a reader may arrive here via any path — while',
    'honoring every entry in the STORY SO FAR.',
    'End the scene with 2–4 choices, each on its own final line, formatted',
    'exactly as: [[CHOICE: label]]. Labels are second-person, concrete,',
    'in-fiction reader actions — e.g. [[CHOICE: Descend into the crypt]].',
    'Word budget: ~700 words.',
    '',
    'Write the scene now.',
  ].join('\n');
}

async function generateSummary(text, opts = {}) {
  const res = await client.messages.create(
    {
      model,
      max_tokens: 300,
      messages: [
        {
          role: 'user',
          content: `Summarize the following chapter in 2–3 sentences for story consistency chaining. Keep names and outcomes exact.\n\n${text}`,
        },
      ],
    },
    opts,
  );
  return (res.content || [])
    .map((b) => (b.type === 'text' ? b.text : ''))
    .join('')
    .trim();
}

function buildChapterMessages({
  story,
  characters,
  summaryBlock,
  chapterIndex,
  chapterGoal,
  resumeFrom,
}) {
  const userTurn = buildChapterPrompt({
    story,
    characters,
    summaryBlock,
    chapterIndex,
    total: Math.max(story.totalChapters || 1, chapterIndex),
    chapterGoal,
  });
  const messages = [{ role: 'user', content: userTurn }];
  if (resumeFrom) {
    messages.push({ role: 'assistant', content: resumeFrom });
    messages.push({
      role: 'user',
      content: 'Continue the chapter from the point above, staying in the same voice.',
    });
  }
  return messages;
}

async function consumeStream(stream, { job, io }) {
  let text = '';
  let deltas = 0;
  let tokensUsed = 0;
  let stopReason = '';
  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta && event.delta.type === 'text_delta') {
      const chunk = event.delta.text || '';
      text += chunk;
      deltas += 1;
      emit(io, 'delta', { text: chunk });
      if (deltas > 0 && deltas % SNAPSHOT_EVERY === 0) {
        emit(io, 'snapshot', {
          jobId: job.id,
          chapterIndex: job.chapterIndex,
          fullTextSoFar: text,
        });
      }
    } else if (event.type === 'message_delta') {
      if (event.usage && event.usage.output_tokens) tokensUsed = event.usage.output_tokens;
      if (event.delta && event.delta.stop_reason) stopReason = event.delta.stop_reason;
    } else if (event.type === 'message_stop') {
      break;
    } else if (event.type === 'error') {
      throw new Error(
        event.error && event.error.message ? event.error.message : 'provider stream error',
      );
    }
    if (job.abort.signal.aborted) break;
  }
  return { text, tokensUsed, stopReason };
}

// One provider call with backoff retries (SPEC §3.3 / ACR-B-16). Returns the
// live stream, or null after emitting AI_UNAVAILABLE when the provider stays
// down. Transient 503/429/network blips are retried up to 2 extra times with
// escalating delay so short load spikes don't kill a generation.
const OPEN_STREAM_RETRIES = 2;
const OPEN_STREAM_BACKOFF_MS = 400;

async function openStream(system, messages, job, io) {
  const call = () =>
    client.messages.stream(
      { model, max_tokens: maxTokensPerChapter, system, messages },
      { signal: job.abort.signal },
    );
  for (let attempt = 0; attempt <= OPEN_STREAM_RETRIES; attempt += 1) {
    if (attempt > 0) {
      if (job.abort.signal.aborted) return null;
      await sleep(OPEN_STREAM_BACKOFF_MS * 2 ** (attempt - 1));
    }
    try {
      return await call();
    } catch {
      // fall through to the next attempt
    }
  }
  emitError(io, 'AI_UNAVAILABLE', 'The AI provider could not be reached. Try again shortly.');
  return null;
}

async function commitChapter({ story, job, fullText, summary, persist }) {
  if (persist && persist.mode === 'version') {
    const chapter = await saveChapterVersion({
      chapterId: persist.chapterId,
      content: fullText,
      summary,
      mode: 'ai',
    });
    return chapter;
  }
  return Chapter.create({
    storyId: story._id,
    order: job.chapterIndex,
    title: story.title || `Chapter ${job.chapterIndex}`,
    content: fullText,
    summary,
    isAIGenerated: true,
    generatedAt: new Date(),
    version: 1,
    versions: [{ version: 1, content: fullText, summary, modifiedAt: new Date(), mode: 'ai' }],
  });
}

// ── Generation core ──────────────────────────────────────────────────────────

// Runs the chapter generation for one job. `resumeFrom` replays an orphaned
// partial chapter; token overflow (stop_reason === 'max_tokens') continues with
// follow-up calls, merging the text (SPEC §3.4, ACR-B-15).
async function runGeneration({ job, io, story, characters, resumeFrom, persist }) {
  const { summaries, lastLine } = await priorChapterContext(story._id, job.chapterIndex);
  const summaryBlock = buildSummaryBlock({ summaries, lastLine });
  const chapterGoal = deriveGoal(story, summaries, job.chapterIndex);
  const system = buildSystemBlocks({ story, characters });

  let seed = resumeFrom || '';
  let fullText = '';
  let tokensUsed = 0;
  let stopReason = '';
  let summary = '';

  for (let round = 0; round < OVERFLOW_ROUNDS; round += 1) {
    const messages = buildChapterMessages({
      story,
      characters,
      summaryBlock,
      chapterIndex: job.chapterIndex,
      chapterGoal,
      resumeFrom: round === 0 ? seed : fullText,
    });

    const stream = await openStream(system, messages, job, io);
    if (!stream) return; // openStream already emitted AI_UNAVAILABLE

    let text;
    let used;
    try {
      ({ text, tokensUsed: used, stopReason } = await consumeStream(stream, { job, io }));
    } catch (err) {
      if (job.abort.signal.aborted) return; // client is gone — stay silent
      emitError(io, 'AI_UNAVAILABLE', err instanceof Error ? err.message : 'Stream interrupted.');
      return;
    }
    fullText += text;
    tokensUsed += used;
    if (stopReason !== 'max_tokens' || !text.trim()) break; // skip empty degenerate overflow rounds
  }

  if (!fullText.trim()) {
    emitError(
      io,
      'AI_UNAVAILABLE',
      'The AI provider did not return any text. Please try again shortly.',
    );
    return;
  }

  job.text = fullText;
  summary = await generateSummary(fullText || '', { signal: job.abort.signal });
  if (job.abort.signal.aborted) return; // client disconnected during summary — skip commit
  emit(io, 'snapshot', { jobId: job.id, chapterIndex: job.chapterIndex, fullTextSoFar: fullText });
  emit(io, 'summary', { summary });

  const content = fullText.trim();
  const chapter = await commitChapter({ story, job, fullText: content, summary, persist });

  const wordCount = words(content);
  story.totalChapters = Math.max(story.totalChapters || 0, job.chapterIndex);
  story.wordCount = await computeWordCount(story._id);
  story.version = (story.version || 1) + 1;
  await story.save();

  await recordAiUsage(String(story.userId), tokensUsed || Math.max(1, wordCount));

  emit(io, 'done', {
    jobId: job.id,
    saved: {
      _id: String(chapter._id),
      storyId: String(story._id),
      order: chapter.order,
      title: chapter.title,
      content: chapter.content,
      summary: chapter.summary,
      version: chapter.version,
      totalChapters: story.totalChapters,
      wordCount,
    },
  });
}

function createJob(story, chapterIndex) {
  const id = newJobId();
  const job = {
    id,
    chapterIndex,
    text: '',
    retries: 0,
    resumeUsed: 0,
    createdAt: Date.now(),
    abort: new AbortController(),
  };
  jobs.set(id, job);
  return job;
}

function linkSignal(job, signal) {
  if (signal) signal.addEventListener('abort', () => job.abort.abort(), { once: true });
}

function findResumable(resumeGenerationId, entries) {
  if (!resumeGenerationId) return { index: 0, resuming: false };
  const index = entries.findIndex((e) => e.job.id === resumeGenerationId);
  if (index === -1) return { index: 0, resuming: false };
  const job = entries[index].job;
  if (job.resumeUsed >= MAX_RESUMES) {
    throw new AppError('RESUME_EXHAUSTED', 'This generation can no longer be resumed.', 400);
  }
  return { index, resuming: true };
}

// Runs an ordered sequence of chapter jobs in one SSE stream. Each chapter owns
// an abort controller; the shared `signal` aborts all of them. Resuming replays
// from the interrupted chapter (doc-start + snapshot) then continues the rest.
async function runChapters({ story, characters, entries, io, signal, resumeGenerationId }) {
  entries.forEach((e) => linkSignal(e.job, signal));
  scheduleSweep();

  const { index: startIndex, resuming } = findResumable(resumeGenerationId, entries);

  for (let i = startIndex; i < entries.length; i += 1) {
    const entry = entries[i];
    const job = entry.job;

    const resumingThis = resuming && i === startIndex;
    if (resumingThis) {
      // Consume the single resume slot for this job (ACR-B-14).
      entry.job.resumeUsed += 1;
      emit(io, 'doc-start', {
        jobId: job.id,
        storyId: String(story._id),
        structureType: story.structureType,
        chapterIndex: job.chapterIndex,
        title: story.title || `Chapter ${job.chapterIndex}`,
      });
      emit(io, 'snapshot', {
        jobId: job.id,
        chapterIndex: job.chapterIndex,
        fullTextSoFar: job.text,
      });
      await runGeneration({
        job,
        io,
        story,
        characters,
        resumeFrom: job.text,
        persist: entry.persist,
      });
    } else {
      emit(io, 'doc-start', {
        jobId: job.id,
        storyId: String(story._id),
        structureType: story.structureType,
        chapterIndex: job.chapterIndex,
        title: story.title || `Chapter ${job.chapterIndex}`,
      });
      await runGeneration({ job, io, story, characters, persist: entry.persist });
    }

    if (job.abort.signal.aborted) break;
  }
}

// ── Exported service ─────────────────────────────────────────────────────────

export async function generateChapter(
  { userId, storyId, chapterIndex, resumeGenerationId },
  { io, signal } = {},
) {
  if (!client) {
    emitError(io, 'AI_UNAVAILABLE', 'AI generation is not configured on this server.');
    return;
  }
  const { story, characters } = await loadOwnedStory(userId, storyId);
  if (story.structureType === 'branching') {
    throw new AppError('VALIDATION_ERROR', 'Branching stories generate nodes, not chapters.', 400);
  }
  if (resumeGenerationId) {
    const job = jobs.get(resumeGenerationId);
    if (!job || job.resumeUsed >= MAX_RESUMES) {
      emitError(io, 'RESUME_EXHAUSTED', 'This generation can no longer be resumed.');
      return;
    }
    job.resumeUsed += 1;
    linkSignal(job, signal);
    emit(io, 'doc-start', {
      jobId: job.id,
      storyId: String(story._id),
      structureType: story.structureType,
      chapterIndex: job.chapterIndex,
      title: story.title || `Chapter ${job.chapterIndex}`,
    });
    emit(io, 'snapshot', {
      jobId: job.id,
      chapterIndex: job.chapterIndex,
      fullTextSoFar: job.text,
    });
    await runGeneration({ job, io, story, characters, resumeFrom: job.text });
    return;
  }

  const job = createJob(story, chapterIndex);
  job.storyId = story._id;
  linkSignal(job, signal);

  await runChapters({ story, characters, entries: [{ job, persist: null }], io, signal });
}

// TICKET-57: regenerate chapter N (mode 'only') or N..end (mode 'onward').
// Branching stories cannot regenerate chapters → 400 (SPEC §3.4).
export async function regenerateChapter(
  { userId, storyId, chapterId, mode = 'only', resumeGenerationId },
  { io, signal } = {},
) {
  if (!client) {
    emitError(io, 'AI_UNAVAILABLE', 'AI generation is not configured on this server.');
    return;
  }
  const { story, characters } = await loadOwnedStory(userId, storyId);
  if (story.structureType === 'branching') {
    throw new AppError('VALIDATION_ERROR', 'Branching stories cannot regenerate chapters.', 400);
  }
  const target = await Chapter.findById(chapterId);
  if (!target || target.storyId.toString() !== story._id.toString()) {
    throw new NotFoundError('Chapter not found.');
  }
  const startOrder = target.order;
  const endOrder =
    mode === 'onward' ? Math.max(story.totalChapters || startOrder, startOrder) : startOrder;

  const chapters = await Chapter.find({
    storyId: story._id,
    order: { $gte: startOrder, $lte: endOrder },
  })
    .sort({ order: 1 })
    .exec();

  const byOrder = new Map(chapters.map((c) => [c.order, c]));
  const entries = [];
  for (let order = startOrder; order <= endOrder; order += 1) {
    const existing = byOrder.get(order);
    const job = createJob(story, order);
    job.storyId = story._id;
    entries.push({
      job,
      persist: existing ? { mode: 'version', chapterId: existing._id } : null,
    });
  }

  await runChapters({ story, characters, entries, io, signal, resumeGenerationId });
}

// TICKET-57: append `chaptersCount` chapters chained off the current last one.
export async function continueStory(
  { userId, storyId, chaptersCount = 1, resumeGenerationId },
  { io, signal } = {},
) {
  if (!client) {
    emitError(io, 'AI_UNAVAILABLE', 'AI generation is not configured on this server.');
    return;
  }
  const { story, characters } = await loadOwnedStory(userId, storyId);
  if (story.structureType === 'branching') {
    throw new AppError('VALIDATION_ERROR', 'Branching stories cannot continue chapters.', 400);
  }
  const last = await Chapter.find({ storyId: story._id })
    .sort({ order: -1 })
    .limit(1)
    .lean()
    .exec();
  const nextOrder = (last[0]?.order ?? story.totalChapters ?? 0) + 1;

  const count = Math.max(1, Number(chaptersCount) || 1);
  const entries = [];
  for (let order = nextOrder; order < nextOrder + count; order += 1) {
    const job = createJob(story, order);
    job.storyId = story._id;
    entries.push({ job, persist: null });
  }

  await runChapters({ story, characters, entries, io, signal, resumeGenerationId });
}

// TICKET-76: polish a user draft. The output REPLACES chapter.content; the
// original draft is preserved in chapter.draftContent and pushed as a
// mode:'user' version snapshot (never overwritten, ACR-B-12).
export async function polishDraft({ userId, storyId, chapterIndex }, { io, signal } = {}) {
  if (!client) {
    emitError(io, 'AI_UNAVAILABLE', 'AI generation is not configured on this server.');
    return;
  }
  const { story, characters } = await loadOwnedStory(userId, storyId);
  if (story.structureType === 'branching') {
    throw new AppError('VALIDATION_ERROR', 'Branching stories cannot polish chapters.', 400);
  }
  const chapter = await Chapter.findOne({ storyId: story._id, order: chapterIndex });
  if (!chapter) throw new NotFoundError('Chapter not found.');
  const draft = chapter.draftContent || chapter.content || '';

  const job = createJob(story, chapterIndex);
  job.storyId = story._id;
  linkSignal(job, signal);
  scheduleSweep();

  emit(io, 'doc-start', {
    jobId: job.id,
    storyId: String(story._id),
    structureType: story.structureType,
    chapterIndex,
    title: story.title || `Chapter ${chapterIndex}`,
  });

  const system = buildSystemBlocks({ story, characters });
  const messages = [{ role: 'user', content: buildPolishPrompt({ draft, story }) }];
  const stream = await openStream(system, messages, job, io);
  if (!stream) return;

  let polished = '';
  let tokensUsed = 0;
  try {
    ({ text: polished, tokensUsed } = await consumeStream(stream, { job, io }));
  } catch (err) {
    if (job.abort.signal.aborted) return;
    emitError(io, 'AI_UNAVAILABLE', err instanceof Error ? err.message : 'Stream interrupted.');
    return;
  }

  if (!polished.trim()) {
    emitError(
      io,
      'AI_UNAVAILABLE',
      'The AI provider did not return any text. Please try again shortly.',
    );
    return;
  }

  emit(io, 'snapshot', { jobId: job.id, chapterIndex, fullTextSoFar: polished });

  const originalDraft = chapter.draftContent || chapter.content || '';
  const retained = chapter.versions || [];
  const nextVersion = retained.length ? retained[retained.length - 1].version + 1 : 1;
  const retention = Number(process.env.CONTENT_VERSION_RETENTION) || 10;
  const snapshots = [...retained];
  snapshots.push({
    version: nextVersion,
    content: originalDraft,
    summary: chapter.summary,
    modifiedAt: new Date(),
    mode: 'user',
  });
  chapter.versions = snapshots.slice(-retention);
  chapter.version = nextVersion;
  chapter.draftContent = chapter.draftContent || chapter.content || '';
  chapter.content = polished.trim();
  await chapter.save();

  story.wordCount = await computeWordCount(story._id);
  await story.save();
  await recordAiUsage(String(story.userId), tokensUsed || 1);

  emit(io, 'done', {
    jobId: job.id,
    saved: {
      _id: String(chapter._id),
      storyId: String(story._id),
      order: chapter.order,
      title: chapter.title,
      content: chapter.content,
      summary: chapter.summary,
      version: chapter.version,
      totalChapters: story.totalChapters,
      wordCount: story.wordCount,
      draftContent: chapter.draftContent,
    },
  });
}

// TICKET-75: generate a branching scene node streamed over SSE. The node is
// pre-created as a draft (stable nodeId for doc-start), then filled with the
// streamed scene + summary and finished with nodeService.addChoice for each
// valid [[CHOICE: label]] (2–4 per SPEC §6.1). Fewer than 2 valid labels →
// the node is persisted as a draft with no choices; 5+ → clamped to 4.
export async function generateNode({ userId, storyId, parentNodeId }, { io, signal } = {}) {
  if (!client) {
    emitError(io, 'AI_UNAVAILABLE', 'AI generation is not configured on this server.');
    return;
  }
  const { story, characters } = await loadOwnedStory(userId, storyId);
  if (story.structureType !== 'branching') {
    throw new AppError('VALIDATION_ERROR', 'Only branching stories generate nodes.', 400);
  }

  const { summaries, lastLine } = await priorNodeContext(story._id, parentNodeId || null);
  const summaryBlock = buildSummaryBlock({ summaries, lastLine });

  const job = createJob(story, 1);
  job.storyId = story._id;
  linkSignal(job, signal);
  scheduleSweep();

  const node = await nodeService.create(userId, storyId, {
    parentId: parentNodeId || null,
    title: story.title || '',
  });
  node.isAIGenerated = true;
  await node.save();

  // The node is pre-created so the client gets a stable id at doc-start. Until
  // the scene is actually committed, any early exit (abort, provider error,
  // empty text) must clean it up or the story accumulates orphan draft nodes.
  let committed = false;
  try {
    const opening =
      !parentNodeId && summaries.length === 0
        ? 'This is the opening scene of the story.'
        : 'Continue from the scene established in the STORY SO FAR.';
    emit(io, 'doc-start', {
      jobId: job.id,
      storyId: String(story._id),
      structureType: 'branching',
      chapterIndex: job.chapterIndex,
      title: node.title || story.title || '',
      nodeId: String(node._id),
    });

    const system = buildSystemBlocks({ story, characters });
    const messages = [{ role: 'user', content: buildNodePrompt({ story, summaryBlock, opening }) }];
    const stream = await openStream(system, messages, job, io);
    if (!stream) return;

    let scene = '';
    let tokensUsed = 0;
    try {
      ({ text: scene, tokensUsed } = await consumeStream(stream, { job, io }));
    } catch (err) {
      if (job.abort.signal.aborted) return;
      emitError(io, 'AI_UNAVAILABLE', err instanceof Error ? err.message : 'Stream interrupted.');
      return;
    }
    if (job.abort.signal.aborted) return;

    if (!scene.trim()) {
      emitError(
        io,
        'AI_UNAVAILABLE',
        'The AI provider did not return any text. Please try again shortly.',
      );
      return;
    }

    const content = scene.trim();
    const summary = await generateSummary(content || '', { signal: job.abort.signal });
    emit(io, 'snapshot', {
      jobId: job.id,
      chapterIndex: job.chapterIndex,
      fullTextSoFar: content,
    });
    emit(io, 'summary', { summary });

    const parsed = parseNodeChoices(content || '');
    const labels = parsed.length >= 2 ? parsed.slice(0, 4) : [];

    node.title = story.title || 'Branch';
    node.content = content;
    node.summary = summary;
    await node.save();

    for (const label of labels) {
      await nodeService.addChoice(userId, node._id, { label });
    }

    const savedNode = await BranchNode.findById(node._id);

    // Branching stories have no chapters — aggregate across every node.
    story.wordCount = await nodeService.computeNodeWordCount(story._id);
    story.version = (story.version || 1) + 1;
    await story.save();
    await recordAiUsage(String(userId), tokensUsed || Math.max(1, words(content)));

    const totalNodes = await BranchNode.countDocuments({ storyId: story._id });

    emit(io, 'done', {
      jobId: job.id,
      saved: {
        _id: String(savedNode._id),
        storyId: String(story._id),
        title: savedNode.title,
        content: savedNode.content,
        summary: savedNode.summary,
        version: savedNode.version,
        choices: (savedNode.choices || []).map((c) => ({
          _id: String(c._id),
          label: c.label,
          targetNodeId: c.targetNodeId ? String(c.targetNodeId) : null,
        })),
        isStart: savedNode.isStart,
        isEnding: savedNode.isEnding,
        parentId: savedNode.parentId ? String(savedNode.parentId) : null,
        totalNodes,
        wordCount: words(content),
      },
    });
    committed = true;
  } finally {
    if (!committed) {
      await nodeService.remove(userId, node._id, { cascade: true }).catch(() => {});
    }
  }
}

// ── Cover placeholder (TICKET-85) ─────────────────────────────────────────────

// Deterministic FNV-1a 32-bit hash — same seed → same palette/composition.
function fnv1a(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  return h >>> 0;
}

const COVER_PALETTES = [
  ['#1f2430', '#312e81', '#8b5cf6', '#ede9fe'], // night violet
  ['#0a0d14', '#155e75', '#22d3ee', '#ecfeff'], // abyss cyan
  ['#1c1410', '#7c2d12', '#f59e0b', '#ffedd5'], // ember
  ['#0f172a', '#14532d', '#4ade80', '#dcfce7'], // deep forest
  ['#1e1b2e', '#831843', '#f472b6', '#fdf2f8'], // plum rose
  ['#191c26', '#312e81', '#818cf8', '#e0e7ff'], // indigo
];

function coverScene(seed, bg0, bg1, accent, light) {
  const variant = seed % 3;
  if (variant === 0) {
    return [
      `<rect width="600" height="900" fill="url(#bg)"/>`,
      `<circle cx="${150 + (seed % 200)}" cy="${220 + (seed % 100)}" r="180" fill="${accent}" opacity="0.55"/>`,
      `<circle cx="${380 + (seed % 120)}" cy="${560 + (seed % 140)}" r="240" fill="${light}" opacity="0.18"/>`,
      `<rect x="0" y="820" width="600" height="80" fill="${bg0}" opacity="0.9"/>`,
    ].join('\n');
  }
  if (variant === 1) {
    return [
      `<rect width="600" height="900" fill="url(#bg)"/>`,
      `<path d="M0 ${60 + (seed % 90)} L600 ${180 + (seed % 60)} L600 0 L0 0 Z" fill="${accent}" opacity="0.5"/>`,
      `<path d="M0 ${300 + (seed % 120)} L600 ${420 + (seed % 80)} L600 ${620 + (seed % 100)} L0 ${500 + (seed % 90)} Z" fill="${light}" opacity="0.22"/>`,
      `<path d="M0 760 L600 700 L600 900 L0 900 Z" fill="${bg0}" opacity="0.85"/>`,
    ].join('\n');
  }
  return [
    `<rect width="600" height="900" fill="url(#bg)"/>`,
    `<circle cx="${70 + (seed % 60)}" cy="${120 + (seed % 60)}" r="70" fill="${light}" opacity="0.9"/>`,
    `<circle cx="${520 + ((seed >> 3) % 60)}" cy="${260 + ((seed >> 5) % 80)}" r="34" fill="${light}" opacity="0.7"/>`,
    `<path d="M0 ${640 + (seed % 50)} C150 ${560 + (seed % 40)} 300 ${720 + (seed % 40)} 600 ${600 + (seed % 30)} L600 900 L0 900 Z" fill="${accent}" opacity="0.6"/>`,
    `<path d="M0 780 L600 760 L600 900 L0 900 Z" fill="${bg0}" opacity="0.9"/>`,
  ].join('\n');
}

// Themed placeholder cover: an inline SVG data-uri seeded from the description
// text. No image-generation backend exists (storage only accepts file uploads),
// so this data-uri is returned directly (TICKET-85).
export function generateCoverPlaceholder({ description = '', title = '' } = {}) {
  const seed = fnv1a(`${title}|${description}`);
  const palette = COVER_PALETTES[seed % COVER_PALETTES.length];
  const [bg0, bg1, accent, light] = palette;
  const svg = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="900" viewBox="0 0 600 900">',
    '<defs>',
    '<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">',
    `<stop offset="0" stop-color="${bg0}"/>`,
    `<stop offset="1" stop-color="${bg1}"/>`,
    '</linearGradient>',
    '</defs>',
    coverScene(seed, bg0, bg1, accent, light),
    '</svg>',
  ].join('\n');
  return {
    imageUrl: `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`,
    altText: title ? `Cover for ${title}` : 'Story cover',
  };
}

// TICKET-85: build (or reuse) a cover description, persist it on the story, and
// return a themed placeholder image URL + altText. The description defaults to
// buildCoverPrompt(story).description when none is provided.
export async function generateCover({ userId, storyId, description }) {
  const raw = await Story.findOne({ _id: storyId, userId }).lean().exec();
  if (!raw) throw new NotFoundError('Story not found.');
  const provided = typeof description === 'string' ? description.trim() : '';
  const finalDescription = provided || raw.coverDescription || buildCoverPrompt(raw).description;
  const { imageUrl, altText } = generateCoverPlaceholder({
    description: finalDescription,
    title: raw.title,
  });
  await Story.updateOne(
    { _id: raw._id },
    {
      $set: {
        coverDescription: finalDescription,
        coverImageUrl: imageUrl,
        version: (raw.version || 1) + 1,
      },
    },
    { strict: false },
  );
  return { imageUrl, altText };
}

export function abort(jobId) {
  const job = jobs.get(jobId);
  if (job) job.abort.abort();
}

export default {
  generateChapter,
  regenerateChapter,
  continueStory,
  polishDraft,
  generateNode,
  generateCover,
  abort,
};
