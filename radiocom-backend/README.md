# RadioCom Backend API

Complete Node.js/Express backend for the RadioCom community radio website.
Handles three form endpoints backed by a local SQLite database.

---

## File Structure

```
radiocom-backend/
├── server.js                   ← Entry point — run this
├── package.json
├── .env.example                ← Copy to .env and edit
│
├── config/
│   └── index.js                ← All environment config in one place
│
├── db/
│   ├── init.js                 ← Creates tables (run once)
│   ├── database.js             ← Shared DB connection singleton
│   └── radiocom.sqlite         ← Created automatically on first run
│
├── routes/
│   └── api.js                  ← All route definitions + per-route rate limits
│
├── controllers/
│   ├── signupController.js     ← POST /api/signup
│   ├── contactController.js    ← POST /api/contact
│   └── newsletterController.js ← POST /api/subscribe  POST /api/unsubscribe
│
├── middleware/
│   └── validators.js           ← express-validator rules for all three forms
│
└── utils/
    └── helpers.js              ← sendSuccess, sendError, simulateSendEmail, sanitise*
```

---

## Prerequisites

- **Node.js 18+** — check with `node -v`
- **npm** — comes with Node

Download Node: https://nodejs.org

---

## Quick Start (VS Code)

### 1. Place the backend folder

```
your-project/
├── index.html        ← your frontend
├── styles.css
├── script.js
├── api.js            ← frontend API integration (provided)
└── radiocom-backend/ ← this folder
    ├── server.js
    └── ...
```

### 2. Open a terminal in VS Code

`Terminal → New Terminal`  then `cd radiocom-backend`

### 3. Install dependencies

```bash
npm install
```

This installs: express, better-sqlite3, cors, helmet, dotenv, express-validator,
express-rate-limit, morgan, and nodemon (dev).

### 4. Create your .env file

```bash
cp .env.example .env
```

The defaults work for local development — no edits needed.

### 5. Initialise the database (optional — auto-runs on first start)

```bash
npm run init-db
```

You'll see confirmation that `radiocom.sqlite` was created with all three tables.

### 6. Start the server

```bash
# Development (auto-restarts on file changes):
npm run dev

# Production / plain node:
npm start
```

You should see:

```
🚀  RadioCom API Server
    Environment : development
    Port        : 3001
    Base URL    : https://gwradio-live.onrender.com/api

📡  Endpoints:
    POST  https://gwradio-live.onrender.com/api/signup
    POST  https://gwradio-live.onrender.com/api/contact
    POST  https://gwradio-live.onrender.com/api/subscribe
    POST  https://gwradio-live.onrender.com/api/unsubscribe
    GET   https://gwradio-live.onrender.com/api/health
```

### 7. Open the frontend

Open `index.html` with **VS Code Live Server** (right-click → *Open with Live Server*),
or open it directly in your browser from the file system.

The `api.js` script automatically connects to `https://gwradio-live.onrender.com/api`.

---

## API Endpoints

### `POST /api/signup`

Registers a new community member.

**Request body (JSON):**
```json
{
  "first_name":   "Jane",
  "last_name":    "Doe",
  "email":        "jane@example.com",
  "phone":        "+254 700 000 000",
  "interest":     "Training Programs",
  "about":        "I want to learn radio presenting.",
  "agreed_terms": "1"
}
```

**Success (201):**
```json
{
  "success": true,
  "message": "Welcome to RadioCom, Jane! Your account has been created.",
  "data": {
    "member": {
      "id": 1,
      "first_name": "Jane",
      "last_name": "Doe",
      "email": "jane@example.com",
      "interest": "Training Programs",
      "status": "pending",
      "created_at": "2026-05-20T10:00:00"
    }
  }
}
```

**Duplicate email (409):**
```json
{ "success": false, "message": "This email is already registered and active." }
```

**Validation error (422):**
```json
{
  "success": false,
  "message": "Validation failed. Please check the highlighted fields.",
  "errors": [
    { "field": "email",      "message": "Please enter a valid email address." },
    { "field": "agreed_terms","message": "You must agree to the Terms & Conditions." }
  ]
}
```

---

### `POST /api/contact`

Saves a contact form message and simulates two emails (admin notification + auto-reply).

**Request body (JSON):**
```json
{
  "first_name": "Jane",
  "last_name":  "Doe",
  "email":      "jane@example.com",
  "subject":    "Training Programs",
  "message":    "I'd like to know more about the Audio Production course."
}
```

