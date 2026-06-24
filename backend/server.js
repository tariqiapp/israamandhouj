require('dotenv').config();

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

require('./db');

const authRoutes = require('./routes/auth');
const tripsRoutes = require('./routes/trips');
const bookingsRoutes = require('./routes/bookings');
const driversRoutes = require('./routes/drivers');

const app = express();

app.use(helmet()); // HARDENED: HTTP Security Headers

app.use(
	cors({
		origin: 'http://localhost:51319',
		methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
		allowedHeaders: ['Content-Type', 'Authorization']
	})
);

app.use(express.json());

const logFormat = process.env.NODE_ENV === 'production' ? 'combined' : 'dev';
app.use(
	morgan(logFormat, {
		skip: (req) => req.path === '/api/health'
	})
);

// Rate Limiting
const authLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	max: 20,
	message: { error: 'Too many attempts. Try again later.' }
});

const globalLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	max: 200
});

app.use('/api/auth', authLimiter); // HARDENED: Rate Limiting
app.use('/api', globalLimiter);    // HARDENED: Rate Limiting

app.use('/api/auth', authRoutes);
app.use('/api/trips', tripsRoutes);
app.use('/api/bookings', bookingsRoutes);
app.use('/api/drivers', driversRoutes);

app.get('/api/health', (req, res) => {
	res.json({
		status: 'ok',
		message: 'Tariqi API is running',
		timestamp: new Date().toISOString()
	});
});

app.use((req, res) => {
	res.status(404).json({ error: 'Route introuvable' });
});

// Centralized error handler
app.use((err, req, res, next) => {
	console.error(`[${new Date().toISOString()}] ${err.message}`);

	if (err.name === 'UnauthorizedError')        return res.status(401).json({ error: 'Invalid token' });
	if (err.message?.startsWith('CORS blocked')) return res.status(403).json({ error: err.message });
	if (err.code === 'SQLITE_CONSTRAINT')        return res.status(409).json({ error: 'Conflict: resource already exists' });

	res.status(err.status || 500).json({ error: 'Internal server error' });
}); // HARDENED: Global Error Handler

const PORT = process.env.PORT || 3000;

if (require.main === module) {
	app.listen(PORT, () => {
		console.log(`Tariqi API running on port ${PORT}`);
	}); // HARDENED: Port Fallback
}

module.exports = app;

