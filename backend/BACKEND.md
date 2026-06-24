> ⚠️ LIVING DOCUMENT — update this file immediately after every backend change.
> When modifying any route, schema, table, or middleware: edit the relevant
> section of this file in the same commit. Do not let it go stale.

Stack — runtime, framework, DB, key packages and versions
- Runtime: Node.js (CommonJS)
- Framework: Express 5.2.1
- Database: SQLite (better-sqlite3 12.8.0)
- Key packages:
  - bcrypt 6.0.0
  - cors 2.8.6
  - dotenv 17.4.1
  - express-rate-limit 8.5.2
  - jsonwebtoken 9.0.3
  - morgan 1.10.1
  - zod 4.4.3

File map — one line per file: path + what it does
- backend/server.js — Express app setup, middleware, route mounts, health, 404/500 handlers
- backend/db.js — SQLite connection and schema initialization
- backend/middleware/authenticateToken.js — JWT auth middleware and role guard
- backend/routes/auth.js — Auth endpoints (register, login, me)
- backend/routes/trips.js — Trip list and CRUD endpoints
- backend/routes/bookings.js — Booking create/list/cancel endpoints
- backend/routes/drivers.js — Driver application workflow (apply, list, review)
- backend/validate.js — Zod schemas and request body validation middleware
- backend/package.json — Backend scripts and dependencies
- backend/.env — Backend environment config (PORT, JWT_SECRET, DB_PATH)

Database schema — all 4 tables, columns, types, constraints
- users
  - id INTEGER PRIMARY KEY AUTOINCREMENT
  - name TEXT NOT NULL
  - phone TEXT
  - email TEXT UNIQUE NOT NULL
  - password_hash TEXT NOT NULL
  - role TEXT NOT NULL DEFAULT 'passenger'
  - created_at TEXT NOT NULL DEFAULT (datetime('now'))
- trips
  - id INTEGER PRIMARY KEY AUTOINCREMENT
  - driver_id INTEGER NOT NULL REFERENCES users(id)
  - departure TEXT NOT NULL
  - destination TEXT NOT NULL
  - date TEXT NOT NULL
  - time TEXT NOT NULL
  - seats INTEGER NOT NULL
  - price REAL NOT NULL
  - created_at TEXT NOT NULL DEFAULT (datetime('now'))
- bookings
  - id INTEGER PRIMARY KEY AUTOINCREMENT
  - trip_id INTEGER NOT NULL REFERENCES trips(id)
  - passenger_id INTEGER NOT NULL REFERENCES users(id)
  - seats_booked INTEGER NOT NULL DEFAULT 1
  - status TEXT NOT NULL DEFAULT 'confirmed'
  - created_at TEXT NOT NULL DEFAULT (datetime('now'))
- driver_applications
  - id INTEGER PRIMARY KEY AUTOINCREMENT
  - name TEXT NOT NULL
  - phone TEXT NOT NULL
  - city TEXT NOT NULL
  - car_model TEXT NOT NULL
  - message TEXT
  - status TEXT NOT NULL DEFAULT 'pending'
  - created_at TEXT NOT NULL DEFAULT (datetime('now'))

API reference — every endpoint: method, path, auth required, request body/params, success response shape, known error responses
- GET /api/health
  - Auth: No
  - Success 200: { status, message, timestamp }

- POST /api/auth/register
  - Auth: No
  - Body: { name: string, email: string, password: string }
  - Success 201: { token: string, user: { id, name, email, role } }
  - Errors: 400 (missing fields), 409 (email in use), 500
- POST /api/auth/login
  - Auth: No
  - Body: { email: string, password: string }
  - Success 200: { token: string, user: { id, name, email, role } }
  - Errors: 400 (missing fields), 401 (invalid credentials), 500
- GET /api/auth/me
  - Auth: Bearer token
  - Success 200: { user: { id, name, email, role, created_at } }
  - Errors: 401 (invalid token), 404 (user not found), 500

- GET /api/trips
  - Auth: No
  - Query: origin, destination, date (YYYY-MM-DD), page, limit
  - Success 200: { trips: [ ... ], pagination: { page, limit, total, totalPages } }
  - Errors: 500
- GET /api/trips/:id
  - Auth: No
  - Params: id (integer)
  - Success 200: { trip }
  - Errors: 404 (not found), 500
