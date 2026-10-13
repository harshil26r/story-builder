import Story from '../models/Story.js';

// StoryBuilder explore service — public discovery of published stories.
// `explore()` is the only unauthenticated read of the story catalog: it is
// hard-scoped to `{ isPublic: true }` and projects a public summary shape (no
// userId/PII, no characters, no version snapshots). Search is a safe
// case-insensitive regex over title/premise/genre (user input is escaped — no
// ReDoS / regex-injection from the query string).

const PUBLIC_PROJECTION =
  'title premise genre tone targetAudience structureType generationMode status ' +
  'isPublic shareToken totalChapters wordCount coverImageUrl updatedAt';

const SORTS = {
  recent: { updatedAt: -1 },
  words: { wordCount: -1 },
  chapters: { totalChapters: -1 },
};

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function explore({ q = '', genre, structureType, sort = 'recent', page = 1, limit = 12 } = {}) {
  const filter = { isPublic: true };

  const query = typeof q === 'string' ? q.trim() : '';
  if (query) {
    const rx = new RegExp(escapeRegExp(query), 'i');
    filter.$or = [{ title: rx }, { premise: rx }, { genre: rx }];
  }
  if (genre) filter.genre = new RegExp(`^${escapeRegExp(genre)}$`, 'i');
  if (structureType) filter.structureType = structureType;

  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(Math.floor(limit), 48) : 12;
  const skip = (safePage - 1) * safeLimit;

  const [docs, total] = await Promise.all([
    Story.find(filter)
      .sort(SORTS[sort] || SORTS.recent)
      .skip(skip)
      .limit(safeLimit)
      .select(PUBLIC_PROJECTION)
      .lean()
      .exec(),
    Story.countDocuments(filter),
  ]);

  return {
    stories: docs.map((d) => ({
      ...d,
      updatedAt: d.updatedAt instanceof Date ? d.updatedAt.toISOString() : d.updatedAt,
    })),
    total,
    page: safePage,
    limit: safeLimit,
    hasMore: skip + docs.length < total,
  };
}

export default { explore };
