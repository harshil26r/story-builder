// ════════════════════════════════════════════════════════════════════════════
// Story Builder — Ambient type declarations for SERVER tests (SPEC §1 mirror)
// This is NOT compiled at runtime. It mirrors `client/src/types/domain.ts` so
// server tests (TS-checked) can reference the shared domain contract.
// ════════════════════════════════════════════════════════════════════════════

declare namespace StoryBuilder {
  type ID = string;
  type ISOString = string;
  type Pov = '1st' | '2nd' | '3rd';
  type StructureType = 'single' | 'linear' | 'branching';
  type GenerationMode = 'full-ai' | 'ai-enhanced';
  type StoryStatus = 'draft' | 'complete';
  type CharacterRole = 'protagonist' | 'antagonist' | 'side' | 'mentor' | 'supporting';
  type OtpPurpose = 'signup-verify' | 'login' | 'password-reset';
  type RelationshipType =
    'friend' | 'rival' | 'sibling' | 'mentor' | 'parent' | 'spouse' | 'enemy' | 'secret-ally';
  type ContentMode = 'ai' | 'user';

  interface User {
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

  interface OtpToken {
    _id: ID;
    email: string;
    otpCodeHash: string;
    purpose: OtpPurpose;
    expiresAt: ISOString;
    attempts: number;
    createdAt: ISOString;
  }

  // GET /api/auth/me — SPEC §2.2 AuthMeResponse extended with google availability
  // (ACR-F-05: server advertises Google OAuth so the client shows/hides the button).
  interface AuthMeResponse {
    user: User | null;
    googleEnabled: boolean;
  }

  interface CharacterRelationship {
    characterId: ID;
    relationType: RelationshipType;
  }

  interface Character {
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

  interface StoryBase {
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

  interface SingleStory extends StoryBase {
    structureType: 'single';
    chapters: Chapter[];
  }
  interface LinearStory extends StoryBase {
    structureType: 'linear';
    chapters: Chapter[];
  }
  interface BranchingStory extends StoryBase {
    structureType: 'branching';
    nodes: BranchNode[];
  }
  type Story = SingleStory | LinearStory | BranchingStory;

  interface StorySummary {
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

  interface ContentSnapshot {
    version: number;
    content: string;
    summary: string;
    modifiedAt: ISOString;
    mode: ContentMode;
  }

  interface Chapter {
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

  interface StoryChoice {
    _id: ID;
    label: string;
    targetNodeId: ID | null;
  }

  interface BranchNode {
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
}
