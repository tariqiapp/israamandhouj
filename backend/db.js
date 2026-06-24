require('dotenv').config();

const Database = require('better-sqlite3');

const db = new Database(process.env.DB_PATH);

db.pragma('foreign_keys = ON');

// FIXED: schema migration — drop stale tables before recreating
db.exec(`
  DROP TABLE IF EXISTS bookings;
  DROP TABLE IF EXISTS driver_applications;
  DROP TABLE IF EXISTS trips;
`);

db.exec(`
	CREATE TABLE IF NOT EXISTS users (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT NOT NULL,
		phone TEXT,
		email TEXT UNIQUE NOT NULL,
		password_hash TEXT NOT NULL,
		role TEXT NOT NULL DEFAULT 'passenger',
		created_at TEXT NOT NULL DEFAULT (datetime('now'))
	);

	-- FIXED: Trips Table Schema update
	CREATE TABLE IF NOT EXISTS trips (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		driver_id INTEGER NOT NULL REFERENCES users(id),
		origin TEXT NOT NULL,
		destination TEXT NOT NULL,
		departure_time TEXT NOT NULL,
		available_seats INTEGER NOT NULL,
		price REAL NOT NULL,
		status TEXT NOT NULL DEFAULT 'active',
		created_at TEXT NOT NULL DEFAULT (datetime('now'))
	);

	-- FIXED: Bookings Table Schema update (use user_id)
	CREATE TABLE IF NOT EXISTS bookings (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		trip_id INTEGER NOT NULL REFERENCES trips(id),
		user_id INTEGER NOT NULL REFERENCES users(id),
		seats_booked INTEGER NOT NULL DEFAULT 1,
		status TEXT NOT NULL DEFAULT 'confirmed',
		created_at TEXT NOT NULL DEFAULT (datetime('now'))
	);

	CREATE TABLE IF NOT EXISTS driver_applications (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		user_id INTEGER NOT NULL REFERENCES users(id),
		license_number TEXT NOT NULL,
		vehicle_info TEXT NOT NULL,
		status TEXT NOT NULL DEFAULT 'pending',
		created_at TEXT NOT NULL DEFAULT (datetime('now'))
	);
`);

// HARDENED: Foreign Key Enforcement & Indexes
db.exec(`
  PRAGMA foreign_keys = ON;
  CREATE INDEX IF NOT EXISTS idx_trips_driver_id     ON trips(driver_id);
  CREATE INDEX IF NOT EXISTS idx_bookings_trip_id    ON bookings(trip_id);
  CREATE INDEX IF NOT EXISTS idx_bookings_user_id    ON bookings(user_id);
  CREATE INDEX IF NOT EXISTS idx_driver_apps_user_id ON driver_applications(user_id);
`);

console.log('Database initialized');

module.exports = db;

