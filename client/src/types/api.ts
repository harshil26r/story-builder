// ════════════════════════════════════════════════════════════════════════════
// Story Builder — API Request / Response Types (SPEC §2)
// All endpoints are /api-prefixed, JSON (except SSE + export + multipart upload).
// ════════════════════════════════════════════════════════════════════════════

import type {
  User,
  OtpPurpose,
  Character,
  CharacterGroup,
  CharacterRole,
  CharacterRelationship,
  StorySummary,
  Story,
  ID,
  Pov,
  StructureType,
  GenerationMode,
  StoryStatus,
  BranchNode,
  StoryChoice,
} from './domain';

// ── Shared ───────────────────────────────────────────────────────────────────
export interface Ok {
  ok: true;
}
export interface ErrorBody {
  code: string;
  message: string;
  fields?: { field: string; message: string }[];
}

// HTTP status ⇄ code mapping (server MUST honor):
// 400 VALIDATION_ERROR | 401 UNAUTHORIZED | 403 FORBIDDEN (csrf) | 404 NOT_FOUND
// 409 CONFLICT (version mismatch) | 410 OTP_EXPIRED | 429 RATE_LIMITED
// 501 NOT_CONFIGURED (google/cloudinary absent) | 503 AI_UNAVAILABLE | 500 INTERNAL_ERROR

// ── Auth ─────────────────────────────────────────────────────────────────────
export interface SignupRequest {
  name: string;
  email: string;
  password: string;
}
export interface SendOtpRequest {
  email: string;
  purpose: OtpPurpose;
}
export interface VerifyOtpRequest {
  email: string;
  code: string;
  purpose: OtpPurpose;
}
export interface LoginRequest {
  email: string;
  password: string;
}
export interface AuthMeResponse {
  user: User | null;
  /** Advertised by the server when Google OAuth is configured (TICKET-29). */
  googleEnabled?: boolean;
}
export interface ResetPasswordRequest {
  email: string;
  code: string;
  newPassword: string;
}
// Responses: signup/send-otp/verify-otp/login/logout/link-google → Ok (verify-otp & login also set session cookie)

// ── Characters ───────────────────────────────────────────────────────────────
export interface CharacterInput {
  name: string;
  age: number | null;
  gender: string;
  appearance: string;
  personality: string[];
  likes: string[];
  dislikes: string[];
  habits?: string;
  backstory?: string;
  role: CharacterRole;
  relationships: CharacterRelationship[];
  voiceStyle?: string;
  catchphrases?: string[];
  arc?: string;
  secretTrait?: string;
  secretRevealChapter?: number | null;
  isTemplate?: boolean;
}
export type CharacterListResponse = { characters: Character[] };
export type CharacterResponse = { character: Character };
export type AvatarUploadResponse = { avatarUrl: string };
export type DuplicateResponse = { character: Character };

// ── Character groups (user-curated, many-to-many) ────────────────────────────
export type CharacterGroupListResponse = { groups: CharacterGroup[] };
export type CharacterGroupResponse = { group: CharacterGroup };
export type AssignGroupsRequest = { groupIds: ID[] };
export type AssignGroupsResponse = { character: Character };

// ── Stories ──────────────────────────────────────────────────────────────────
export interface StoryCreateRequest {
  title: string;
  premise: string;
  genre?: string;
  tone?: string;
  targetAudience?: string;
  lengthTarget?: string;
  pov: Pov;
  structureType: StructureType;
  generationMode: GenerationMode;
  characterIds: ID[];
  disclaimerText?: string;
}
export interface StoryUpdateRequest {
  title?: string;
  premise?: string;
  genre?: string;
  tone?: string;
  targetAudience?: string;
  lengthTarget?: string;
  pov?: Pov;
  generationMode?: GenerationMode;
  characterIds?: ID[];
  disclaimerText?: string;
  coverImageUrl?: string | null;
  isPublic?: boolean;
  status?: StoryStatus;
  baseVersion?: number;
}
export type StoryListResponse = { stories: StorySummary[] };
export type StoryDetailResponse = Story;
export type StoryResponse = { story: Story };
export type RegenerateChapterRequest = {
  chapterId: ID;
  mode: 'only' | 'onward';
  baseVersion?: number;
};
export type ContinueRequest = ({ chaptersCount?: number } & { baseVersion?: number }) | undefined;
export type PublishResponse = { isPublic: boolean; shareToken: string };

// ── Explore / discovery (public catalog) ─────────────────────────────────────
export type ExploreSort = 'recent' | 'words' | 'chapters';

export interface ExploreQuery {
  q?: string;
  genre?: string;
  structureType?: StructureType;
  sort?: ExploreSort;
  page?: number;
  limit?: number;
}

/** Public projection returned by GET /api/explore — no userId/PII. */
export interface ExploreStory {
  _id: ID;
  title: string;
  premise: string;
  genre: string;
  tone: string;
  targetAudience: string;
  structureType: StructureType;
  generationMode: GenerationMode;
  status: StoryStatus;
  isPublic: boolean;
  shareToken: string | null;
  totalChapters: number;
  wordCount: number;
  coverImageUrl: string | null;
  updatedAt: string;
}

export interface ExploreResponse {
  stories: ExploreStory[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// ── Upload / Export / Branching ──────────────────────────────────────────────
export type UploadResponse = { url: string };

export interface NodeCreateRequest {
  parentId?: ID | null;
  title?: string;
  content?: string;
  isEnding?: boolean;
}
export interface NodeUpdateRequest {
  title?: string;
  content?: string;
  summary?: string;
  isEnding?: boolean;
  baseVersion?: number;
}
export interface ChoiceCreateRequest {
  label: string;
  targetNodeId?: ID | null;
}
export type NodeListResponse = { nodes: BranchNode[] };
export type NodeResponse = { node: BranchNode };
export type ChoiceResponse = { choice: StoryChoice };
