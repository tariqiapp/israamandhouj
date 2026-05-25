const express = require('express');

const db = require('../db');
const { authenticateToken } = require('../middleware/authenticateToken');
const { validate, bookingSchema } = require('../validate');

const router = express.Router();

router.post('/', authenticateToken, validate(bookingSchema), (req, res) => {
	try {
		const { trip_id } = req.body || {};

		if (!trip_id) {
			return res.status(400).json({ error: 'trip_id is required' });
		}

		const trip = db.prepare('SELECT * FROM trips WHERE id = ?').get(trip_id);
		if (!trip) {
			return res.status(404).json({ error: 'Trip not found' });
		}

		if (trip.status !== 'active') {
			return res.status(400).json({ error: 'Trip is not available for booking' });
		}

		if (trip.available_seats <= 0) {
			return res.status(400).json({ error: 'No seats available' });
		}

		const existingBooking = db
			.prepare(
				'SELECT id FROM bookings WHERE trip_id = ? AND user_id = ? AND status != "cancelled"'
			)
			.get(trip_id, req.user.id);

		if (existingBooking) {
			return res.status(409).json({ error: 'You have already booked this trip' });
		}

		const bookTrip = db.transaction((targetTripId, userId) => {
			const insert = db.prepare(
				'INSERT INTO bookings (trip_id, user_id, status) VALUES (?, ?, "confirmed")'
			);
			const result = insert.run(targetTripId, userId);

			db.prepare('UPDATE trips SET available_seats = available_seats - 1 WHERE id = ?').run(
				targetTripId
			);

			return result.lastInsertRowid;
		});

		const bookingId = bookTrip(trip_id, req.user.id);
		const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId);

		return res.status(201).json({ booking });
	} catch (error) {
		console.error(error);
		return res.status(500).json({ error: 'Internal server error' });
	}
});

router.get('/my', authenticateToken, (req, res) => {
	try {
		const bookings = db
			.prepare(
				`
					SELECT bookings.*, trips.origin, trips.destination,
								 trips.departure_time, trips.price,
								 trips.status AS trip_status
					FROM bookings
					JOIN trips ON bookings.trip_id = trips.id
					WHERE bookings.user_id = ?
					ORDER BY bookings.created_at DESC
				`
			)
			.all(req.user.id);

		return res.status(200).json({ bookings });
	} catch (error) {
		console.error(error);
		return res.status(500).json({ error: 'Internal server error' });
	}
});

router.delete('/:id', authenticateToken, (req, res) => {
	try {
		const bookingId = Number.parseInt(req.params.id, 10);
		if (!Number.isInteger(bookingId)) {
			return res.status(404).json({ error: 'Booking not found' });
		}

		const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId);
		if (!booking) {
			return res.status(404).json({ error: 'Booking not found' });
		}

		if (booking.user_id !== req.user.id) {
			return res.status(403).json({ error: 'Forbidden: this is not your booking' });
		}

		if (booking.status === 'cancelled') {
			return res.status(400).json({ error: 'Booking is already cancelled' });
		}

		const cancelBooking = db.transaction((targetBookingId, tripId) => {
			db.prepare('UPDATE bookings SET status = "cancelled" WHERE id = ?').run(targetBookingId);
			db.prepare('UPDATE trips SET available_seats = available_seats + 1 WHERE id = ?').run(
				tripId
			);
		});

		cancelBooking(bookingId, booking.trip_id);

		return res.status(200).json({ message: 'Booking cancelled successfully' });
	} catch (error) {
		console.error(error);
		return res.status(500).json({ error: 'Internal server error' });
	}
});

module.exports = router;
