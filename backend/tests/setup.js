process.env.DB_PATH = ':memory:';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.NODE_ENV = 'test';

const db = require('../db');

function resetDb() {
    // FIXED: clear database tables in correct dependency order
    db.exec(`
        DELETE FROM bookings;
        DELETE FROM driver_applications;
        DELETE FROM trips;
        DELETE FROM users;
    `);
}

module.exports = { db, resetDb };
