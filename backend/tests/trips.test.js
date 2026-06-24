// HARDENED: Integration Tests
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { resetDb, db } = require('./setup');
const app = require('../server');

describe('Trips API Integration', () => {
  let driverId, driverToken;
  let otherDriverId, otherDriverToken;
  let passengerId, passengerToken;

  beforeEach(() => {
    resetDb();

    // Insert test users
    const insertUser = db.prepare(
      'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)'
    );

    const dRes = insertUser.run('Driver Alpha', 'driver@example.com', 'hash', 'driver');
    driverId = dRes.lastInsertRowid;
    driverToken = jwt.sign({ id: driverId, email: 'driver@example.com', role: 'driver' }, process.env.JWT_SECRET);

    const odRes = insertUser.run('Driver Beta', 'driver2@example.com', 'hash', 'driver');
    otherDriverId = odRes.lastInsertRowid;
    otherDriverToken = jwt.sign({ id: otherDriverId, email: 'driver2@example.com', role: 'driver' }, process.env.JWT_SECRET);

    const pRes = insertUser.run('Passenger Jane', 'passenger@example.com', 'hash', 'passenger');
    passengerId = pRes.lastInsertRowid;
    passengerToken = jwt.sign({ id: passengerId, email: 'passenger@example.com', role: 'passenger' }, process.env.JWT_SECRET);
  });

  it('POST /api/trips -> 201 with valid driver token', async () => {
    const response = await request(app)
      .post('/api/trips')
      .set('Authorization', `Bearer ${driverToken}`)
      .send({
        origin: 'Tunis',
        destination: 'Sousse',
        departure_time: '2026-07-01T12:00:00',
        available_seats: 4,
        price: 15.0
      });

    expect(response.status).toBe(201);
    expect(response.body.trip).toMatchObject({
      driver_id: driverId,
      origin: 'Tunis',
      destination: 'Sousse',
      available_seats: 4,
      price: 15.0,
      status: 'active'
    });
  });

  it('POST /api/trips -> 403 with passenger token (role guard)', async () => {
    const response = await request(app)
      .post('/api/trips')
      .set('Authorization', `Bearer ${passengerToken}`)
      .send({
        origin: 'Tunis',
        destination: 'Sousse',
        departure_time: '2026-07-01T12:00:00',
        available_seats: 4,
        price: 15.0
      });

    expect(response.status).toBe(403);
  });

  it('GET /api/trips -> 200 returns array', async () => {
    // Insert a trip first
    db.prepare(
      "INSERT INTO trips (driver_id, origin, destination, departure_time, available_seats, price, status) VALUES (?, 'Tunis', 'Sfax', '2026-07-01T12:00:00', 4, 20.0, 'active')"
    ).run(driverId);

    const response = await request(app).get('/api/trips');
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.trips)).toBe(true);
    expect(response.body.trips.length).toBe(1);
    expect(response.body.trips[0].origin).toBe('Tunis');
  });

  it('PUT /api/trips/:id -> 200 owner can update', async () => {
    const tripRes = db.prepare(
      "INSERT INTO trips (driver_id, origin, destination, departure_time, available_seats, price, status) VALUES (?, 'Tunis', 'Sfax', '2026-07-01T12:00:00', 4, 20.0, 'active')"
    ).run(driverId);
    const tripId = tripRes.lastInsertRowid;

    const response = await request(app)
      .put(`/api/trips/${tripId}`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({
        price: 25.0,
        available_seats: 3
      });

    expect(response.status).toBe(200);
    expect(response.body.trip.price).toBe(25.0);
    expect(response.body.trip.available_seats).toBe(3);
  });

  it('PUT /api/trips/:id -> 403 non-owner cannot update', async () => {
    const tripRes = db.prepare(
      "INSERT INTO trips (driver_id, origin, destination, departure_time, available_seats, price, status) VALUES (?, 'Tunis', 'Sfax', '2026-07-01T12:00:00', 4, 20.0, 'active')"
    ).run(driverId);
    const tripId = tripRes.lastInsertRowid;

    const response = await request(app)
      .put(`/api/trips/${tripId}`)
      .set('Authorization', `Bearer ${otherDriverToken}`)
      .send({
        price: 25.0
      });

    expect(response.status).toBe(403);
  });

  it('DELETE /api/trips/:id -> 403 passenger cannot delete', async () => {
    const tripRes = db.prepare(
      "INSERT INTO trips (driver_id, origin, destination, departure_time, available_seats, price, status) VALUES (?, 'Tunis', 'Sfax', '2026-07-01T12:00:00', 4, 20.0, 'active')"
    ).run(driverId);
    const tripId = tripRes.lastInsertRowid;

    const response = await request(app)
      .delete(`/api/trips/${tripId}`)
      .set('Authorization', `Bearer ${passengerToken}`);

    expect(response.status).toBe(403);
  });
});
