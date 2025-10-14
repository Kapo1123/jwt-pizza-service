const request = require('supertest');
const app = require('../service');
const { Role, DB } = require('../database/database.js');
async function createAdminUser() {
  return createUser({ password: 'toomanysecrets', roles: [{ role: Role.Admin }], domain: 'admin.com' });
}
async function createDinerUser() {
  return createUser({ password: 'toomanysecrets', roles: [{ role: Role.Diner }], domain: 'diner.com' });
}
let testAdminUser;
let token;
beforeAll(async () => {
  testAdminUser = await createAdminUser();
  token = await login(testAdminUser);
  expectValidJwt(token);
});
const createdUserIds = new Set();

afterAll(async () => {
  for (const userId of createdUserIds) {
    try {
      await DB.deleteUser(userId);
    } catch {
      // Best-effort clean up. Ignore failures so test suite completion is not blocked.
    }
  }
});

describe('GET /api/user', () => {
  test('returns users when requester is admin', async () => {
    const listUsersRes = await request(app)
      .get('/api/user')
      .set('Authorization', `Bearer ${token}`);

    expect(listUsersRes.status).toBe(200);
    expect(Array.isArray(listUsersRes.body.users)).toBe(true);
    expect(listUsersRes.body.users.length).toBeGreaterThan(0);
    expect(listUsersRes.body.more).toEqual(expect.any(Boolean));
    expect(listUsersRes.body.users[0]).toEqual(
      expect.objectContaining({
        id: expect.any(Number),
        name: expect.any(String),
        email: expect.any(String),
        roles: expect.any(Array),
      })
    );
  });

  test('supports pagination metadata via more flag', async () => {
    const userOne = await createUser({ domain: 'page-test.com' });
    const userTwo = await createUser({ domain: 'page-test.com' });

    const firstPageRes = await request(app)
      .get('/api/user?page=0&limit=1')
      .set('Authorization', `Bearer ${token}`);

    expect(firstPageRes.status).toBe(200);
    expect(firstPageRes.body.users).toHaveLength(1);
    expect(firstPageRes.body.more).toBe(true);

    const secondPageRes = await request(app)
      .get('/api/user?page=1&limit=1')
      .set('Authorization', `Bearer ${token}`);

    expect(secondPageRes.status).toBe(200);
    expect(secondPageRes.body.users).toHaveLength(1);
    expect(secondPageRes.body.more).toBe(false);
  });

  test('applies wildcard name filtering', async () => {
    const matchingUser = await createUser({ domain: 'filter-match.com' });
    const nonMatchingUser = await createUser({ domain: 'filter-miss.com' });

    const filteredRes = await request(app)
      .get(`/api/user?name=${matchingUser.name.slice(0, 5)}*`)
      .set('Authorization', `Bearer ${token}`);

    expect(filteredRes.status).toBe(200);
    const returnedIds = filteredRes.body.users.map((u) => u.id);
    expect(returnedIds).toContain(matchingUser.id);
    expect(returnedIds).not.toContain(nonMatchingUser.id);
  });

  test('rejects non-admin callers', async () => {
    const diner = await createUser();
    const dinerToken = await login(diner);

    const listUsersRes = await request(app)
      .get('/api/user')
      .set('Authorization', `Bearer ${dinerToken}`);

    expect(listUsersRes.status).toBe(403);
    expect(listUsersRes.body).toEqual({ message: 'unauthorized' });
  });
});

describe('DELETE /api/user/:userId', () => {
  test('allows admins to remove users', async () => {
    const targetUser = await createDinerUser();

    const deleteRes = await request(app)
      .delete(`/api/user/${targetUser.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body).toEqual({ message: 'user deleted' });

    const loginRes = await request(app).put('/api/auth').send({ email: targetUser.email, password: targetUser.password });
    expect(loginRes.status).toBe(404);
    expect(loginRes.body).toEqual(expect.objectContaining({ message: 'unknown user' }));

    createdUserIds.delete(targetUser.id);
  });

  test('allows a user to delete their own account', async () => {
    const selfUser = await createUser();
    const selfToken = await login(selfUser);

    const deleteRes = await request(app)
      .delete(`/api/user/${selfUser.id}`)
      .set('Authorization', `Bearer ${selfToken}`);

    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body).toEqual({ message: 'user deleted' });

    const profileRes = await request(app)
      .get('/api/user/me')
      .set('Authorization', `Bearer ${selfToken}`);
    expect(profileRes.status).toBe(401);
    expect(profileRes.body).toEqual({ message: 'unauthorized' });

    createdUserIds.delete(selfUser.id);
  });

  test('blocks non-admins from deleting other users', async () => {
    const attacker = await createUser({ domain: 'attacker.com' });
    const victim = await createUser({ domain: 'victim.com' });
    const attackerToken = await login(attacker);

    const deleteRes = await request(app)
      .delete(`/api/user/${victim.id}`)
      .set('Authorization', `Bearer ${attackerToken}`);

    expect(deleteRes.status).toBe(403);
    expect(deleteRes.body).toEqual({ message: 'unauthorized' });
  });
});
function randomName() {
  return Math.random().toString(36).substring(2, 12);
}
async function login(user) {
  const loginRes = await request(app).put('/api/auth').send(user);
  return loginRes.body.token;
}
function expectValidJwt(token) {
  expect(token).toBeDefined();
  expect(typeof token).toBe('string');
}
async function createUser({ password = 'toomanysecrets', roles = [{ role: Role.Diner }], domain = 'test.com' } = {}) {
  const user = { password, roles };
  user.name = randomName();
  user.email = `${user.name}@${domain}`;

  const created = await DB.addUser(user);
  createdUserIds.add(created.id);
  return { ...created, password };
}