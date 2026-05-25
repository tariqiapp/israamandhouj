process.env.DB_PATH = ':memory:';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.NODE_ENV = 'test';

const db = require('../db');

function resetDb() {
    db.exec('DELETE FROM users;');
}

module.exports = { db, resetDb };
