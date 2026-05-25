const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');

const db = require('../db');
const { authenticateToken } = require('../middleware/authenticateToken');
const { validate, registerSchema, loginSchema } = require('../validate');

const router = express.Router();
const SALT_ROUNDS = 10;
const TOKEN_EXPIRES_IN = '7d';

const authLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	max: 10,
	message: { error: 'Too many requests, please try again later.' }
});

const userTableInfo = db.prepare('PRAGMA table_info(users)').all();
const passwordColumn = userTableInfo.some((col) => col.name === 'password_hash')
	? 'password_hash'
	: 'password';

router.post('/register', authLimiter, validate(registerSchema), (req, res) => {
	try {
		const { name, email, password } = req.body || {};

		if (!name || !email || !password) {
			return res.status(400).json({ error: 'name, email and password are required' });
		}

		const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
		if (existingUser) {
			return res.status(409).json({ error: 'Email already in use' });
		}

		const passwordHash = bcrypt.hashSync(password, SALT_ROUNDS);
		const insert = db.prepare(
			`INSERT INTO users (name, email, ${passwordColumn}, role) VALUES (?, ?, ?, ?)`
		);
		const result = insert.run(name, email, passwordHash, 'passenger');

		const payload = { id: result.lastInsertRowid, email, role: 'passenger' };
		const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: TOKEN_EXPIRES_IN });

		return res.status(201).json({
			token,
			user: {
				id: result.lastInsertRowid,
				name,
				email,
				role: 'passenger'
			}
		});
	} catch (error) {
		console.error(error);
		return res.status(500).json({ error: 'Internal server error' });
	}
});

router.post('/login', authLimiter, validate(loginSchema), (req, res) => {
	try {
		const { email, password } = req.body || {};

		if (!email || !password) {
			return res.status(400).json({ error: 'email and password are required' });
		}

		const user = db
			.prepare(
				`SELECT id, name, email, role, ${passwordColumn} AS password FROM users WHERE email = ?`
			)
			.get(email);

		if (!user) {
			return res.status(401).json({ error: 'Invalid email or password' });
		}

		const passwordMatches = bcrypt.compareSync(password, user.password);
		if (!passwordMatches) {
			return res.status(401).json({ error: 'Invalid email or password' });
		}

		const payload = { id: user.id, email: user.email, role: user.role };
		const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: TOKEN_EXPIRES_IN });

		return res.status(200).json({
			token,
			user: {
				id: user.id,
				name: user.name,
				email: user.email,
				role: user.role
			}
		});
	} catch (error) {
		console.error(error);
		return res.status(500).json({ error: 'Internal server error' });
	}
});

router.get('/me', authenticateToken, (req, res) => {
	try {
		const user = db
			.prepare('SELECT id, name, email, role, created_at FROM users WHERE id = ?')
			.get(req.user.id);

		if (!user) {
			return res.status(404).json({ error: 'User not found' });
		}

		return res.status(200).json({ user });
	} catch (error) {
		console.error(error);
		return res.status(500).json({ error: 'Internal server error' });
	}
});

module.exports = router;
