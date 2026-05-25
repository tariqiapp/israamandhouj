require('dotenv').config();

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

require('./db');

const authRoutes = require('./routes/auth');
const tripsRoutes = require('./routes/trips');
const bookingsRoutes = require('./routes/bookings');
const driversRoutes = require('./routes/drivers');

const app = express();

app.use(
	cors({
		origin: 'http://localhost:5500'
	})
);
app.use(express.json());

const logFormat = process.env.NODE_ENV === 'production' ? 'combined' : 'dev';
app.use(
	morgan(logFormat, {
		skip: (req) => req.path === '/api/health'
	})
);

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

app.use((err, req, res, next) => {
	console.error(err.stack);
	res.status(500).json({ error: 'Erreur serveur interne' });
});

const PORT = process.env.PORT;

if (require.main === module) {
	app.listen(PORT, () => {
		console.log(`Tariqi API running on port ${PORT}`);
	});
}

module.exports = app;
