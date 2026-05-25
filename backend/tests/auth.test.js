const request = require('supertest');

const { resetDb } = require('./setup');
const app = require('../server');

describe('Auth API', () => {
  beforeEach(() => {
    resetDb();
  });

  it('registers a new user', async () => {
    const response = await request(app).post('/api/auth/register').send({
      name: 'Jane Doe',
      email: 'jane@example.com',
      password: 'password123'
    });

    expect(response.status).toBe(201);
    expect(typeof response.body.token).toBe('string');
    expect(response.body.user).toMatchObject({
      name: 'Jane Doe',
      email: 'jane@example.com',
      role: 'passenger'
    });
    expect(response.body.user.id).toBeTypeOf('number');
  });

  it('rejects invalid register payloads', async () => {
    const response = await request(app).post('/api/auth/register').send({
      email: 'missing-fields@example.com'
    });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Validation failed');
    expect(Array.isArray(response.body.details)).toBe(true);
  });

  it('logs in existing users', async () => {
    await request(app).post('/api/auth/register').send({
      name: 'Sam Rider',
      email: 'sam@example.com',
      password: 'securepass'
    });

    const response = await request(app).post('/api/auth/login').send({
      email: 'sam@example.com',
      password: 'securepass'
    });

    expect(response.status).toBe(200);
    expect(typeof response.body.token).toBe('string');
    expect(response.body.user).toMatchObject({
      name: 'Sam Rider',
      email: 'sam@example.com'
    });
  });

  it('rejects invalid login credentials', async () => {
    await request(app).post('/api/auth/register').send({
      name: 'Nope User',
      email: 'nope@example.com',
      password: 'validpass'
    });

    const response = await request(app).post('/api/auth/login').send({
      email: 'nope@example.com',
      password: 'wrongpass'
    });

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Invalid email or password');
  });
});
