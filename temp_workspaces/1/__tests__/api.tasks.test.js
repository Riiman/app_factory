const request = require('supertest');
let app;
let token;

describe('Task API', () => {
  beforeAll(async () => {
    jest.resetModules();
    app = require('../api');
    await request(app)
      .post('/auth/register')
      .send({ username: 'taskuser', email: 'task@example.com', password: 'password', role: 'user' });
    const res = await request(app)
      .post('/auth/login')
      .send({ username: 'taskuser', password: 'password' });
    token = res.body.token;
  });

  test('Create task', async () => {
    const res = await request(app)
      .post('/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Test Task', description: 'Task desc' });
    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('title', 'Test Task');
  });
});
