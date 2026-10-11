import { describe, it, expect } from 'vitest';

// TICKET-50: Prompt templates — pure functions per SPEC §6, ACR-B-11.
import {
  buildSystemPrompt,
  buildCharacterSheet,
  buildSummaryBlock,
  buildChapterPrompt,
  buildPolishPrompt,
  buildCoverPrompt,
  buildStructurePrompt,
} from '../services/promptTemplates.js';

const story = {
  title: 'The Lantern Thief',
  genre: 'fantasy',
  tone: 'melancholic',
  targetAudience: 'young adult',
  pov: '1st',
  structureType: 'linear',
  lengthTarget: 'medium',
};

const characters = [
  {
    _id: 'ch-aria',
    name: 'Aria',
    role: 'protagonist',
    age: 24,
    gender: 'female',
    appearance: 'raven hair, gray eyes',
    personality: ['brave', 'curious'],
    likes: ['dawn skies'],
    dislikes: ['crooked wardens'],
    habits: 'writes in margins',
    backstory: 'orphan raised by lamplighters',
    voiceStyle: 'wry',
    catchphrases: ['By the lantern.'],
    arc: 'from outcast to leader',
    secretTrait: 'royal blood',
    secretRevealChapter: 5,
    relationships: [{ characterId: 'ch-kael', relationType: 'rival' }],
  },
  {
    _id: 'ch-kael',
    name: 'Kael',
    role: 'antagonist',
  },
];

const summaries = Array.from({ length: 7 }, (_, i) => ({
  order: i + 1,
  summary: `Chapter ${i + 1} summary`,
}));

describe('prompt templates (TICKET-50)', () => {
  it('buildSystemPrompt is deterministic (byte-identical for same inputs)', () => {
    const a = buildSystemPrompt({ ...story, characters });
    const b = buildSystemPrompt({ ...story, characters });
    expect(a).toBe(b);
  });

  it('buildSystemPrompt contains all 5 sections in SPEC §6 order', () => {
    const out = buildSystemPrompt({ ...story, characters });
    const order = [
      '== WORLD & STYLE ==',
      '== PROSE RULES ==',
      '== STRUCTURE MODE ==',
      '== CONSISTENCY CONTRACT ==',
      '== CHARACTER SHEET ==',
    ];
    const idx = order.map((s) => out.indexOf(s));
    expect(idx.every((i) => i >= 0)).toBe(true);
    for (let i = 1; i < idx.length; i += 1) expect(idx[i]).toBeGreaterThan(idx[i - 1]);
    expect(out).toContain('Genre: fantasy');
    expect(out).toContain('Point of view: 1st');
  });

  it('buildStructurePrompt renders single / linear / branching variants', () => {
    expect(buildStructurePrompt('single')).toContain('complete one-shot story');
    expect(buildStructurePrompt('linear')).toContain('continuous arc');
    expect(buildStructurePrompt('branching')).toContain('[[CHOICE:');
  });

  it('buildCharacterSheet serializes all fields and resolves relationship target names', () => {
    const out = buildCharacterSheet(characters);
    expect(out).toContain('--- Aria [ROLE: protagonist] ---');
    expect(out).toContain('AGE: 24     GENDER: female');
    expect(out).toContain('APPEARANCE: raven hair, gray eyes');
    expect(out).toContain('PERSONALITY: - brave');
    expect(out).toContain('LIKES: - dawn skies');
    expect(out).toContain('HABITS: writes in margins');
    expect(out).toContain('VOICE: wry');
    expect(out).toContain('CATCHPHRASES: - "By the lantern."');
    expect(out).toContain('ARC: from outcast to leader');
    expect(out).toContain('SECRET: royal blood      [REVEAL AT: ch.5]');
    expect(out).toContain('RELATIONSHIPS: - Kael (rival)');
    expect(out).toContain(
      'All names, genders, and relationship labels in this sheet are authoritative.',
    );
  });

  it('buildCharacterSheet emits N/A for omitted optional fields', () => {
    const out = buildCharacterSheet([{ name: 'Kael', role: 'antagonist' }]);
    expect(out).toContain('AGE: N/A');
    expect(out).toContain('GENDER: N/A');
    expect(out).toContain('APPEARANCE: N/A');
    expect(out).toContain('PERSONALITY: N/A');
    expect(out).toContain('SECRET: N/A      [DO NOT REVEAL]');
    expect(out).toContain('RELATIONSHIPS: N/A');
  });

  it('buildSummaryBlock caps at MAX_SUMMARIES=5 and keeps the last-120-chars line', () => {
    const out = buildSummaryBlock({ summaries, lastLine: `x`.repeat(300) });
    expect(out).toContain('[Ch. 3] Chapter 3 summary');
    expect(out).toContain('[Ch. 7] Chapter 7 summary');
    expect(out).not.toContain('[Ch. 1] Chapter 1 summary');
    expect(out).not.toContain('[Ch. 2] Chapter 2 summary');
    expect(out).toContain('Previous chapter ended:');
    const lastLine = out.match(/Previous chapter ended: "(.+)"/)[1];
    expect(lastLine.length).toBe(120);
  });

  it('buildChapterPrompt includes chapter index, summary block, and word budget', () => {
    const summaryBlock = buildSummaryBlock({ summaries: [{ order: 1, summary: 'opening' }] });
    const out = buildChapterPrompt({
      story,
      summaryBlock,
      characters,
      chapterIndex: 2,
      total: 5,
      chapterGoal: 'Aria crosses into the crypt.',
    });
    expect(out).toContain('USER TURN (chapter 2 of 5)');
    expect(out).toContain('== STORY SO FAR ==');
    expect(out).toContain('Core beat: Aria crosses into the crypt.');
    expect(out).toContain('End on a hook.');
    expect(out).toContain('Word budget: ~1500');
  });

  it('buildChapterPrompt resolves the story on the final chapter', () => {
    const out = buildChapterPrompt({
      story,
      summaryBlock: '',
      chapterIndex: 5,
      total: 5,
      chapterGoal: 'end',
    });
    expect(out).toContain('Resolve the story.');
  });

  it('buildPolishPrompt matches SPEC §6.5 (keeps structure, no markdown)', () => {
    const out = buildPolishPrompt({ draft: 'Once, the lamps went out.', story, characters });
    expect(out).toContain('USER TURN — POLISH');
    expect(out).toContain('Tone: melancholic    Genre: fantasy');
    expect(out).toContain('== DRAFT ==');
    expect(out).toContain('Once, the lamps went out.');
    expect(out).toContain('no markdown');
  });

  it('buildCoverPrompt returns { description, styleTag } with title/premise/genre', () => {
    const out = buildCoverPrompt({
      ...story,
      premise: 'A lamplighter discovers the city gaslight is alive.',
    });
    expect(out).toHaveProperty('description');
    expect(out).toHaveProperty('styleTag');
    expect(typeof out.description).toBe('string');
    expect(typeof out.styleTag).toBe('string');
    expect(out.description).toContain('The Lantern Thief');
    expect(out.description).toContain('fantasy');
    expect(out.description).toContain('no text, lettering, or logos');
    expect(out.styleTag.length).toBeGreaterThan(0);
  });
});
