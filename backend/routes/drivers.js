const express = require('express');

const db = require('../db');
const { authenticateToken, requireRole } = require('../middleware/authenticateToken');
const { validate, applyDriverSchema, reviewApplicationSchema } = require('../validate');

const router = express.Router();

router.post('/apply', authenticateToken, validate(applyDriverSchema), (req, res) => {
	try {
		const { license_number, vehicle_info } = req.body || {};

		if (!license_number || !vehicle_info) {
			return res.status(400).json({ error: 'license_number and vehicle_info are required' });
		}

		const existingApplication = db
			.prepare(
				"SELECT id FROM driver_applications WHERE user_id = ? AND status IN ('pending', 'approved')"
			)
			.get(req.user.id);

		if (existingApplication) {
			return res
				.status(409)
				.json({ error: 'You already have a pending or approved application' });
		}

		const insert = db.prepare(
			`
				INSERT INTO driver_applications (user_id, license_number, vehicle_info, status)
				VALUES (?, ?, ?, 'pending')
			`
		);

		const result = insert.run(req.user.id, license_number, vehicle_info);
		const application = db
			.prepare('SELECT * FROM driver_applications WHERE id = ?')
			.get(result.lastInsertRowid);

		return res.status(201).json({ application });
	} catch (error) {
		console.error(error);
		return res.status(500).json({ error: 'Internal server error' });
	}
});

router.get('/applications', ...requireRole('admin'), (req, res) => {
	try {
		const { status, page, limit } = req.query || {};
		const pageNumber = Number.parseInt(page, 10);
		const limitNumber = Number.parseInt(limit, 10);
		const pageValue = Number.isInteger(pageNumber) && pageNumber > 0 ? pageNumber : 1;
		const limitValue =
			Number.isInteger(limitNumber) && limitNumber > 0 ? Math.min(limitNumber, 50) : 10;
		const offset = (pageValue - 1) * limitValue;
		const params = [];
		let whereClause = '';

		if (status) {
			whereClause = 'WHERE da.status = ?';
			params.push(status);
		}

		const countSql = `
			SELECT COUNT(*) as total
			FROM driver_applications da
			${whereClause}
		`;

		const total = db.prepare(countSql).get(...params).total;

		const sql = `
			SELECT da.*, u.name AS applicant_name, u.email AS applicant_email
			FROM driver_applications da
			JOIN users u ON da.user_id = u.id
			${whereClause}
			ORDER BY da.created_at DESC
			LIMIT ? OFFSET ?
		`;

		const applications = db.prepare(sql).all(...params, limitValue, offset);
		const totalPages = total === 0 ? 0 : Math.ceil(total / limitValue);
		return res.status(200).json({
			applications,
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

router.patch(
	'/applications/:id',
	...requireRole('admin'),
	validate(reviewApplicationSchema),
	(req, res) => {
	try {
		const { status } = req.body || {};
		if (status !== 'approved' && status !== 'rejected') {
			return res.status(400).json({ error: "status must be 'approved' or 'rejected'" });
		}

		const applicationId = Number.parseInt(req.params.id, 10);
		if (!Number.isInteger(applicationId)) {
			return res.status(404).json({ error: 'Application not found' });
		}

		const application = db
			.prepare('SELECT id, user_id, status FROM driver_applications WHERE id = ?')
			.get(applicationId);

		if (!application) {
			return res.status(404).json({ error: 'Application not found' });
		}

		if (status === 'approved') {
			const approve = db.transaction((appId, userId) => {
				db.prepare("UPDATE driver_applications SET status = 'approved' WHERE id = ?").run(appId);
				db.prepare("UPDATE users SET role = 'driver' WHERE id = ?").run(userId);
			});
			approve(application.id, application.user_id);

			return res.status(200).json({
				message: 'Application approved',
				application: {
					id: application.id,
					user_id: application.user_id,
					status: 'approved'
				}
			});
		}

		db.prepare("UPDATE driver_applications SET status = 'rejected' WHERE id = ?").run(
			application.id
		);

		return res.status(200).json({
			message: 'Application rejected',
			application: {
				id: application.id,
				user_id: application.user_id,
				status: 'rejected'
			}
		});
	} catch (error) {
		console.error(error);
		return res.status(500).json({ error: 'Internal server error' });
	}
	}
);

module.exports = router;
