import nodeService from '../services/nodeService.js';

// StoryBuilder node controller (SPEC §3.2 Branching / §3.4).
// Thin wrapper: parse => call one service => shape response.
// Ownership scoping lives in the service (404 NOT_FOUND, never 403 — ACR-B-03).
// Optimistic-concurrency (`baseVersion -1` force) surfaces as
// `{ node, lostUpdate: true }`.

function serialize(n) {
  return n && n.toObject ? n.toObject() : n;
}

export async function list(req, res, next) {
  try {
    const { nodes, edges } = await nodeService.list(req.user._id, req.params.id);
    res.json({ nodes: nodes.map(serialize), edges });
  } catch (err) {
    next(err);
  }
}

export async function create(req, res, next) {
  try {
    const node = await nodeService.create(req.user._id, req.params.id, req.body);
    res.status(201).json({ node: serialize(node) });
  } catch (err) {
    next(err);
  }
}

export async function update(req, res, next) {
  try {
    const { baseVersion, ...patch } = req.body;
    const node = await nodeService.update(req.user._id, req.params.nodeId, patch, baseVersion);
    res.json({ node: serialize(node), ...(node.lostUpdate ? { lostUpdate: true } : {}) });
  } catch (err) {
    next(err);
  }
}

export async function remove(req, res, next) {
  try {
    const cascade = req.query.cascade === undefined ? true : req.query.cascade !== '0';
    const result = await nodeService.remove(req.user._id, req.params.nodeId, { cascade });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function addChoice(req, res, next) {
  try {
    const { label, targetNodeId } = req.body;
    const { choice } = await nodeService.addChoice(req.user._id, req.params.nodeId, {
      label,
      targetNodeId,
    });
    res.status(201).json({ choice: serialize(choice) });
  } catch (err) {
    next(err);
  }
}

export async function removeChoice(req, res, next) {
  try {
    await nodeService.removeChoice(req.user._id, req.params.nodeId, req.params.choiceId);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

export default { list, create, update, remove, addChoice, removeChoice };
