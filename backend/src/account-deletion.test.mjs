import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import pg from 'pg';

const databaseUrl = process.env.TEST_DATABASE_URL;
const apiUrl = process.env.TEST_API_URL;
if (!databaseUrl || !apiUrl) {
  throw new Error('Set TEST_DATABASE_URL and TEST_API_URL to an isolated test database and backend.');
}

test('account deletion verifies the password and removes associated data and likes', async () => {
  const pool = new pg.Pool({ connectionString: databaseUrl });
  const suffix = randomUUID().replaceAll('-', '').slice(0, 12);
  const password = 'testing-password-123';
  const createdUsers = [];
  const gameId = Math.floor(Math.random() * 500000000) + 1500000000;
  let gameCreated = false;
  const ids = { review: `review_${suffix}`, otherReview: `other_${suffix}`, list: `list_${suffix}`, audit: `audit_${suffix}` };
  const request = (path, options = {}) => fetch(new URL(path, apiUrl), options);

  async function register(name) {
    const response = await request('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: `${name}_${suffix}`, email: `${name}_${suffix}@example.test`, password })
    });
    assert.equal(response.status, 201);
    const { user } = await response.json();
    createdUsers.push(user.id);
    return { user, cookie: response.headers.getSetCookie()[0].split(';')[0] };
  }

  try {
    const first = await register('delete');
    const second = await register('other');
    const now = new Date().toISOString();
    await pool.query('INSERT INTO games ("igdbId", name) VALUES ($1, $2)', [gameId, 'Test game']);
    gameCreated = true;
    await pool.query(`INSERT INTO "userGames" ("userId", "gameId", status, "updatedAt") VALUES ($1, $2, 'PLAYING', $3)`, [first.user.id, gameId, now]);
    await pool.query(`INSERT INTO "customLists" (id, "userId", name, "createdAt") VALUES ($1, $2, 'Test', $3)`, [ids.list, first.user.id, now]);
    await pool.query(`INSERT INTO follows ("followerId", "followingId") VALUES ($1, $2)`, [first.user.id, second.user.id]);
    await pool.query(`INSERT INTO reviews (id, "userId", "gameId", content, likes, "createdAt") VALUES
      ($1, $2, $3, 'First', '[]', $4), ($5, $6, $3, 'Second', $7, $4)`,
    [ids.review, first.user.id, gameId, now, ids.otherReview, second.user.id, JSON.stringify([first.user.id, second.user.id])]);
    await pool.query(`INSERT INTO "securityEvents" (id, "userId", "eventType", "createdAt") VALUES ($1, $2, 'TEST', $3)`, [ids.audit, first.user.id, now]);

    const toggleLike = () => request(`/api/reviews/${ids.otherReview}/like`, {
      method: 'POST',
      headers: { Cookie: first.cookie }
    });
    assert.equal((await toggleLike()).status, 200);
    assert.deepEqual(JSON.parse((await pool.query('SELECT likes FROM reviews WHERE id = $1', [ids.otherReview])).rows[0].likes), [second.user.id]);
    assert.equal((await toggleLike()).status, 200);

    const deletion = (input) => request('/api/auth/delete-account', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: first.cookie },
      body: JSON.stringify({ password: input })
    });
    assert.equal((await deletion('wrong-password')).status, 403);
    assert.equal((await request('/api/auth/me', { headers: { Cookie: first.cookie } })).status, 200);
    await pool.query('UPDATE reviews SET likes = $1 WHERE id = $2', ['invalid-json', ids.otherReview]);
    assert.equal((await deletion(password)).status, 500);
    assert.equal((await request('/api/auth/me', { headers: { Cookie: first.cookie } })).status, 200);
    await pool.query('UPDATE reviews SET likes = $1 WHERE id = $2', [JSON.stringify([first.user.id, second.user.id]), ids.otherReview]);
    assert.equal((await deletion(password)).status, 204);
    assert.equal((await request('/api/auth/me', { headers: { Cookie: first.cookie } })).status, 401);

    const checks = await pool.query(`
      SELECT
        (SELECT count(*) FROM users WHERE id = $1) AS users,
        (SELECT count(*) FROM "userGames" WHERE "userId" = $1) AS games,
        (SELECT count(*) FROM "customLists" WHERE "userId" = $1) AS lists,
        (SELECT count(*) FROM follows WHERE "followerId" = $1 OR "followingId" = $1) AS follows,
        (SELECT count(*) FROM reviews WHERE "userId" = $1) AS reviews,
        (SELECT count(*) FROM sessions WHERE "userId" = $1) AS sessions,
        (SELECT likes FROM reviews WHERE id = $2) AS likes,
        (SELECT "userId" FROM "securityEvents" WHERE id = $3) AS "auditUser"
    `, [first.user.id, ids.otherReview, ids.audit]);
    const row = checks.rows[0];
    for (const key of ['users', 'games', 'lists', 'follows', 'reviews', 'sessions']) assert.equal(Number(row[key]), 0, key);
    assert.deepEqual(JSON.parse(row.likes), [second.user.id]);
    assert.equal(row.auditUser, null);
  } finally {
    await pool.query('DELETE FROM users WHERE id = ANY($1::text[])', [createdUsers]);
    if (gameCreated) await pool.query('DELETE FROM games WHERE "igdbId" = $1', [gameId]);
    await pool.query('DELETE FROM "securityEvents" WHERE id = $1', [ids.audit]);
    await pool.end();
  }
});
