// StoryBuilder prompt templates (SPEC §6, ACR-B-11).
// Pure functions: same inputs → byte-identical output, enabling Anthropic
// prompt caching on the system block. No I/O, no Date, no randomness.

const MAX_SUMMARIES = 5;

// eslint-disable-next-line no-control-regex -- strip C0/C1 control chars (keep \n and \t)
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g;

const INJECTION_PATTERNS = [
  /\b(?:ignore|disregard|forget)\s+(?:(?:all|any|the)\s+)?(?:previous|prior|above|earlier|preceding)\s+(?:instructions?|prompts?|messages?|rules?|directions?)\b/gi,
  /\byou\s+are\s+(?:now|no\s+longer)\b/gi,
  /\bsystem\s+(?:prompts?|instructions?)\b/gi,
  /\[\[\s*choice\s*:/gi,
];

export function sanitizeUserText(value, maxLength = 4000) {
  const text = value === undefined || value === null ? '' : String(value);
  const limit = Number.isFinite(maxLength) && maxLength >= 0 ? maxLength : 4000;
  let cleaned = text.replace(CONTROL_CHARS, '');
  for (const pattern of INJECTION_PATTERNS) cleaned = cleaned.replace(pattern, '[filtered]');
  return cleaned.slice(0, limit);
}

function valueOrNA(v) {
  return v === undefined || v === null || v === '' ? 'N/A' : sanitizeUserText(v);
}

function bullets(label, items, cap = Infinity) {
  const list = Array.isArray(items) ? items : [];
  if (list.length === 0) return `${label}: N/A`;
  return list
    .slice(0, cap)
    .map((item) => `${label}: - ${sanitizeUserText(item)}`)
    .join('\n');
}

function catchphraseLine(phrases) {
  const list = Array.isArray(phrases) ? phrases.filter(Boolean) : [];
  if (list.length === 0) return 'CATCHPHRASES: N/A';
  return `CATCHPHRASES: ${list.map((p) => `- "${sanitizeUserText(p)}"`).join(' ')}`;
}

function secretLine(secretTrait, revealChapter) {
  const secret = valueOrNA(secretTrait);
  if (revealChapter !== undefined && revealChapter !== null && revealChapter !== '') {
    return `SECRET: ${secret}      [REVEAL AT: ch.${revealChapter}]`;
  }
  return `SECRET: ${secret}      [DO NOT REVEAL]`;
}

function relationshipLines(relationships, nameMap) {
  const list = Array.isArray(relationships) ? relationships.filter(Boolean) : [];
  if (list.length === 0) return ['RELATIONSHIPS: N/A'];
  return list.map((r) => {
    const key =
      r.characterId !== undefined && r.characterId !== null ? String(r.characterId) : null;
    const target = (key && nameMap.get(key)) || r.characterName || r.name || key || 'unknown';
    const type = r.relationType || 'N/A';
    return `RELATIONSHIPS: - ${sanitizeUserText(target)} (${sanitizeUserText(type)})`;
  });
}

const STRUCTURE_RULES = {
  single:
    'This is a complete one-shot story. Deliver setup, rising action, climax, and resolution within the requested length, ending with a satisfying close.',
  linear:
    'Write this as one chapter in a continuous arc. Each chapter advances the arc and ends on a hook — a decision, revelation, or reversal — unless it is the final chapter, which resolves all open threads.',
  branching:
    'Each generation produces ONE self-contained scene from a single point of view. It must be comprehensible on its own (a reader may arrive here via any path) while honoring the STORY SO FAR. End the scene with 2–4 choices, each on its own final line, formatted exactly as: [[CHOICE: label]]. Labels are second-person, concrete, in-fiction reader actions — e.g. "[[CHOICE: Descend into the crypt]]", NOT "[[CHOICE: Choose danger]]". The same choice may not repeat textually.',
};

export function buildStructurePrompt(structureType) {
  return STRUCTURE_RULES[structureType] || STRUCTURE_RULES.linear;
}

export function buildCharacterSheet(characters = []) {
  const nameMap = new Map();
  for (const c of characters) {
    if (c._id) nameMap.set(String(c._id), c.name || 'Unnamed');
    if (c.id) nameMap.set(String(c.id), c.name || 'Unnamed');
  }

  const lines = ['== CHARACTER SHEET =='];
  for (const c of characters) {
    const name = sanitizeUserText(c.name || 'Unnamed');
    const role = sanitizeUserText(c.role || 'neutral');
    lines.push(`--- ${name} [ROLE: ${role}] ---`);
    lines.push(`AGE: ${valueOrNA(c.age)}     GENDER: ${valueOrNA(c.gender)}`);
    lines.push(`APPEARANCE: ${valueOrNA(c.appearance)}`);
    lines.push(bullets('PERSONALITY', c.personality, 12));
    lines.push(bullets('LIKES', c.likes));
    lines.push(bullets('DISLIKES', c.dislikes));
    lines.push(`HABITS: ${valueOrNA(c.habits)}`);
    lines.push(`BACKSTORY: ${valueOrNA(c.backstory)}`);
    lines.push(`VOICE: ${valueOrNA(c.voiceStyle)}        ${catchphraseLine(c.catchphrases)}`);
    lines.push(`ARC: ${valueOrNA(c.arc)}`);
    lines.push(secretLine(c.secretTrait, c.secretRevealChapter));
    lines.push(...relationshipLines(c.relationships, nameMap));
  }
  lines.push('All names, genders, and relationship labels in this sheet are authoritative.');
  return lines.join('\n');
}

export function buildSystemPrompt({
  genre = 'general',
  tone = 'neutral',
  audience = 'general',
  pov = '3rd',
  structureType = 'linear',
  characters = [],
} = {}) {
  return [
    'SYSTEM PROMPT (cached across chapters)',
    '',
    'You are the ghostwriter for an original novel. Write publish-quality prose.',
    '',
    '== WORLD & STYLE ==',
    `Genre: ${sanitizeUserText(genre || 'general')}`,
    `Tone: ${sanitizeUserText(tone || 'neutral')}`,
    `Target audience: ${sanitizeUserText(audience || 'general')}`,
    `Point of view: ${sanitizeUserText(pov || '3rd')} — maintain strictly. In 1st/2nd person, stay inside the narrating character's knowledge; in 3rd, a consistent limited or omniscient lens.`,
    '',
    '== PROSE RULES ==',
    "- Show, don't tell. Concrete sensory detail over abstractions.",
    '- Vary sentence length for rhythm. No clichés, no purple prose, no anachronisms.',
    '- Dialogue sounds natural and reveals character or advances tension.',
    '- Paragraphs separated by a single blank line. NO markdown, NO headers, NO chapter titles, NO page numbers, NO scene dividers like "***".',
    '- Never break the fourth wall. Never mention "chapter", "AI", or "generated story".',
    '',
    '== STRUCTURE MODE ==',
    buildStructurePrompt(structureType),
    '',
    '== CONSISTENCY CONTRACT ==',
    '1. Character behavior, voice, secrets, and relationships MUST follow the CHARACTER SHEET verbatim. Do not invent traits that contradict it.',
    '2. A secret marked "REVEAL AT: ch.N" may surface only at or after ch.N; before that, foreshadow subtly. A secret marked "DO NOT REVEAL" stays implicit.',
    "3. If premise facts conflict with an arc, the arc's intended resolution wins.",
    '4. Honor every entry in "STORY SO FAR". Never contradict established events, locations, objects, or character states.',
    buildCharacterSheet(characters),
  ].join('\n');
}

export function buildSummaryBlock({ summaries = [], lastLine = '' } = {}) {
  const lines = ['== STORY SO FAR =='];
  const recent = summaries.slice(-MAX_SUMMARIES);
  if (recent.length === 0) {
    lines.push('(No prior events — this is the opening of the story.)');
  } else {
    for (const s of recent) lines.push(`[Ch. ${s.order}] ${sanitizeUserText(s.summary)}`);
  }
  lines.push('== CURRENT EVENT ==');
  const flat = String(lastLine || '')
    .replace(/\s+/g, ' ')
    .trim();
  lines.push(`Previous chapter ended: "${sanitizeUserText(flat.slice(-120))}"`);
  return lines.join('\n');
}

// Derived word budget (SPEC lengthTarget short/medium/long or a literal count).
function estimateWords(lengthTarget, total) {
  const lit = Number(lengthTarget);
  if (Number.isFinite(lit) && lit > 0) return Math.round(lit / Math.max(1, total || 1));
  const map = { short: 800, medium: 1500, long: 2500 };
  return map[lengthTarget] || 1500;
}

export function buildChapterPrompt({
  story = {},
  summaryBlock,
  chapterIndex = 1,
  total = 1,
  chapterGoal = '',
} = {}) {
  const chapterTitle = sanitizeUserText(story.title || `Chapter ${chapterIndex}`);
  const requiredBeats = sanitizeUserText(
    story.requiredBeats ||
      "Advance the premise using the characters' established traits and the events above.",
  );
  const cliffhangerRule =
    Number(total) > 0 && Number(chapterIndex) >= Number(total)
      ? 'Resolve the story.'
      : 'End on a hook.';
  return [
    `USER TURN (chapter ${chapterIndex} of ${total})`,
    '',
    summaryBlock || '',
    '',
    '== THIS CHAPTER ==',
    `Title: ${chapterTitle}`,
    `Core beat: ${sanitizeUserText(chapterGoal)}`,
    `Required elements this chapter: ${requiredBeats}`,
    cliffhangerRule,
    `Word budget: ~${estimateWords(story.lengthTarget, total)}`,
    '',
    'Write the chapter now.',
  ].join('\n');
}

export function buildPolishPrompt({ draft = '', story = {} } = {}) {
  return [
    'USER TURN — POLISH',
    '',
    "Polish the author's draft below while preserving their plot, scene order, voice intent, and structure. Do NOT add or remove scenes or characters. Improve rhythm, dialogue, sensory detail, grammar, and continuity. Output clean prose only (no markdown).",
    '',
    '== POLISH TARGET ==',
    `Tone: ${sanitizeUserText(story.tone || 'neutral')}    Genre: ${sanitizeUserText(story.genre || 'general')}`,
    '',
    '== DRAFT ==',
    sanitizeUserText(draft, 100000),
  ].join('\n');
}

const GENRE_STYLE_TAGS = {
  fantasy: 'atmospheric ink-and-watercolor illustration, deep indigo palette',
  noir: 'high-contrast noir woodcut, ink on cream',
  horror: 'grainy charcoal chiaroscuro, moody shadows',
  romance: 'luminous watercolor, soft warm palette',
  scifi: 'sleek retro-futurist poster, cobalt and violet',
  mystery: 'layered newspaper-ink collage, muted dusk tones',
  adventure: 'bold mid-century travel poster, vermilion and teal',
};

export function buildCoverPrompt(story = {}) {
  const styleTag =
    GENRE_STYLE_TAGS[story.genre] || 'contemporary editorial illustration, restrained palette';
  const genre = sanitizeUserText(story.genre || 'general');
  const description = [
    'USER TURN — COVER',
    '',
    `Describe a cover image for this novel. Return exactly two paragraphs. Paragraph 1 (250–400 words): primary subject, composition, color palette, lighting, and mood for a ${genre} cover. Must contain no text, lettering, or logos.`,
    'Paragraph 2: a single-line style tag for the illustrator, e.g. "high-contrast noir woodcut, ink on cream".',
    '',
    '== STORY ==',
    `Title: ${sanitizeUserText(story.title || 'Untitled')}`,
    `Premise: ${sanitizeUserText(story.premise || '')}`,
    `Tone: ${sanitizeUserText(story.tone || 'neutral')}    Genre: ${genre}`,
  ].join('\n');
  return { description, styleTag };
}

export default {
  buildSystemPrompt,
  buildCharacterSheet,
  buildSummaryBlock,
  buildChapterPrompt,
  buildPolishPrompt,
  buildCoverPrompt,
  buildStructurePrompt,
  sanitizeUserText,
};
