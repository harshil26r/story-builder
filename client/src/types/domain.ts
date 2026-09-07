// ════════════════════════════════════════════════════════════════════════════
// Story Builder — Authoritative TypeScript Domain Contracts (SPEC §1)
// Server mirrors these shapes in `server/src/validation/schemas.js` and
// `server/src/types/contracts.d.ts`. Every server response and client store
// payload conforms to these types. IDs are 24-char hex Mongo ObjectIds.
// ════════════════════════════════════════════════════════════════════════════

// ── Primitives ───────────────────────────────────────────────────────────────
export type ID = string;
export type ISOString = string; // new Date().toISOString()
export type Pov = '1st' | '2nd' | '3rd';
export type StructureType = 'single' | 'linear' | 'branching';
export type GenerationMode = 'full-ai' | 'ai-enhanced';
export type StoryStatus = 'draft' | 'complete';
export type CharacterRole = 'protagonist' | 'antagonist' | 'side' | 'mentor' | 'supporting';
export type OtpPurpose = 'signup-verify' | 'login' | 'password-reset';
export type RelationshipType =
  | 'friend'
  | 'rival'
  | 'sibling'
  | 'mentor'
  | 'parent'
  | 'spouse'
  | 'enemy'
  | 'secret-ally';
export type ContentMode = 'ai' | 'user';
export type AsyncStatus = 'idle' | 'loading' | 'empty' | 'error' | 'success';

// ── User ─────────────────────────────────────────────────────────────────────
export interface User {
  _id: ID;
  name: string;
  email: string;
  passwordHash: string | null;
  isEmailVerified: boolean;
  googleId: string | null;
  avatarUrl: string | null;
  aiUsage: {
    calls: { at: ISOString; storyId?: ID; units: number }[];
    dayTokens: number;
    dayBudgetExceededAt: ISOString | null;
  };
  createdAt: ISOString;
  updatedAt: ISOString;
}

// ── OtpToken ─────────────────────────────────────────────────────────────────
export interface OtpToken {
  _id: ID;
  email: string;
  otpCodeHash: string;
  purpose: OtpPurpose;
  expiresAt: ISOString;
  attempts: number;
  createdAt: ISOString;
}

// ── Character ────────────────────────────────────────────────────────────────
export interface CharacterRelationship {
  characterId: ID;
  relationType: RelationshipType;
}
export interface Character {
  _id: ID;
  userId: ID;
  name: string;
  age: number | null;
  gender: string;
  appearance: string;
  personality: string[];
  likes: string[];
  dislikes: string[];
  habits: string;
  backstory: string;
  role: CharacterRole;
  avatarUrl: string | null;
  relationships: CharacterRelationship[];
  voiceStyle: string;
  catchphrases: string[];
  arc: string;
  secretTrait: string;
  secretRevealChapter: number | null;
  isTemplate: boolean;
  createdAt: ISOString;
  updatedAt: ISOString;
}

// ── Story (discriminated union by structureType) ────────────────────────────
export interface StoryBase {
  _id: ID;
  userId: ID;
  title: string;
  premise: string;
  genre: string;
  tone: string;
  targetAudience: string;
  lengthTarget: string;
  pov: Pov;
  structureType: StructureType;
  generationMode: GenerationMode;
  characters: ID[];
  coverImageUrl: string | null;
  disclaimerText: string;
  status: StoryStatus;
  isPublic: boolean;
  shareToken: string | null;
  totalChapters: number;
  wordCount: number;
  createdAt: ISOString;
  updatedAt: ISOString;
  version: number;
}

export interface SingleStory extends StoryBase {
  structureType: 'single';
  chapters: Chapter[];
}
export interface LinearStory extends StoryBase {
  structureType: 'linear';
  chapters: Chapter[];
}
export interface BranchingStory extends StoryBase {
  structureType: 'branching';
  nodes: BranchNode[];
}

export type Story = SingleStory | LinearStory | BranchingStory;
export type ChapteredStory = SingleStory | LinearStory;

// List/dashboard projection — never ships full chapters/nodes.
export interface StorySummary {
  _id: ID;
  title: string;
  structureType: StructureType;
  status: StoryStatus;
  totalChapters: number;
  wordCount: number;
  coverImageUrl: string | null;
  updatedAt: ISOString;
  isPublic: boolean;
}

// ── Version snapshots ────────────────────────────────────────────────────────
export interface ContentSnapshot {
  version: number;
  content: string;
  summary: string;
  modifiedAt: ISOString;
  mode: ContentMode;
}

// ── Chapter ──────────────────────────────────────────────────────────────────
export interface Chapter {
  _id: ID;
  storyId: ID;
  order: number;
  title: string;
  content: string;
  summary: string;
  isAIGenerated: boolean;
  generatedAt: ISOString | null;
  version: number;
  draftContent: string | null;
  versions: ContentSnapshot[];
  createdAt: ISOString;
  updatedAt: ISOString;
}

// ── BranchNode (branching structure) ─────────────────────────────────────────
export interface StoryChoice {
  _id: ID;
  label: string;
  targetNodeId: ID | null;
}
export interface BranchNode {
  _id: ID;
  storyId: ID;
  parentId: ID | null;
  title: string;
  content: string;
  summary: string;
  choices: StoryChoice[];
  isStart: boolean;
  isEnding: boolean;
  isAIGenerated: boolean;
  version: number;
  versions: ContentSnapshot[];
  createdAt: ISOString;
  updatedAt: ISOString;
}

// ── UI-edge type (branching graph) ───────────────────────────────────────────
export interface BranchEdge {
  from: ID;
  to: ID | null; // null ⇒ dangling/orphan edge
  label: string;
}

// ── SSE streaming ────────────────────────────────────────────────────────────
export interface DocStartEvent {
  jobId: string;
  storyId: ID;
  structureType: StructureType;
  chapterIndex: number;
  title: string;
  nodeId?: ID;
}
export interface DeltaEvent {
  text: string;
}
export interface SummaryEvent {
  summary: string;
}
export interface SnapshotEvent {
  jobId: string;
  chapterIndex: number;
  fullTextSoFar: string;
  tokensUsedSoFar?: number;
}
export interface DoneEvent {
  jobId: string;
  saved: { _id: ID; storyId: ID; order: number; title: string; content: string; summary: string; version: number; totalChapters: number; wordCount: number } | { _id: ID; storyId: ID; title: string; content: string; summary: string; version: number; choices: StoryChoice[]; isStart: boolean; isEnding: boolean; totalNodes: number; wordCount: number };
}
export interface ErrorEventBody {
  code: string;
  message: string;
}

// ── AppError (thrown by http client) ─────────────────────────────────────────
export interface FieldError {
  field: string;
  message: string;
}
export class AppError extends Error {
  code: string;
  fields?: FieldError[];
  constructor(code: string, message: string, fields?: FieldError[]) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.fields = fields;
  }
}