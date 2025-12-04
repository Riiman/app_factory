const request = require('supertest');
const express = require('express');
let app;

describe('Auth API', () => {
  beforeAll(() => {
    jest.resetModules();
    app = require('../api');
  });

  test('Register user', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ username: 'testuser', email: 'test@example.com', password: 'password', role: 'user' });
    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('username', 'testuser');
  });

  test('Login user', async () => {
    await request(app)
      .post('/auth/register')
      .send({ username: 'loginuser', email: 'login@example.com', password: 'password', role: 'user' });
    const res = await request(app)
      .post('/auth/login')
      .send({ username: 'loginuser', password: 'password' });
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('token');
  });
});
