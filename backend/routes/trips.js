const express = require('express');

const db = require('../db');
const { requireRole } = require('../middleware/authenticateToken');
const { validate, createTripSchema, updateTripSchema } = require('../validate');

const router = express.Router();

router.get('/', (req, res) => {
	try {
		const { origin, destination, date, page, limit } = req.query || {};
		const pageNumber = Number.parseInt(page, 10);
		const limitNumber = Number.parseInt(limit, 10);
		const pageValue = Number.isInteger(pageNumber) && pageNumber > 0 ? pageNumber : 1;
		const limitValue =
			Number.isInteger(limitNumber) && limitNumber > 0 ? Math.min(limitNumber, 50) : 10;
		const offset = (pageValue - 1) * limitValue;

		const conditions = ["trips.status = 'active'"];
		const params = [];

		if (origin) {
			conditions.push('LOWER(trips.origin) LIKE ?');
			params.push(`%${String(origin).toLowerCase()}%`);
		}

		if (destination) {
			conditions.push('LOWER(trips.destination) LIKE ?');
			params.push(`%${String(destination).toLowerCase()}%`);
		}

		if (date) {
			conditions.push('date(trips.departure_time) = ?');
			params.push(date);
		}

		const countSql = `
			SELECT COUNT(*) as total
			FROM trips
			WHERE ${conditions.join(' AND ')}
		`;

		const total = db.prepare(countSql).get(...params).total;

		const sql = `
			SELECT trips.*, users.name AS driver_name
			FROM trips
			JOIN users ON trips.driver_id = users.id
			WHERE ${conditions.join(' AND ')}
			LIMIT ? OFFSET ?
		`;

		const trips = db.prepare(sql).all(...params, limitValue, offset);
		const totalPages = total === 0 ? 0 : Math.ceil(total / limitValue);

		return res.status(200).json({
			trips,
			pagination: {
				page: pageValue,
				limit: limitValue,
				total,
				totalPages
			}
		});
	} catch (error) {
		console.error(error);
		return res.status(500).json({ error: 'Internal server error' });
	}
});

router.get('/:id', (req, res) => {
	try {
		const tripId = Number.parseInt(req.params.id, 10);
		if (!Number.isInteger(tripId)) {
			return res.status(404).json({ error: 'Trip not found' });
		}

		const trip = db
			.prepare(
				`
					SELECT trips.*, users.name AS driver_name
					FROM trips
					JOIN users ON trips.driver_id = users.id
					WHERE trips.id = ?
				`
			)
			.get(tripId);

		if (!trip) {
			return res.status(404).json({ error: 'Trip not found' });
		}

		return res.status(200).json({ trip });
	} catch (error) {
		console.error(error);
		return res.status(500).json({ error: 'Internal server error' });
	}
});

router.post('/', ...requireRole('driver'), validate(createTripSchema), (req, res) => {
	try {
		const { origin, destination, departure_time, available_seats, price } = req.body || {};

		if (!origin || !destination || !departure_time || available_seats == null || price == null) {
			return res.status(400).json({ error: 'All fields are required' });
		}

		const seatsValue = Number(available_seats);
		const priceValue = Number(price);
		const seatsValid = Number.isInteger(seatsValue) && seatsValue > 0;
		const priceValid = Number.isFinite(priceValue) && priceValue > 0;

		if (!seatsValid || !priceValid) {
			return res
				.status(400)
				.json({ error: 'available_seats must be a positive integer and price must be a positive number' });
		}

		const insert = db.prepare(
			`
				INSERT INTO trips (driver_id, origin, destination, departure_time, available_seats, price, status)
				VALUES (?, ?, ?, ?, ?, ?, 'active')
			`
		);

		const result = insert.run(
			req.user.id,
			origin,
			destination,
			departure_time,
			seatsValue,
			priceValue
		);

		const trip = db
			.prepare(
				`
					SELECT id, driver_id, origin, destination, departure_time, available_seats, price, status, created_at
					FROM trips
					WHERE id = ?
				`
			)
			.get(result.lastInsertRowid);

		return res.status(201).json({ trip });
	} catch (error) {
		console.error(error);
		return res.status(500).json({ error: 'Internal server error' });
	}
});

router.put('/:id', ...requireRole('driver'), validate(updateTripSchema), (req, res) => {
	try {
		const tripId = Number.parseInt(req.params.id, 10);
		if (!Number.isInteger(tripId)) {
			return res.status(404).json({ error: 'Trip not found' });
		}

		const trip = db.prepare('SELECT * FROM trips WHERE id = ?').get(tripId);
		if (!trip) {
			return res.status(404).json({ error: 'Trip not found' });
		}

		if (trip.driver_id !== req.user.id) {
			return res.status(403).json({ error: 'Forbidden: you do not own this trip' });
		}

		const updates = [];
		const params = [];

		if (Object.prototype.hasOwnProperty.call(req.body || {}, 'departure_time')) {
			updates.push('departure_time = ?');
			params.push(req.body.departure_time);
		}

		if (Object.prototype.hasOwnProperty.call(req.body || {}, 'available_seats')) {
			const seatsValue = Number(req.body.available_seats);
			const seatsValid = Number.isInteger(seatsValue) && seatsValue > 0;
			if (!seatsValid) {
				return res
					.status(400)
					.json({ error: 'available_seats must be a positive integer and price must be a positive number' });
			}

			updates.push('available_seats = ?');
			params.push(seatsValue);
		}

		if (Object.prototype.hasOwnProperty.call(req.body || {}, 'price')) {
			const priceValue = Number(req.body.price);
			const priceValid = Number.isFinite(priceValue) && priceValue > 0;
			if (!priceValid) {
				return res
					.status(400)
					.json({ error: 'available_seats must be a positive integer and price must be a positive number' });
			}

			updates.push('price = ?');
			params.push(priceValue);
		}

		if (Object.prototype.hasOwnProperty.call(req.body || {}, 'status')) {
			updates.push('status = ?');
			params.push(req.body.status);
		}

		if (updates.length === 0) {
			return res.status(400).json({ error: 'No valid fields to update' });
		}

		params.push(tripId);
		db.prepare(`UPDATE trips SET ${updates.join(', ')} WHERE id = ?`).run(...params);

		const updatedTrip = db.prepare('SELECT * FROM trips WHERE id = ?').get(tripId);
		return res.status(200).json({ trip: updatedTrip });
	} catch (error) {
		console.error(error);
		return res.status(500).json({ error: 'Internal server error' });
	}
});

router.delete('/:id', ...requireRole('driver'), (req, res) => {
	try {
		const tripId = Number.parseInt(req.params.id, 10);
		if (!Number.isInteger(tripId)) {
			return res.status(404).json({ error: 'Trip not found' });
		}

		const trip = db.prepare('SELECT * FROM trips WHERE id = ?').get(tripId);
		if (!trip) {
			return res.status(404).json({ error: 'Trip not found' });
		}

		if (trip.driver_id !== req.user.id) {
			return res.status(403).json({ error: 'Forbidden: you do not own this trip' });
		}

		db.prepare("UPDATE trips SET status = 'cancelled' WHERE id = ?").run(tripId);

		return res.status(200).json({ message: 'Trip cancelled successfully' });
	} catch (error) {
		console.error(error);
		return res.status(500).json({ error: 'Internal server error' });
	}
});

module.exports = router;
