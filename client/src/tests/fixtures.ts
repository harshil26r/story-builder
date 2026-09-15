import type {
  User,
  Character,
  StorySummary,
  Chapter,
  BranchNode,
  StoryChoice,
  LinearStory,
  BranchingStory,
} from '../types/domain';

/** Minimal valid user fixture. */
export function makeUser(overrides: Partial<User> = {}): User {
  return {
    _id: 'u1',
    name: 'Jane Author',
    email: 'jane@example.com',
    passwordHash: null,
    isEmailVerified: true,
    googleId: null,
    avatarUrl: null,
    aiUsage: { calls: [], dayTokens: 0, dayBudgetExceededAt: null },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

/** Minimal character fixture. */
export function makeCharacter(overrides: Partial<Character> = {}): Character {
  return {
    _id: 'c1',
    userId: 'u1',
    name: 'Elara',
    age: 29,
    gender: 'woman',
    appearance: 'Silver hair, calm grey eyes.',
    personality: ['brave', 'quiet', 'curious'],
    likes: ['stargazing'],
    dislikes: ['crowds'],
    habits: 'counts steps on bridges',
    backstory: 'A lighthouse keeper.',
    role: 'protagonist',
    avatarUrl: null,
    relationships: [],
    voiceStyle: 'measured',
    catchphrases: ['By the tide.'],
    arc: 'Learns to trust again.',
    secretTrait: 'Can sense storms.',
    secretRevealChapter: 4,
    isTemplate: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

/** Chapter fixture. */
export function makeChapter(overrides: Partial<Chapter> = {}): Chapter {
  return {
    _id: 'ch1',
    storyId: 's1',
    order: 1,
    title: 'The Keeper',
    content:
      'The lighthouse keeper found the journal beneath the floorboards, leather cracked and smelling of salt. On the first page, in cramped ink, was a single line: "Everyone will disappear on the third day of the storm."',
    summary: 'The keeper discovers a prophetic journal.',
    isAIGenerated: true,
    generatedAt: '2026-01-02T00:00:00.000Z',
    version: 1,
    draftContent: null,
    versions: [],
    createdAt: '2026-01-02T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
    ...overrides,
  };
}

/** Story summary fixture. */
export function makeStorySummary(overrides: Partial<StorySummary> = {}): StorySummary {
  return {
    _id: 's1',
    title: 'The Tides of Ember',
    structureType: 'linear',
    status: 'draft',
    totalChapters: 1,
    wordCount: 120,
    coverImageUrl: null,
    updatedAt: '2026-01-02T00:00:00.000Z',
    isPublic: false,
    ...overrides,
  };
}

/** Linear story fixture (with chapters). */
export function makeLinearStory(overrides: Partial<LinearStory> = {}): LinearStory {
  const base: LinearStory = {
    _id: 's1',
    userId: 'u1',
    title: 'The Tides of Ember',
    premise: 'A lighthouse keeper discovers a journal that predicts the day everyone will disappear.',
    genre: 'fantasy',
    tone: 'melancholy',
    targetAudience: 'adult',
    lengthTarget: 'short',
    pov: '3rd',
    structureType: 'linear',
    generationMode: 'full-ai',
    characters: ['c1'],
    coverImageUrl: null,
    disclaimerText: '',
    status: 'draft',
    isPublic: false,
    shareToken: null,
    totalChapters: 1,
    wordCount: 120,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
    version: 1,
    chapters: [makeChapter()],
  };
  return { ...base, ...overrides };
}

/** Choice fixture. */
export function makeChoice(overrides: Partial<StoryChoice> = {}): StoryChoice {
  return {
    _id: 'co1',
    label: 'Open the journal',
    targetNodeId: 'n2',
    ...overrides,
  };
}

/** Branch node fixture. */
export function makeBranchNode(overrides: Partial<BranchNode> = {}): BranchNode {
  return {
    _id: 'n1',
    storyId: 's1',
    parentId: null,
    title: 'The Storm Arrives',
    content: 'Wind screamed against the glass.',
    summary: 'The storm begins.',
    choices: [makeChoice()],
    isStart: true,
    isEnding: false,
    isAIGenerated: true,
    version: 1,
    versions: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

/** Branching story fixture. */
export function makeBranchingStory(overrides: Partial<BranchingStory> = {}): BranchingStory {
  const base: BranchingStory = {
    _id: 's2',
    userId: 'u1',
    title: 'The Fork at Midnight',
    premise: 'Every choice on this road rewrites the night.',
    genre: 'noir',
    tone: 'tense',
    targetAudience: 'adult',
    lengthTarget: 'short',
    pov: '2nd',
    structureType: 'branching',
    generationMode: 'full-ai',
    characters: [],
    coverImageUrl: null,
    disclaimerText: '',
    status: 'draft',
    isPublic: false,
    shareToken: null,
    totalChapters: 0,
    wordCount: 80,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    version: 1,
    nodes: [makeBranchNode()],
  };
  return { ...base, ...overrides };
}