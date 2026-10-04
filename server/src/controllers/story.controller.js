import storyService from '../services/storyService.js';

// StoryBuilder story controller (SPEC §3.2 Stories / §3.4).
// Thin wrapper: parse => call one service => shape response.
// Ownership scoping lives entirely in the service (404 NOT_FOUND, never 403 —
// ACR-B-03). Optimistic-concurrency (`baseVersion -1` force) surfaces as
// `{ story, lostUpdate: true }`.

function serialize(s) {
  return s && s.toObject ? s.toObject() : s;
}

export async function list(req, res, next) {
  try {
    const stories = await storyService.list(req.user._id);
    res.json({ stories: stories.map(serialize) });
  } catch (err) {
    next(err);
  }
}

export async function create(req, res, next) {
  try {
    const story = await storyService.create(req.user._id, req.body);
    res.status(201).json({ story: serialize(story) });
  } catch (err) {
    next(err);
  }
}

export async function get(req, res, next) {
  try {
    const withVersions = req.query.withVersions === '1';
    const story = await storyService.get(req.user._id, req.params.id, { withVersions });
    res.json(story);
  } catch (err) {
    next(err);
  }
}

export async function update(req, res, next) {
  try {
    const { baseVersion, ...patch } = req.body;
    const story = await storyService.update(req.user._id, req.params.id, patch, baseVersion);
    res.json({ story: serialize(story), ...(story.lostUpdate ? { lostUpdate: true } : {}) });
  } catch (err) {
    next(err);
  }
}

export async function remove(req, res, next) {
  try {
    await storyService.remove(req.user._id, req.params.id);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

export async function publish(req, res, next) {
  try {
    const result = await storyService.publish(req.user._id, req.params.id, req.body.isPublic);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getPublic(req, res, next) {
  try {
    const story = await storyService.getPublic(req.params.shareToken);
    if (!story) {
      return res.status(404).json({ code: 'NOT_FOUND', message: 'Story not found.' });
    }
    return res.json(story);
  } catch (err) {
    return next(err);
  }
}

export async function saveChapter(req, res, next) {
  try {
    const { baseVersion, ...patch } = req.body;
    const chapter = await storyService.saveChapter(
      req.user._id,
      req.params.id,
      req.params.chapterId,
      patch,
      baseVersion,
    );
    res.json({ chapter: serialize(chapter) });
  } catch (err) {
    next(err);
  }
}

export default { list, create, get, update, remove, publish, getPublic, saveChapter };
