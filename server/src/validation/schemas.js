import Joi from 'joi';

// ════════════════════════════════════════════════════════════════════════════
// Story Builder — Joi validation schemas (SERVER SIDE)
// Mirrors the authoritative TS contract in `client/src/types/domain.ts` (SPEC §1)
// and the API payload shapes in `client/src/types/api.ts` (SPEC §2).
// ════════════════════════════════════════════════════════════════════════════

export const id = Joi.string().hex().length(24);

const POVS = ['1st', '2nd', '3rd'];
const STRUCTURE_TYPES = ['single', 'linear', 'branching'];
const GENERATION_MODES = ['full-ai', 'ai-enhanced'];
const STORY_STATUSES = ['draft', 'complete'];
const CHARACTER_ROLES = ['protagonist', 'antagonist', 'side', 'mentor', 'supporting'];
const OTP_PURPOSES = ['signup-verify', 'login', 'password-reset'];
const RELATIONSHIP_TYPES = [
  'friend', 'rival', 'sibling', 'mentor', 'parent',
  'spouse', 'enemy', 'secret-ally',
];

const email = Joi.string().max(254).regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/).lowercase().required();

// ── Shared ───────────────────────────────────────────────────────────────────
export const okSchema = Joi.object({ ok: Joi.boolean().valid(true).required() });

// ── Auth (SPEC 2.2) ──────────────────────────────────────────────────────────
export const signupSchema = Joi.object({
  name: Joi.string().trim().min(1).max(80).required(),
  email,
  password: Joi.string().min(8).max(128)
    .pattern(/[A-Za-z]/, 'letter')
    .pattern(/[0-9]/, 'number')
    .required(),
});

export const sendOtpSchema = Joi.object({
  email,
  purpose: Joi.string().valid(...OTP_PURPOSES).required(),
});

export const verifyOtpSchema = Joi.object({
  email,
  code: Joi.string().pattern(/^\d{6}$/).required(),
  purpose: Joi.string().valid(...OTP_PURPOSES).required(),
});

export const loginSchema = Joi.object({
  email,
  password: Joi.string().min(1).max(128).required(),
});

export const resetPasswordSchema = Joi.object({
  email,
  code: Joi.string().pattern(/^\d{6}$/).required(),
  newPassword: Joi.string().min(8).max(128)
    .pattern(/[A-Za-z]/, 'letter')
    .pattern(/[0-9]/, 'number')
    .required(),
});

export const linkGoogleSchema = Joi.object({
  googleAccessToken: Joi.string().min(10).required(),
});

// ── Character (SPEC 2.3) ─────────────────────────────────────────────────────
const stringArray = (maxItems, maxLen) =>
  Joi.array().items(Joi.string().trim().max(maxLen)).max(maxItems);

export const characterInputSchema = Joi.object({
  name: Joi.string().trim().min(1).max(80).required(),
  age: Joi.number().integer().min(0).max(150).allow(null).default(null),
  gender: Joi.string().trim().max(50).required(),
  appearance: Joi.string().trim().max(2000).required(),
  personality: stringArray(12, 100).required(),
  likes: stringArray(12, 100).required(),
  dislikes: stringArray(12, 100).required(),
  habits: Joi.string().trim().max(1000).allow(''),
  backstory: Joi.string().trim().max(5000).allow(''),
  role: Joi.string().valid(...CHARACTER_ROLES).required(),
  relationships: Joi.array().items(Joi.object({
    characterId: id.required(),
    relationType: Joi.string().valid(...RELATIONSHIP_TYPES).required(),
  })).max(50).default([]),
  voiceStyle: Joi.string().trim().max(500).allow(''),
  catchphrases: stringArray(6, 80),
  arc: Joi.string().trim().max(2000).allow(''),
  secretTrait: Joi.string().trim().max(1000).allow(''),
  secretRevealChapter: Joi.number().integer().min(1).allow(null).default(null),
  isTemplate: Joi.boolean().default(false),
});

// ── Character (Phase 4 CRUD contract — parent briefing) ──────────────────────
// Mirrors the Character model in models/Character.js: name, description,
// voiceStyle, role (default 'neutral'), avatarUrl, templateSource.
export const characterCreateSchema = Joi.object({
  name: Joi.string().trim().min(1).max(100).required(),
  description: Joi.string().trim().max(2000).allow('').default(''),
  voiceStyle: Joi.string().trim().max(500).allow('').default(''),
  role: Joi.string().valid('protagonist', 'antagonist', 'supporting', 'neutral').default('neutral'),
  avatarUrl: Joi.string().trim().max(2000).allow(null).default(null),
  templateSource: id.allow(null).default(null),
});

export const characterUpdateSchema = Joi.object({
  name: Joi.string().trim().min(1).max(100),
  description: Joi.string().trim().max(2000).allow(''),
  voiceStyle: Joi.string().trim().max(500).allow(''),
  role: Joi.string().valid('protagonist', 'antagonist', 'supporting', 'neutral'),
  avatarUrl: Joi.string().trim().max(2000).allow(null),
  templateSource: id.allow(null),
}).min(1);

export const characterCopyTemplateSchema = Joi.object({
  templateCharacterId: id.required(),
});

