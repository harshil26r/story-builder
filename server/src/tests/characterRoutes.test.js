import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import createApp from '../app.js';
import User from '../models/User.js';
import Character from '../models/Character.js';
import CharacterGroup from '../models/CharacterGroup.js';

// TICKET-34: Character REST routes — GET/POST /api/characters,
// GET/PUT/DELETE /api/characters/:id, POST /api/characters/:id/copy-template.
// All AUTH + CSRF + validate. Cross-user access → 404 NOT_FOUND (never 403).
describe('Character routes (TICKET-34)', () => {
  let server;
  let base;
  const TEST_MONGO = 'mongodb://127.0.0.1/story-builder-test-character-routes';

  let userA;
  let userB;
  let cookieA;
  let cookieB;
  let csrfA;
  let csrfB;

  beforeAll(async () => {
    await mongoose.connect(TEST_MONGO);
    await User.syncIndexes();
    await Character.syncIndexes();
    await CharacterGroup.syncIndexes();
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

    // Login + CSRF for both users.
    const sessionA = await login(userA.email);
    cookieA = sessionA.cookie;
    csrfA = sessionA.csrf;
    const sessionB = await login(userB.email);
    cookieB = sessionB.cookie;
    csrfB = sessionB.csrf;
  });

  afterAll(async () => {
    if (server) server.close();
    await User.deleteMany({});
    await Character.deleteMany({});
    await CharacterGroup.deleteMany({});
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

  it('unauthenticated POST → 401 UNAUTHORIZED', async () => {
    const res = await fetch(`${base}/api/characters`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Ghost' }),
    });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('POST /api/characters creates a character for the session user → 201', async () => {
    const res = await fetch(`${base}/api/characters`, {
      method: 'POST',
      headers: headers(csrfA, cookieA),
      body: JSON.stringify({
        name: 'Elias',
        description: 'A clockmaker.',
        voiceStyle: 'measured',
        role: 'protagonist',
      }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.character).toBeTruthy();
    expect(body.character.name).toBe('Elias');
    expect(body.character.role).toBe('protagonist');
    expect(body.character.userId).toBe(userA._id.toString());
    expect(body.character._id).toBeTruthy();
  });

  it('POST /api/characters persists the full SPEC character sheet', async () => {
    const res = await fetch(`${base}/api/characters`, {
      method: 'POST',
      headers: headers(csrfA, cookieA),
      body: JSON.stringify({
        name: 'Maven Kestrel',
        age: 32,
        gender: 'nonbinary',
        appearance: 'Silver hair, calm grey eyes.',
        personality: ['brave', 'quiet'],
        likes: ['tea'],
        dislikes: ['liars'],
        habits: 'Whistles shanties.',
        backstory: 'A lighthouse keeper.',
        role: 'protagonist',
        relationships: [
          { characterId: new mongoose.Types.ObjectId().toString(), relationType: 'mentor' },
        ],
        voiceStyle: 'measured',
        catchphrases: ['Time waits for no one.'],
        arc: 'Learns to trust.',
        secretTrait: 'Senses storms.',
        secretRevealChapter: 7,
        isTemplate: false,
      }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.character.personality).toEqual(['brave', 'quiet']);
    expect(body.character.appearance).toBe('Silver hair, calm grey eyes.');
    expect(body.character.backstory).toBe('A lighthouse keeper.');
    expect(body.character.likes).toEqual(['tea']);
    expect(body.character.dislikes).toEqual(['liars']);
    expect(body.character.habits).toBe('Whistles shanties.');
    expect(body.character.age).toBe(32);
    expect(body.character.gender).toBe('nonbinary');
    expect(body.character.relationships).toHaveLength(1);
    expect(body.character.relationships[0].relationType).toBe('mentor');
    expect(body.character.catchphrases).toEqual(['Time waits for no one.']);
    expect(body.character.arc).toBe('Learns to trust.');
    expect(body.character.secretTrait).toBe('Senses storms.');
    expect(body.character.secretRevealChapter).toBe(7);
    expect(body.character.isTemplate).toBe(false);
  });

  it('PUT /api/characters/:id round-trips rich sheet fields', async () => {
    const mine = await fetch(`${base}/api/characters`, {
      method: 'POST',
      headers: headers(csrfA, cookieA),
      body: JSON.stringify({ name: 'Sheet' }),
    });
    const char = (await mine.json()).character;

    const res = await fetch(`${base}/api/characters/${char._id}`, {
      method: 'PUT',
      headers: headers(csrfA, cookieA),
      body: JSON.stringify({
        personality: ['witty', 'loyal'],
        backstory: 'Raised by wolves.',
        appearance: 'Golden eyes.',
        secretTrait: 'Speaks to ravens.',
      }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.character.personality).toEqual(['witty', 'loyal']);
    expect(body.character.backstory).toBe('Raised by wolves.');
    expect(body.character.appearance).toBe('Golden eyes.');
    expect(body.character.secretTrait).toBe('Speaks to ravens.');
  });

  it('POST /api/characters with >12 personality tags → 400 VALIDATION_ERROR', async () => {
    const res = await fetch(`${base}/api/characters`, {
      method: 'POST',
      headers: headers(csrfA, cookieA),
      body: JSON.stringify({
        name: 'Too Many Tags',
        personality: Array.from({ length: 13 }, (_, i) => `tag${i}`),
      }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('VALIDATION_ERROR');
  });

  it('POST /api/characters with missing name → 400 VALIDATION_ERROR', async () => {
    const res = await fetch(`${base}/api/characters`, {
      method: 'POST',
      headers: headers(csrfA, cookieA),
      body: JSON.stringify({ description: 'no name' }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('VALIDATION_ERROR');
    expect(Array.isArray(body.fields)).toBe(true);
  });

  it('POST /api/characters with invalid role → 400 VALIDATION_ERROR', async () => {
    const res = await fetch(`${base}/api/characters`, {
      method: 'POST',
      headers: headers(csrfA, cookieA),
      body: JSON.stringify({ name: 'Bad Role', role: 'villain' }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('VALIDATION_ERROR');
  });

  it("GET /api/characters returns only the session user's characters (userId query ignored)", async () => {
    // User A has Elias (created above); create Ben's char.
    const benChar = await fetch(`${base}/api/characters`, {
      method: 'POST',
      headers: headers(csrfB, cookieB),
      body: JSON.stringify({ name: 'Ben Character' }),
    });
    expect(benChar.status).toBe(201);

    // A's list — even asking for B's id via query string.
    const resA = await fetch(`${base}/api/characters?userId=${userB._id}`, {
      headers: { Cookie: cookieA },
    });
    expect(resA.status).toBe(200);
    const bodyA = await resA.json();
    expect(bodyA.characters).toBeTruthy();
    expect(bodyA.characters.every((c) => c.userId === userA._id.toString())).toBe(true);
    expect(bodyA.characters.some((c) => c.name === 'Elias')).toBe(true);
    expect(bodyA.characters.some((c) => c.name === 'Ben Character')).toBe(false);
  });

  it('GET /api/characters/:id returns the character for the owner', async () => {
    const mine = await fetch(`${base}/api/characters`, {
      method: 'POST',
      headers: headers(csrfA, cookieA),
      body: JSON.stringify({ name: 'Fetch Me' }),
    });
    const char = (await mine.json()).character;

    const res = await fetch(`${base}/api/characters/${char._id}`, { headers: { Cookie: cookieA } });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.character._id).toBe(char._id);
    expect(body.character.name).toBe('Fetch Me');
  });

  it('GET /api/characters/:id cross-user → 404 NOT_FOUND (never 403)', async () => {
    const bChar = await Character.create({ userId: userB._id, name: 'B Secret' });

    const res = await fetch(`${base}/api/characters/${bChar._id}`, {
      headers: { Cookie: cookieA },
    });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.code).toBe('NOT_FOUND');
  });

  it("PUT /api/characters/:id updates owner's character", async () => {
    const mine = await fetch(`${base}/api/characters`, {
      method: 'POST',
      headers: headers(csrfA, cookieA),
      body: JSON.stringify({ name: 'Before' }),
    });
    const char = (await mine.json()).character;

    const res = await fetch(`${base}/api/characters/${char._id}`, {
      method: 'PUT',
      headers: headers(csrfA, cookieA),
      body: JSON.stringify({ name: 'After', description: 'updated', role: 'supporting' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.character.name).toBe('After');
    expect(body.character.description).toBe('updated');
    expect(body.character.role).toBe('supporting');
  });

  it('PUT /api/characters/:id cross-user → 404 NOT_FOUND (never 403)', async () => {
    const aChar = await Character.create({ userId: userA._id, name: 'A Protected' });
    const res = await fetch(`${base}/api/characters/${aChar._id}`, {
      method: 'PUT',
      headers: headers(csrfB, cookieB),
      body: JSON.stringify({ name: 'Hacked' }),
    });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.code).toBe('NOT_FOUND');
  });

  it("DELETE /api/characters/:id removes the owner's character → { ok: true }", async () => {
    const mine = await fetch(`${base}/api/characters`, {
      method: 'POST',
      headers: headers(csrfA, cookieA),
      body: JSON.stringify({ name: 'Delete Me' }),
    });
    const char = (await mine.json()).character;

    const res = await fetch(`${base}/api/characters/${char._id}`, {
      method: 'DELETE',
      headers: headers(csrfA, cookieA),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);

    const gone = await Character.findById(char._id);
    expect(gone).toBeNull();
  });

  it('DELETE /api/characters/:id cross-user → 404 NOT_FOUND (never 403)', async () => {
    const bChar = await Character.create({ userId: userB._id, name: 'B Keep' });
    const res = await fetch(`${base}/api/characters/${bChar._id}`, {
      method: 'DELETE',
      headers: headers(csrfA, cookieA),
    });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.code).toBe('NOT_FOUND');
    // B's char is untouched.
    const still = await Character.findById(bChar._id);
    expect(still).toBeTruthy();
  });

  it('POST /api/characters/:id/copy-template copies template into destination', async () => {
    const template = await fetch(`${base}/api/characters`, {
      method: 'POST',
      headers: headers(csrfA, cookieA),
      body: JSON.stringify({
        name: 'Master Template',
        description: 'A reusable archetype.',
        voiceStyle: 'gravelly',
      }),
    });
    const tpl = (await template.json()).character;

    const dest = await fetch(`${base}/api/characters`, {
      method: 'POST',
      headers: headers(csrfA, cookieA),
      body: JSON.stringify({ name: 'Blank Target' }),
    });
    const dst = (await dest.json()).character;

    const res = await fetch(`${base}/api/characters/${dst._id}/copy-template`, {
      method: 'POST',
      headers: headers(csrfA, cookieA),
      body: JSON.stringify({ templateCharacterId: tpl._id }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.character._id).toBe(dst._id);
    expect(body.character.name).toBe('Master Template');
    expect(body.character.description).toBe('A reusable archetype.');
    expect(body.character.voiceStyle).toBe('gravelly');
  });

  it('POST copy-template cross-user template → 404 NOT_FOUND', async () => {
    const bTpl = await Character.create({ userId: userB._id, name: 'B Template' });
    const aDest = await Character.create({ userId: userA._id, name: 'A Target' });

    const res = await fetch(`${base}/api/characters/${aDest._id}/copy-template`, {
      method: 'POST',
      headers: headers(csrfA, cookieA),
      body: JSON.stringify({ templateCharacterId: bTpl._id }),
    });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.code).toBe('NOT_FOUND');
  });

  it('missing CSRF token on mutating request → 403 FORBIDDEN', async () => {
    const res = await fetch(`${base}/api/characters`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookieA },
      body: JSON.stringify({ name: 'No Csrf' }),
    });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.code).toBe('FORBIDDEN');
  });

  it('POST /api/characters/groups creates a named group → 201', async () => {
    const res = await fetch(`${base}/api/characters/groups`, {
      method: 'POST',
      headers: headers(csrfA, cookieA),
      body: JSON.stringify({ name: 'Villains' }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.group.name).toBe('Villains');
    expect(body.group.userId).toBe(userA._id.toString());
  });

  it('POST /api/characters/groups rejects a duplicate name for the same user → 409', async () => {
    const res = await fetch(`${base}/api/characters/groups`, {
      method: 'POST',
      headers: headers(csrfA, cookieA),
      body: JSON.stringify({ name: 'Villains' }),
    });
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.code).toBe('CONFLICT');
  });

  it('POST /api/characters/groups unauthenticated → 401', async () => {
    const res = await fetch(`${base}/api/characters/groups`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Ghost' }),
    });
    expect(res.status).toBe(401);
  });

  it("GET /api/characters/groups lists only the session user's groups", async () => {
    await fetch(`${base}/api/characters/groups`, {
      method: 'POST',
      headers: headers(csrfB, cookieB),
      body: JSON.stringify({ name: 'B Cast' }),
    });

    const res = await fetch(`${base}/api/characters/groups`, { headers: { Cookie: cookieA } });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.groups.some((g) => g.name === 'Villains')).toBe(true);
    expect(body.groups.some((g) => g.name === 'B Cast')).toBe(false);
  });

  it('PUT /api/characters/groups/:id renames an owned group', async () => {
    const created = await fetch(`${base}/api/characters/groups`, {
      method: 'POST',
      headers: headers(csrfA, cookieA),
      body: JSON.stringify({ name: 'Rename Me' }),
    });
    const gid = (await created.json()).group._id;

    const res = await fetch(`${base}/api/characters/groups/${gid}`, {
      method: 'PUT',
      headers: headers(csrfA, cookieA),
      body: JSON.stringify({ name: 'Final Draft' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.group.name).toBe('Final Draft');
  });

  it('DELETE /api/characters/groups/:id removes the group and clears character membership', async () => {
    const created = await fetch(`${base}/api/characters/groups`, {
      method: 'POST',
      headers: headers(csrfA, cookieA),
      body: JSON.stringify({ name: 'Doomed Cast' }),
    });
    const gid = (await created.json()).group._id;

    const char = await fetch(`${base}/api/characters`, {
      method: 'POST',
      headers: headers(csrfA, cookieA),
      body: JSON.stringify({ name: 'Maven' }),
    });
    const charId = (await char.json()).character._id;

    await fetch(`${base}/api/characters/${charId}/groups`, {
      method: 'PUT',
      headers: headers(csrfA, cookieA),
      body: JSON.stringify({ groupIds: [gid] }),
    });

    const del = await fetch(`${base}/api/characters/groups/${gid}`, {
      method: 'DELETE',
      headers: headers(csrfA, cookieA),
    });
    expect(del.status).toBe(200);
    expect((await del.json()).ok).toBe(true);

    const reloaded = await Character.findById(charId);
    expect(reloaded.groupIds).toHaveLength(0);
  });

  it('PUT /api/characters/:id/groups assigns many groups; GET /api/characters reflects them', async () => {
    const g1 = await (
      await fetch(`${base}/api/characters/groups`, {
        method: 'POST',
        headers: headers(csrfA, cookieA),
        body: JSON.stringify({ name: 'Cast 1' }),
      })
    ).json();
    const g2 = await (
      await fetch(`${base}/api/characters/groups`, {
        method: 'POST',
        headers: headers(csrfA, cookieA),
        body: JSON.stringify({ name: 'Cast 2' }),
      })
    ).json();

    const char = await fetch(`${base}/api/characters`, {
      method: 'POST',
      headers: headers(csrfA, cookieA),
      body: JSON.stringify({ name: 'Multi Cast' }),
    });
    const charId = (await char.json()).character._id;

    const assign = await fetch(`${base}/api/characters/${charId}/groups`, {
      method: 'PUT',
      headers: headers(csrfA, cookieA),
      body: JSON.stringify({ groupIds: [g1.group._id, g2.group._id] }),
    });
    expect(assign.status).toBe(200);

    const list = await fetch(`${base}/api/characters`, { headers: { Cookie: cookieA } });
    const body = await list.json();
    const target = body.characters.find((c) => c._id === charId);
    expect(target.groupIds.sort()).toEqual([g1.group._id, g2.group._id].sort());
  });

  it('PUT /api/characters/:id/groups with a group owned by another user → 404', async () => {
    const bGroup = await (
      await fetch(`${base}/api/characters/groups`, {
        method: 'POST',
        headers: headers(csrfB, cookieB),
        body: JSON.stringify({ name: 'B Only' }),
      })
    ).json();
    const char = await fetch(`${base}/api/characters`, {
      method: 'POST',
      headers: headers(csrfA, cookieA),
      body: JSON.stringify({ name: 'Target' }),
    });
    const charId = (await char.json()).character._id;

    const res = await fetch(`${base}/api/characters/${charId}/groups`, {
      method: 'PUT',
      headers: headers(csrfA, cookieA),
      body: JSON.stringify({ groupIds: [bGroup.group._id] }),
    });
    expect(res.status).toBe(404);
  });

  it('invalid id → 404 NOT_FOUND (mongoose CastError mapped cleanly)', async () => {
    const res = await fetch(`${base}/api/characters/not-an-objectid`, {
      headers: { Cookie: cookieA },
    });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.code).toBe('NOT_FOUND');
  });
});
