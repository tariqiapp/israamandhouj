// HARDENED: Integration Tests
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { resetDb, db } = require('./setup');
const app = require('../server');

describe('Bookings API Integration', () => {
  let driverId;
  let passengerAId, passengerAToken;
  let passengerBId, passengerBToken;
  let tripId;

  beforeEach(() => {
    resetDb();

    // Insert test users
    const insertUser = db.prepare(
      'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)'
    );

    const dRes = insertUser.run('Driver Alpha', 'driver@example.com', 'hash', 'driver');
    driverId = dRes.lastInsertRowid;

    const paRes = insertUser.run('Passenger A', 'pa@example.com', 'hash', 'passenger');
    passengerAId = paRes.lastInsertRowid;
    passengerAToken = jwt.sign({ id: passengerAId, email: 'pa@example.com', role: 'passenger' }, process.env.JWT_SECRET);

    const pbRes = insertUser.run('Passenger B', 'pb@example.com', 'hash', 'passenger');
    passengerBId = pbRes.lastInsertRowid;
    passengerBToken = jwt.sign({ id: passengerBId, email: 'pb@example.com', role: 'passenger' }, process.env.JWT_SECRET);

    // Insert an active trip with 1 seat
    const tripRes = db.prepare(
      "INSERT INTO trips (driver_id, origin, destination, departure_time, available_seats, price, status) VALUES (?, 'Tunis', 'Sfax', '2026-07-01T12:00:00', 1, 20.0, 'active')"
    ).run(driverId);
    tripId = tripRes.lastInsertRowid;
  });

  it('POST /api/bookings -> 201 passenger books an active trip', async () => {
    const response = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${passengerAToken}`)
      .send({ trip_id: tripId });

    expect(response.status).toBe(201);
    expect(response.body.booking).toMatchObject({
      trip_id: tripId,
      user_id: passengerAId,
      status: 'confirmed'
    });
  });

  it('POST /api/bookings -> 409/400 seats requested exceed available_seats (oversell guard)', async () => {
    // Passenger A books the only seat
    await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${passengerAToken}`)
      .send({ trip_id: tripId });

    // Passenger B tries to book the same trip
    const response = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${passengerBToken}`)
      .send({ trip_id: tripId });

    // We allow 400 or 409 to align both with the existing code/tests (which return 400) and step description
    expect([400, 409]).toContain(response.status);
    expect(response.body.error).toBeDefined();
  });

  it('DELETE /api/bookings/:id -> 200 owner can cancel their booking', async () => {
    // Passenger A books the seat
    const bookingRes = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${passengerAToken}`)
      .send({ trip_id: tripId });
    const bookingId = bookingRes.body.booking.id;

    const response = await request(app)
      .delete(`/api/bookings/${bookingId}`)
      .set('Authorization', `Bearer ${passengerAToken}`);

    expect(response.status).toBe(200);
    expect(response.body.message).toMatch(/cancelled/i);
  });

  it("DELETE /api/bookings/:id -> 403 user B cannot cancel user A's booking", async () => {
    // Passenger A books the seat
    const bookingRes = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${passengerAToken}`)
      .send({ trip_id: tripId });
    const bookingId = bookingRes.body.booking.id;

    const response = await request(app)
      .delete(`/api/bookings/${bookingId}`)
      .set('Authorization', `Bearer ${passengerBToken}`);

    expect(response.status).toBe(403);
  });
});