// ── Story (SPEC 2.4) ─────────────────────────────────────────────────────────
const lengthTargetPattern = Joi.alternatives().try(
  Joi.string().valid('short', 'medium', 'long'),
  Joi.string().regex(/^\d+\s+chapters?$/i, 'N chapters'),
);

export const storyCreateSchema = Joi.object({
  title: Joi.string().trim().min(1).max(120).required(),
  premise: Joi.string().trim().min(10).max(5000).required(),
  genre: Joi.string().trim().min(1).max(80).default('general'),
  tone: Joi.string().trim().min(1).max(80).default('neutral'),
  targetAudience: Joi.string().trim().min(1).max(80).default('general'),
  lengthTarget: lengthTargetPattern.default('medium'),
  pov: Joi.string().valid(...POVS).required(),
  structureType: Joi.string().valid(...STRUCTURE_TYPES).required(),
  generationMode: Joi.string().valid(...GENERATION_MODES).required(),
  characterIds: Joi.array().items(id).max(20).default([]),
  disclaimerText: Joi.string().trim().max(2000).allow(''),
});

export const storyUpdateSchema = Joi.object({
  title: Joi.string().trim().min(1).max(120),
  premise: Joi.string().trim().min(10).max(5000),
  genre: Joi.string().trim().min(1).max(80),
  tone: Joi.string().trim().min(1).max(80),
  targetAudience: Joi.string().trim().min(1).max(80),
  lengthTarget: lengthTargetPattern,
  pov: Joi.string().valid(...POVS),
  generationMode: Joi.string().valid(...GENERATION_MODES),
  characterIds: Joi.array().items(id).max(20),
  disclaimerText: Joi.string().trim().max(2000).allow(''),
  isPublic: Joi.boolean(),
  status: Joi.string().valid(...STORY_STATUSES),
  baseVersion: Joi.number().integer().min(-1),
}).min(1);

export const regenerateChapterSchema = Joi.object({
  chapterId: id.required(),
  mode: Joi.string().valid('only', 'onward').required(),
  baseVersion: Joi.number().integer().min(-1),
});

export const continueSchema = Joi.object({
  chaptersCount: Joi.number().integer().min(1).max(10),
  baseVersion: Joi.number().integer().min(-1),
});

export const publishSchema = Joi.object({
  isPublic: Joi.boolean().required(),
});

// ── Branching / Node (SPEC 2.6) ──────────────────────────────────────────────
export const nodeCreateSchema = Joi.object({
  parentId: id.allow(null),
  title: Joi.string().trim().min(1).max(120),
  content: Joi.string().trim().max(20000).allow(''),
  isEnding: Joi.boolean().default(false),
});

export const nodeUpdateSchema = Joi.object({
  title: Joi.string().trim().min(1).max(120),
  content: Joi.string().trim().max(20000).allow(''),
  summary: Joi.string().trim().max(2000).allow(''),
  isEnding: Joi.boolean(),
  baseVersion: Joi.number().integer().min(-1),
}).min(1);

export const choiceCreateSchema = Joi.object({
  label: Joi.string().trim().min(2).max(80).required(),
  targetNodeId: id.allow(null),
});

export const choiceDeleteSchema = Joi.object({
  nodeId: id.required(),
  choiceId: id.required(),
});

// ── AI (SPEC 2.5) ────────────────────────────────────────────────────────────
export const generateChapterSchema = Joi.object({
  storyId: id.required(),
  chapterIndex: Joi.number().integer().min(1).required(),
  resumeGenerationId: Joi.string().max(100),
});

export const polishDraftSchema = Joi.object({
  storyId: id.required(),
  chapterIndex: Joi.number().integer().min(1).required(),
});

export const regenerateAiSchema = Joi.object({
  storyId: id.required(),
  target: id.required(),
  regenerateOnward: Joi.boolean().default(false),
  baseVersion: Joi.number().integer().min(-1),
});

export const generateNodeSchema = Joi.object({
  storyId: id.required(),
  parentNodeId: id.allow(null),
});

export const generateCoverSchema = Joi.object({
  storyId: id.required(),
  description: Joi.string().trim().max(3000).allow(''),
});

// ── Exports (SPEC 2.6) ───────────────────────────────────────────────────────
export const shareTokenSchema = Joi.string().min(20).max(200).required();
export const nodeIdSchema = id;
export const storyIdSchema = id;

export default {
  id,
  signupSchema,
  sendOtpSchema,
  verifyOtpSchema,
  loginSchema,
  resetPasswordSchema,
  linkGoogleSchema,
  characterInputSchema,
  characterCreateSchema,
  characterUpdateSchema,
  characterCopyTemplateSchema,
  storyCreateSchema,
  storyUpdateSchema,
  regenerateChapterSchema,
  continueSchema,
  publishSchema,
  nodeCreateSchema,
  nodeUpdateSchema,
  choiceCreateSchema,
  choiceDeleteSchema,
  generateChapterSchema,
  polishDraftSchema,
  regenerateAiSchema,
  generateNodeSchema,
  generateCoverSchema,
  shareTokenSchema,
  nodeIdSchema,
  storyIdSchema,
};