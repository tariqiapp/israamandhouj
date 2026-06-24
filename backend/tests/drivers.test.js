// HARDENED: Integration Tests
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { resetDb, db } = require('./setup');
const app = require('../server');

describe('Drivers API Integration', () => {
  let userId, userToken;
  let adminToken;

  beforeEach(() => {
    resetDb();

    // Insert test users
    const insertUser = db.prepare(
      'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)'
    );

    const uRes = insertUser.run('User Alpha', 'user@example.com', 'hash', 'passenger');
    userId = uRes.lastInsertRowid;
    userToken = jwt.sign({ id: userId, email: 'user@example.com', role: 'passenger' }, process.env.JWT_SECRET);

    adminToken = jwt.sign({ id: 999, email: 'admin@example.com', role: 'admin' }, process.env.JWT_SECRET);
  });

  it('POST /api/drivers/apply -> 201 with valid user token', async () => {
    const response = await request(app)
      .post('/api/drivers/apply')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        license_number: 'LIC-12345',
        vehicle_info: 'Grey Renault Clio'
      });

    expect(response.status).toBe(201);
    expect(response.body.application).toMatchObject({
      user_id: userId,
      license_number: 'LIC-12345',
      vehicle_info: 'Grey Renault Clio',
      status: 'pending'
    });
  });

  it('POST /api/drivers/apply -> 409 duplicate application rejected', async () => {
    // Submit first application
    await request(app)
      .post('/api/drivers/apply')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        license_number: 'LIC-12345',
        vehicle_info: 'Grey Renault Clio'
      });

    // Try submitting duplicate application
    const response = await request(app)
      .post('/api/drivers/apply')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        license_number: 'LIC-12345',
        vehicle_info: 'Grey Renault Clio'
      });

    expect(response.status).toBe(409);
  });

  it('GET /api/drivers/applications -> 200 admin token only', async () => {
    const response = await request(app)
      .get('/api/drivers/applications')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.applications)).toBe(true);
  });

  it('GET /api/drivers/applications -> 403 non-admin rejected', async () => {
    const response = await request(app)
      .get('/api/drivers/applications')
      .set('Authorization', `Bearer ${userToken}`);

    expect(response.status).toBe(403);
  });
});
