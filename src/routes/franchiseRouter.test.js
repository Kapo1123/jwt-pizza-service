const request = require('supertest');
const app = require('../service');

const { Role, DB } = require('../database/database.js');

async function createAdminUser() {
  let user = { password: 'toomanysecrets', roles: [{ role: Role.Admin }] };
  user.name = randomName();
  user.email = user.name + '@admin.com';

  user = await DB.addUser(user);
  return { ...user, password: 'toomanysecrets' };
}
let testFranchise;
let testAdminUser;
let token;
beforeAll(async () => {
  testAdminUser = await createAdminUser();
  token = await login(testAdminUser);
  const newFranchiseName = `Test Franchise ${randomName()}`;
  const franchiseRes = await request(app)
    .post('/api/franchise')
    .set('Authorization', `Bearer ${token}`)
    .send({
      name: newFranchiseName,
      admins: [{ email: testAdminUser.email }]
    });
  
  console.log("franchiseRes", franchiseRes.body);
  testFranchise = franchiseRes.body;
});

function randomName() {
  return Math.random().toString(36).substring(2, 12);
}

test('list all franchises', async () => {
  const res = await request(app)
    .get('/api/franchise'); 
  
  expect(res.status).toBe(200);
  expect(res.body).toHaveProperty('franchises');
  expect(res.body).toHaveProperty('more');
  expect(Array.isArray(res.body.franchises)).toBe(true);
});

test('get franchise by id', async () => {
  const res = await request(app)
    .get(`/api/franchise/${testAdminUser.id}`).set('Authorization', `Bearer ${token}`);  
  
  expect(res.status).toBe(200);
  expect(Array.isArray(res.body)).toBe(true);
});


test('create store', async () => {
  const randomNum = Math.floor(Math.random() * 1000); 
  const res = await request(app)
    .post(`/api/franchise/${testFranchise.id}/store`)
    .set('Authorization', `Bearer ${token}`)
    .send({
      name: `Test Store ${randomNum}`,
    });

  expect(res.status).toBe(200);
  expect(res.body).toHaveProperty('id');
  expect(res.body).toHaveProperty('name', `Test Store ${randomNum}`);
  expect(res.body).toHaveProperty('franchiseId', testFranchise.id);
});

test('delete franchise', async () => {
    const res = await request(app)
      .delete(`/api/franchise/${testFranchise.id}`)
      .set('Authorization', `Bearer ${token}`);
  
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('message', 'franchise deleted');
});

async function login(user) {
  const loginRes = await request(app).put('/api/auth').send(user);
  return loginRes.body.token;
}
