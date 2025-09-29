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

beforeAll(async () => {
  testAdminUser = await createAdminUser();
  token = await login(testAdminUser);
  expectValidJwt(token);
});
test('get menu', async () => {
  const res = await request(app).get('/api/order/menu');
  expect(res.status).toBe(200);
  expect(Array.isArray(res.body)).toBe(true);
  expect(res.body.length).toBeGreaterThan(0);
});

test('create item', async () => {
  const res = await request(app)
    .put('/api/order/menu')
    .set('Authorization', `Bearer ${token}`)
    .send({
      "title":"Student", "description": "No topping, no sauce, just carbs", "image":"pizza9.png", "price": 0.0001
    });

  expect(res.status).toBe(200);
  expect(Array.isArray(res.body)).toBe(true);
  const newItem = res.body.find(item => item.title === 'Student' && item.description === 'No topping, no sauce, just carbs');
  
  expect(newItem).toBeDefined();
  expect(newItem).toHaveProperty('id');
  expect(newItem).toHaveProperty('title', 'Student');
  expect(newItem).toHaveProperty('description', 'No topping, no sauce, just carbs');
  expect(newItem).toHaveProperty('price', 0.0001);
});

test('create order', async () => {
  const res = await request(app)
    .post('/api/order')
    .set('Authorization', `Bearer ${token}`)
    .send({
      "franchiseId": 1, "storeId":1, "items":[{ "menuId": 1, "description": "Veggie", "price": 0.05 }]
    });

  expect(res.status).toBe(200);
  expect(res.body).toHaveProperty('order');
  expect(res.body).toHaveProperty('jwt');
  expectValidJwt(res.body.jwt);
});

test('get orders', async () => {
  const res = await request(app)
    .get('/api/order')
    .set('Authorization', `Bearer ${token}`);
  
  expect(res.status).toBe(200);
  expect(res.body).toHaveProperty('dinerId');
  expect(res.body).toHaveProperty('orders');
  expect(Array.isArray(res.body.orders)).toBe(true);
});

function expectValidJwt(potentialJwt) {
  expect(potentialJwt).toMatch(/^[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*$/);
}
function randomName() {
  return Math.random().toString(36).substring(2, 12);
}
async function login(user) {
  const loginRes = await request(app).put('/api/auth').send(user);
  return loginRes.body.token;
}