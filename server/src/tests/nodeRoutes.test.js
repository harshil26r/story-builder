import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import createApp from '../app.js';
import User from '../models/User.js';
import Story from '../models/Story.js';
import BranchNode from '../models/BranchNode.js';

// TICKET-72: Branching REST routes — GET/POST /api/stories/:id/nodes,
// PUT/DELETE /api/nodes/:nodeId, POST/DELETE /api/nodes/:nodeId/choices.
// All AUTH + CSRF + validate. Graph invariants surface structured errors
// (400 VALIDATION/CYCLIC, 409 HAS_CHILDREN/CONFLICT); non-branching story →
// 400; cross-user access → 404 NOT_FOUND.
describe('Node routes (TICKET-72)', () => {
  let server;
  let base;
  const TEST_MONGO = 'mongodb://127.0.0.1/story-builder-test-node-routes';

  let userA;
  let userB;
  let cookieA;
  let cookieB;
  let csrfA;
  let csrfB;

  let storyA; // branching, owned by A
  let storyLinear; // linear, owned by A
  let storyB; // branching, owned by B

  let startNode;
  let childNode;

  beforeAll(async () => {
    await mongoose.connect(TEST_MONGO);
    await User.syncIndexes();
    await Story.syncIndexes();
    await BranchNode.syncIndexes();
    const app = await createApp(TEST_MONGO);
    server = app.listen(0);
    await new Promise((resolve) => server.on('listening', resolve));
    base = `http://127.0.0.1:${server.address().port}`;

    userA = await User.create({
      name: 'Ava',
      email: 'ava@example.com',
      passwordHash: 'password1',
      isEmailVerified: true,
    });
    userB = await User.create({
      name: 'Ben',
      email: 'ben@example.com',
      passwordHash: 'password1',
      isEmailVerified: true,
    });

    const sessionA = await login(userA.email);
    cookieA = sessionA.cookie;
    csrfA = sessionA.csrf;
    const sessionB = await login(userB.email);
    cookieB = sessionB.cookie;
    csrfB = sessionB.csrf;

    // Seed the three stories (branching for skip-the-400 tests, linear for the
    // non-branching → 400 check, one branching owned by B for cross-user 404s).
    storyA = await createStory(cookieA, csrfA, 'Branch Tale');
    storyLinear = await createStory(cookieA, csrfA, 'Linear Tale', 'linear');
    storyB = await createStory(cookieB, csrfB, 'B Branch', 'branching');
  });

  afterAll(async () => {
    if (server) server.close();
    await Story.deleteMany({});
    await BranchNode.deleteMany({});
    await User.deleteMany({});
    await mongoose.disconnect();
  });

  async function getCsrf() {
    const res = await fetch(`${base}/api/auth/csrf`);
    const cookie = res.headers.getSetCookie().find((c) => c.startsWith('csrfToken='));
    const value = cookie.split(';')[0].split('=').slice(1).join('=');
    return { token: value, cookie: `csrfToken=${value}` };
  }

  async function login(email) {
    const csrf = await getCsrf();
    const res = await fetch(`${base}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrf.token },
      body: JSON.stringify({ email, password: 'password1' }),
    });
    const sidCookie = res.headers
      .getSetCookie()
      .find((c) => c.startsWith('connect.sid='))
      .split(';')[0];
    return { cookie: `${sidCookie}; ${csrf.cookie}`, csrf };
  }

  function headers(csrf, cookie) {
    return {
      'Content-Type': 'application/json',
      'x-csrf-token': csrf.token,
      Cookie: cookie,
    };
  }

  async function createStory(cookie, csrf, title, structureType = 'branching') {
    const res = await fetch(`${base}/api/stories`, {
      method: 'POST',
      headers: headers(csrf, cookie),
      body: JSON.stringify({
        title,
        premise: 'A door that opens onto every path not taken.',
        pov: '3rd',
        structureType,
        generationMode: 'full-ai',
        characterIds: [],
      }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    return body.story;
  }

  async function createNode(storyId, cookie, csrf, payload) {
    const res = await fetch(`${base}/api/stories/${storyId}/nodes`, {
      method: 'POST',
      headers: headers(csrf, cookie),
      body: JSON.stringify(payload),
    });
    return res;
  }

  it('GET /api/stories/:id/nodes unauthorized → 401 UNAUTHORIZED', async () => {
    const res = await fetch(`${base}/api/stories/${storyA._id}/nodes`);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('GET /api/stories/:id/nodes returns empty NodeListResponse', async () => {
    const res = await fetch(`${base}/api/stories/${storyA._id}/nodes`, {
      headers: { Cookie: cookieA },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.nodes).toEqual([]);
    expect(body.edges).toEqual([]);
  });

  it('GET nodes on a non-branching story → 400 VALIDATION_ERROR', async () => {
    const res = await fetch(`${base}/api/stories/${storyLinear._id}/nodes`, {
      headers: { Cookie: cookieA },
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('VALIDATION_ERROR');
  });

  it('POST /api/stories/:id/nodes first node → 201 with isStart:true', async () => {
    const res = await createNode(storyA._id, cookieA, csrfA, {
      title: 'The Gate',
      content: 'You stand before the iron gate.',
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.node.title).toBe('The Gate');
    expect(body.node.isStart).toBe(true);
    expect(body.node.parentId).toBeNull();
    expect(body.node.storyId).toBe(storyA._id);
    startNode = body.node;
  });

  it('POST child node via parentId → 201 with parentId set', async () => {
    const res = await createNode(storyA._id, cookieA, csrfA, {
      parentId: startNode._id,
      title: 'The Crypt',
      content: 'Stairs descend into darkness.',
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.node.parentId).toBe(startNode._id);
    expect(body.node.isStart).toBe(false);
    childNode = body.node;
  });

  it('POST rootless (no parentId) once nodes exist → 400 VALIDATION_ERROR', async () => {
    const res = await createNode(storyA._id, cookieA, csrfA, {
      title: 'Rootless',
      content: 'No path leads here.',
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('VALIDATION_ERROR');
  });

  it("POST nodes to another user's story → 404 NOT_FOUND (never 403)", async () => {
    const res = await createNode(storyB._id, cookieA, csrfA, {
      title: 'Trespass',
      content: 'Not allowed.',
    });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.code).toBe('NOT_FOUND');
  });

  it('POST choice on a node → 201 ChoiceResponse', async () => {
    const res = await fetch(`${base}/api/nodes/${childNode._id}/choices`, {
      method: 'POST',
      headers: headers(csrfA, cookieA),
      body: JSON.stringify({ label: 'Follow the tunnels' }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.choice._id).toBeTruthy();
    expect(body.choice.label).toBe('Follow the tunnels');
    expect(body.choice.targetNodeId).toBeNull();
  });

  it('POST choice with 1-char label → 400 VALIDATION_ERROR with fields', async () => {
    const res = await fetch(`${base}/api/nodes/${childNode._id}/choices`, {
      method: 'POST',
      headers: headers(csrfA, cookieA),
      body: JSON.stringify({ label: 'x' }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('VALIDATION_ERROR');
    expect(Array.isArray(body.fields)).toBe(true);
  });

  it('PUT /api/nodes/:nodeId with matching baseVersion bumps version + pushes snapshot', async () => {
    const fresh = await BranchNode.findById(childNode._id);
    const res = await fetch(`${base}/api/nodes/${childNode._id}`, {
      method: 'PUT',
      headers: headers(csrfA, cookieA),
      body: JSON.stringify({ content: 'Deeper into the dark.', baseVersion: fresh.version }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.node.content).toBe('Deeper into the dark.');
    expect(body.node.version).toBe(fresh.version + 1);
    expect(body.node.versions).toHaveLength(1);
  });

  it('PUT /api/nodes/:nodeId with stale baseVersion → 409 CONFLICT', async () => {
    const res = await fetch(`${base}/api/nodes/${childNode._id}`, {
      method: 'PUT',
      headers: headers(csrfA, cookieA),
      body: JSON.stringify({ content: 'stale write', baseVersion: 1 }),
    });
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.code).toBe('CONFLICT');
    expect(body.fields).toEqual([{ field: 'version', message: 'expected 1, got 3' }]);
  });

  it('PUT /api/nodes/:nodeId cross-user → 404 NOT_FOUND', async () => {
    const res = await fetch(`${base}/api/nodes/${startNode._id}`, {
      method: 'PUT',
      headers: headers(csrfB, cookieB),
      body: JSON.stringify({ title: 'Hacked' }),
    });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.code).toBe('NOT_FOUND');
  });

  it('DELETE /api/nodes/:nodeId/choices/:choiceId removes the choice → { ok:true }', async () => {
    const add = await fetch(`${base}/api/nodes/${childNode._id}/choices`, {
      method: 'POST',
      headers: headers(csrfA, cookieA),
      body: JSON.stringify({ label: 'Turn back now' }),
    });
    const { choice } = await add.json();

    const res = await fetch(`${base}/api/nodes/${childNode._id}/choices/${choice._id}`, {
      method: 'DELETE',
      headers: headers(csrfA, cookieA),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  it('DELETE /api/nodes/:nodeId?cascade=0 with children → 409 HAS_CHILDREN', async () => {
    await createNode(storyA._id, cookieA, csrfA, {
      parentId: childNode._id,
      title: 'Grand Hall',
      content: 'A cavern echoes.',
    });

    const res = await fetch(`${base}/api/nodes/${childNode._id}?cascade=0`, {
      method: 'DELETE',
      headers: headers(csrfA, cookieA),
    });
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.code).toBe('HAS_CHILDREN');
    expect(await BranchNode.findById(childNode._id)).toBeTruthy();
  });

  it('DELETE /api/nodes/:nodeId (cascade default) orphans children and returns orphanedChoices', async () => {
    // childNode now has one child (Grand Hall) and one choice ('Follow the
    // tunnels' → no target). Deleting it must not 409 (cascade on) and must
    // keep the child; orphanedChoices counts choice edges pointing at it.
    const target = await createNode(storyA._id, cookieA, csrfA, {
      parentId: startNode._id,
      title: 'Doomed Door',
      content: 'A door that will vanish.',
    });
    const doomed = (await target.json()).node;
    await fetch(`${base}/api/nodes/${startNode._id}/choices`, {
      method: 'POST',
      headers: headers(csrfA, cookieA),
      body: JSON.stringify({ label: 'Open the door', targetNodeId: doomed._id }),
    });

    const res = await fetch(`${base}/api/nodes/${doomed._id}`, {
      method: 'DELETE',
      headers: headers(csrfA, cookieA),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.orphanedChoices).toBe(1);

    const freshStart = await BranchNode.findById(startNode._id);
    const opened = freshStart.choices.find((c) => c.label === 'Open the door');
    expect(opened.targetNodeId).toBeNull();
  });

  it('GET /api/stories/:id/nodes returns nodes and edges for the owner', async () => {
    const res = await fetch(`${base}/api/stories/${storyA._id}/nodes`, {
      headers: { Cookie: cookieA },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.nodes.length).toBeGreaterThanOrEqual(1);
    expect(body.nodes.every((n) => n.storyId === storyA._id)).toBe(true);
    expect(body.edges.some((e) => e.label === 'The Crypt')).toBe(true);
  });

  it('GET nodes cross-user → 404 NOT_FOUND (never 403)', async () => {
    const res = await fetch(`${base}/api/stories/${storyB._id}/nodes`, {
      headers: { Cookie: cookieA },
    });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.code).toBe('NOT_FOUND');
  });

  it('missing CSRF on mutating request → 403 FORBIDDEN', async () => {
    const res = await fetch(`${base}/api/stories/${storyA._id}/nodes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookieA },
      body: JSON.stringify({ title: 'No Csrf' }),
    });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.code).toBe('FORBIDDEN');
  });

  it('invalid node id → 404 NOT_FOUND', async () => {
    const res = await fetch(`${base}/api/nodes/not-an-objectid`, {
      method: 'PUT',
      headers: headers(csrfA, cookieA),
      body: JSON.stringify({ title: 'Bad' }),
    });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.code).toBe('NOT_FOUND');
  });

  it('choiceDeleteSchema validates params: bad choiceId → 400 VALIDATION_ERROR', async () => {
    const res = await fetch(`${base}/api/nodes/${childNode._id}/choices/not-an-objectid`, {
      method: 'DELETE',
      headers: headers(csrfA, cookieA),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('VALIDATION_ERROR');
  });
});