**Success (201):**
```json
{
  "success": true,
  "message": "Thank you, Jane! Your message has been received. We'll reply within 24 hours.",
  "data": { "message_id": 3 }
}
```

Email output appears in your terminal console.

---

### `POST /api/subscribe`

Subscribes an email to the newsletter. Re-subscribes if previously unsubscribed.

**Request body (JSON):**
```json
{
  "email":  "jane@example.com",
  "source": "footer"
}
```
`source` is optional. Accepted values: `footer` | `home` | `signup_page`

**Success (201):**
```json
{
  "success": true,
  "message": "You're subscribed! Check your inbox for a welcome email from RadioCom."
}
```

**Already subscribed (200):**
```json
{
  "success": true,
  "message": "You're already subscribed! Check your inbox for our latest newsletter."
}
```

---

### `POST /api/unsubscribe`

Marks a subscriber as inactive.

**Request body:** `{ "email": "jane@example.com" }`

---

### `GET /api/health`

Returns server status. Useful for verifying the API is reachable from your frontend.

```json
{ "success": true, "message": "RadioCom API is running.", "version": "1.0.0" }
```

---

### `GET /api/subscribe/check?email=jane@example.com`

Dev utility — check whether an email is subscribed.

---

## Database Schema

All data is stored in `db/radiocom.sqlite`.

### `signups`
| Column        | Type    | Notes                              |
|---------------|---------|------------------------------------|
| id            | INTEGER | Primary key, auto-increment        |
| first_name    | TEXT    | Required                           |
| last_name     | TEXT    | Required                           |
| email         | TEXT    | Required, **UNIQUE**               |
| phone         | TEXT    | Optional                           |
| interest      | TEXT    | Default: General Membership        |
| about         | TEXT    | Optional                           |
| agreed_terms  | INTEGER | 1 = accepted                       |
| status        | TEXT    | pending / active / unsubscribed    |
| ip_address    | TEXT    | Requester IP                       |
| created_at    | TEXT    | ISO datetime, auto-set             |
| updated_at    | TEXT    | ISO datetime, auto-set             |

### `contact_messages`
| Column     | Type    | Notes                         |
|------------|---------|-------------------------------|
| id         | INTEGER | Primary key                   |
| first_name | TEXT    | Required                      |
| last_name  | TEXT    | Required                      |
| email      | TEXT    | Required                      |
| subject    | TEXT    | Default: General Inquiry      |
| message    | TEXT    | Required, 10–3000 chars       |
| status     | TEXT    | unread / read / replied       |
| ip_address | TEXT    |                               |
| created_at | TEXT    | Auto-set                      |

### `newsletter_subscribers`
| Column          | Type    | Notes                      |
|-----------------|---------|----------------------------|
| id              | INTEGER | Primary key                |
| email           | TEXT    | **UNIQUE**                 |
| source          | TEXT    | footer / home / signup_page|
| status          | TEXT    | active / unsubscribed      |
| ip_address      | TEXT    |                            |
| subscribed_at   | TEXT    | Auto-set                   |
| unsubscribed_at | TEXT    | Set on unsubscribe         |

---

## Troubleshooting

**`npm install` fails on better-sqlite3**
Run: `npm install --build-from-source`
Requires Python and a C++ build toolchain. On Windows install
*Windows Build Tools*: `npm install --global windows-build-tools`

**`CORS` errors in browser console**
The server allows all localhost ports by default. Make sure you're serving
the frontend from `localhost` (not from a remote IP) and the backend is
running on port 3001.

**Port 3001 already in use**
Change `PORT=3002` in your `.env` file, then update `API_BASE` in `api.js`.

**Database locked**
Only one `better-sqlite3` connection should be open at a time. Don't run
`init.js` while the server is running.

---

## Moving to Production

1. Replace `simulateSendEmail` in `utils/helpers.js` with a real transporter
   (nodemailer + Gmail OAuth2, Resend, SendGrid, etc.)
2. Set `NODE_ENV=production` and restrict `ALLOWED_ORIGINS` to your domain.
3. Use a process manager like **PM2** (`pm2 start server.js`).
4. Put behind a reverse proxy (nginx) with HTTPS / Let's Encrypt.
5. Consider migrating from SQLite to PostgreSQL for concurrent writes.
