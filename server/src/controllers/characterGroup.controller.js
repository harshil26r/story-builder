import characterGroupService from '../services/characterGroupService.js';

// StoryBuilder character-group controller — thin wrapper around the scoped
// group service. Ownership is enforced in the service (404, never 403).

function serialize(g) {
  return g.toObject ? g.toObject() : g;
}

export async function list(req, res, next) {
  try {
    const groups = await characterGroupService.list(req.user._id);
    res.json({ groups: groups.map(serialize) });
  } catch (err) {
    next(err);
  }
}

export async function create(req, res, next) {
  try {
    const group = await characterGroupService.create(req.user._id, req.body.name);
    res.status(201).json({ group: serialize(group) });
  } catch (err) {
    next(err);
  }
}

export async function update(req, res, next) {
  try {
    const group = await characterGroupService.update(req.user._id, req.params.id, req.body.name);
    res.json({ group: serialize(group) });
  } catch (err) {
    next(err);
  }
}

export async function remove(req, res, next) {
  try {
    const result = await characterGroupService.remove(req.user._id, req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export default { list, create, update, remove };
