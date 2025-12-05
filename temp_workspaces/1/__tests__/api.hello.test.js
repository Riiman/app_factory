const request = require('supertest');
let app;

describe('GET /api/hello', () => {
  beforeAll(() => {
    jest.resetModules();
    app = require('../api');
  });

  test('should return Hello World message', async () => {
    const res = await request(app).get('/api/hello');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ message: 'Hello World' });
  });
});