- POST /api/trips
  - Auth: Bearer token, role = driver
  - Body: { origin, destination, departure_time, available_seats, price }
  - Success 201: { trip }
  - Errors: 400 (validation), 401 (missing/invalid token), 403 (wrong role), 500
- PUT /api/trips/:id
  - Auth: Bearer token, role = driver
  - Body (optional): { departure_time?, available_seats?, price?, status? }
  - Success 200: { trip }
  - Errors: 400 (invalid update), 401, 403, 404, 500
- DELETE /api/trips/:id
  - Auth: Bearer token, role = driver
  - Success 200: { message }
  - Errors: 401, 403, 404, 500

- POST /api/bookings
  - Auth: Bearer token
  - Body: { trip_id }
  - Success 201: { booking }
  - Errors: 400 (missing/invalid), 401, 404, 409, 500
- GET /api/bookings/my
  - Auth: Bearer token
  - Success 200: { bookings: [ ... ] }
  - Errors: 401, 500
- DELETE /api/bookings/:id
  - Auth: Bearer token
  - Params: id (integer)
  - Success 200: { message }
  - Errors: 400 (already cancelled), 401, 403, 404, 500

- POST /api/drivers/apply
  - Auth: Bearer token
  - Body: { license_number, vehicle_info }
  - Success 201: { application }
  - Errors: 400 (missing), 401, 409, 500
- GET /api/drivers/applications
  - Auth: Bearer token, role = admin
  - Query: status, page, limit
  - Success 200: { applications: [ ... ], pagination: { page, limit, total, totalPages } }
  - Errors: 401, 403, 500
- PATCH /api/drivers/applications/:id
  - Auth: Bearer token, role = admin
  - Body: { status: 'approved' | 'rejected' }
  - Success 200: { message, application }
  - Errors: 400 (invalid status), 401, 403, 404, 500

Middleware — authenticateToken and requireRole: what they check, what they attach to req, what they reject
- authenticateToken
  - Checks: Authorization header with Bearer token, verifies JWT with JWT_SECRET
  - Attaches: req.user (decoded JWT payload)
  - Rejects: 401 Token manquant, 401 Token invalide
- requireRole(...roles)
  - Checks: authenticateToken then req.user.role is in allowed roles
  - Attaches: req.user (from authenticateToken)
  - Rejects: 401 if missing/invalid token, 403 if role not allowed

Validation — every Zod schema: name + fields + rules
- registerSchema
  - name: string, min 1
  - email: string, valid email
  - password: string, min 6
- loginSchema
  - email: string, valid email
  - password: string, min 1
- createTripSchema
  - origin: string, min 1
  - destination: string, min 1
  - departure_time: string, min 1
  - available_seats: number (coerced), int, positive
  - price: number (coerced), positive
- updateTripSchema
  - departure_time?: string, min 1
  - available_seats?: number (coerced), int, positive
  - price?: number (coerced), positive
  - status?: 'active' | 'cancelled'
- bookingSchema
  - trip_id: number (coerced), int, positive
- applyDriverSchema
  - license_number: string, min 1
  - vehicle_info: string, min 1
- reviewApplicationSchema
  - status: 'approved' | 'rejected'

Rate limiting — which routes, limits, response
- /api/auth/register, /api/auth/login
  - Window: 15 minutes
  - Max: 10 requests
  - Response: { error: 'Too many requests, please try again later.' }

Pagination — which endpoints, params, response envelope shape
- GET /api/trips
  - Params: page, limit
  - Response: { trips, pagination: { page, limit, total, totalPages } }
- GET /api/drivers/applications
  - Params: status, page, limit
  - Response: { applications, pagination: { page, limit, total, totalPages } }

Auth flow — register → login → token → protected route, step by step
1) Register: POST /api/auth/register with name/email/password
2) Login: POST /api/auth/login with email/password
3) Receive JWT: response includes token
4) Access protected routes: send Authorization: Bearer <token>

Known issues — any bugs or inconsistencies you spotted while reading
- Schema mismatch: trips table columns in db.js (departure, date, time, seats) do not match API fields used by routes (origin, departure_time, available_seats, status). This can break trip queries and inserts unless the database is migrated.
- Schema mismatch: bookings table uses passenger_id and seats_booked, but routes read/write user_id and status.
- Schema mismatch: driver_applications table uses name/phone/city/car_model/message, but routes use user_id/license_number/vehicle_info/status.
- CORS origin is fixed to http://localhost:5500, which blocks other local dev origins unless updated.
- Server port has no fallback; missing PORT in .env will prevent startup.
