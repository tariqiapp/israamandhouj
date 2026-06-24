// FIXED: integration tests covering role guard, happy path, and oversell scenarios
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { resetDb, db } = require('./setup');
const app = require('../server');

describe('Tariqi Integration Tests', () => {
	beforeEach(() => {
		resetDb();
	});

	it('should execute full happy path: application -> approval -> trip creation -> booking', async () => {
		// 1. Register candidate and passenger
		const candidateReg = await request(app).post('/api/auth/register').send({
			name: 'Driver Candidate',
			email: 'candidate@example.com',
			password: 'password123'
		});
		expect(candidateReg.status).toBe(201);
		const candidateToken = candidateReg.body.token;
		const candidateId = candidateReg.body.user.id;

		const passengerReg = await request(app).post('/api/auth/register').send({
			name: 'Passenger User',
			email: 'passenger@example.com',
			password: 'password123'
		});
		expect(passengerReg.status).toBe(201);
		const passengerToken = passengerReg.body.token;

		// 2. Candidate applies to become a driver
		const applyRes = await request(app)
			.post('/api/drivers/apply')
			.set('Authorization', `Bearer ${candidateToken}`)
			.send({
				license_number: 'DL-99999',
				vehicle_info: 'Red Peugeot 208'
			});
		expect(applyRes.status).toBe(201);
		const applicationId = applyRes.body.application.id;

		// 3. Admin approves candidate application
		// Create admin token manually using the test secret
		const adminToken = jwt.sign(
			{ id: 999, email: 'admin@example.com', role: 'admin' },
			process.env.JWT_SECRET || 'test-secret'
		);

		const approveRes = await request(app)
			.patch(`/api/drivers/applications/${applicationId}`)
			.set('Authorization', `Bearer ${adminToken}`)
			.send({ status: 'approved' });
		expect(approveRes.status).toBe(200);
		expect(approveRes.body.application.status).toBe('approved');

		// 4. Candidate (now a driver) logs in again or uses updated role (we need to sign a new token because role changed)
		const driverToken = jwt.sign(
			{ id: candidateId, email: 'candidate@example.com', role: 'driver' },
			process.env.JWT_SECRET || 'test-secret'
		);

		// 5. Driver creates a trip
		const tripRes = await request(app)
			.post('/api/trips')
			.set('Authorization', `Bearer ${driverToken}`)
			.send({
				origin: 'Tunis',
				destination: 'Hammamet',
				departure_time: '2026-07-01T08:00:00',
				available_seats: 1,
				price: 12.5
			});
		expect(tripRes.status).toBe(201);
		const tripId = tripRes.body.trip.id;

		// 6. Passenger books the trip
		const bookingRes = await request(app)
			.post('/api/bookings')
			.set('Authorization', `Bearer ${passengerToken}`)
			.send({ trip_id: tripId });
		expect(bookingRes.status).toBe(201);
		expect(bookingRes.body.booking.status).toBe('confirmed');

		// 7. Verify available seats decreased to 0
		const getTripRes = await request(app).get(`/api/trips/${tripId}`);
		expect(getTripRes.status).toBe(200);
		expect(getTripRes.body.trip.available_seats).toBe(0);
	});

	it('should enforce role guards: passenger cannot create trips or approve applications', async () => {
		// Register a passenger
		const passengerReg = await request(app).post('/api/auth/register').send({
			name: 'Only Passenger',
			email: 'only_passenger@example.com',
			password: 'password123'
		});
		const passengerToken = passengerReg.body.token;

		// Try to create a trip as passenger
		const tripRes = await request(app)
			.post('/api/trips')
			.set('Authorization', `Bearer ${passengerToken}`)
			.send({
				origin: 'Tunis',
				destination: 'Hammamet',
				departure_time: '2026-07-01T08:00:00',
				available_seats: 3,
				price: 10
			});
		// FIXED: role guard prevents passengers from creating trips
		expect(tripRes.status).toBe(403);
		expect(tripRes.body.error).toMatch(/Forbidden/i);

		// Try to approve an application as passenger
		const approveRes = await request(app)
			.patch('/api/drivers/applications/1')
			.set('Authorization', `Bearer ${passengerToken}`)
			.send({ status: 'approved' });
		// FIXED: role guard prevents passengers from approving driver applications
		expect(approveRes.status).toBe(403);
	});

	it('should prevent overselling seats when capacity is 0', async () => {
		// Register driver, passenger 1, and passenger 2
		const driverToken = jwt.sign(
			{ id: 101, email: 'driver101@example.com', role: 'driver' },
			process.env.JWT_SECRET || 'test-secret'
		);

		const passenger1Reg = await request(app).post('/api/auth/register').send({
			name: 'Passenger One',
			email: 'p1@example.com',
			password: 'password123'
		});
		const passenger1Token = passenger1Reg.body.token;

		const passenger2Reg = await request(app).post('/api/auth/register').send({
			name: 'Passenger Two',
			email: 'p2@example.com',
			password: 'password123'
		});
		const passenger2Token = passenger2Reg.body.token;

		// Driver creates trip with exactly 1 seat
		// Insert driver to DB first because trips has FK reference to users
		db.prepare(
			"INSERT INTO users (id, name, email, password_hash, role) VALUES (101, 'Driver 101', 'driver101@example.com', 'hash', 'driver')"
		).run();

		const tripRes = await request(app)
			.post('/api/trips')
			.set('Authorization', `Bearer ${driverToken}`)
			.send({
				origin: 'Tunis',
				destination: 'Sousse',
				departure_time: '2026-07-01T10:00:00',
				available_seats: 1,
				price: 15.0
			});
		expect(tripRes.status).toBe(201);
		const tripId = tripRes.body.trip.id;

		// Passenger 1 books the only seat
		const booking1Res = await request(app)
			.post('/api/bookings')
			.set('Authorization', `Bearer ${passenger1Token}`)
			.send({ trip_id: tripId });
		expect(booking1Res.status).toBe(201);

		// Passenger 2 tries to book the same trip
		const booking2Res = await request(app)
			.post('/api/bookings')
			.set('Authorization', `Bearer ${passenger2Token}`)
			.send({ trip_id: tripId });
		// FIXED: booking a trip with 0 available seats should return a 400 error
		expect(booking2Res.status).toBe(400);
		expect(booking2Res.body.error).toMatch(/No seats available/i);
	});
});
