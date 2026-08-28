import characterService from '../services/characterService.js';

// StoryBuilder character controller (SPEC §3.2 Characters / §3.4).
// Thin wrapper: parse => call one service => shape response.
// Ownership scoping lives entirely in the service (ACR-B-03 — other users' chars
// surface as 404 NOT_FOUND, never 403).

function serialize(c) {
  return c.toObject ? c.toObject() : c;
}

export async function list(req, res, next) {
  try {
    const characters = await characterService.list(req.user._id);
    res.json({ characters: characters.map(serialize) });
  } catch (err) {
    next(err);
  }
}

export async function get(req, res, next) {
  try {
    const character = await characterService.get(req.user._id, req.params.id);
    res.json({ character: serialize(character) });
  } catch (err) {
    next(err);
  }
}

export async function create(req, res, next) {
  try {
    const character = await characterService.create(req.user._id, req.body);
    res.status(201).json({ character: serialize(character) });
  } catch (err) {
    next(err);
  }
}

export async function update(req, res, next) {
  try {
    const character = await characterService.update(req.user._id, req.params.id, req.body);
    res.json({ character: serialize(character) });
  } catch (err) {
    next(err);
  }
}

export async function remove(req, res, next) {
  try {
    await characterService.remove(req.user._id, req.params.id);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

export async function copyTemplate(req, res, next) {
  try {
    const character = await characterService.addCharacterCopyIn(
      req.user._id,
      req.params.id,
      req.body.templateCharacterId
    );
    res.json({ character: serialize(character) });
  } catch (err) {
    next(err);
  }
}

export default { list, get, create, update, remove, copyTemplate };