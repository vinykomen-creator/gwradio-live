'use strict';

require('dotenv').config();
const path    = require('path');
const fs      = require('fs');
const Database = require('better-sqlite3');

const DB_PATH = process.env.DB_PATH || './db/radiocom.sqlite';
const dir     = path.dirname(DB_PATH);


if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const db = new Database(DB_PATH, { verbose: console.log });


db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');


db.exec(`
  /* --------------------------------------------------------
     TABLE: signups
     Stores member registration submissions.
  -------------------------------------------------------- */
  CREATE TABLE IF NOT EXISTS signups (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name    TEXT    NOT NULL,
    last_name     TEXT    NOT NULL,
    email         TEXT    NOT NULL UNIQUE,          -- enforces no duplicate signups
    phone         TEXT,
    interest      TEXT    NOT NULL DEFAULT 'General Membership',
    about         TEXT,
    agreed_terms  INTEGER NOT NULL DEFAULT 0,       -- 1 = true
    status        TEXT    NOT NULL DEFAULT 'pending',  -- pending | active | unsubscribed
    ip_address    TEXT,
    created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  /* --------------------------------------------------------
     TABLE: contact_messages
     Stores contact form submissions.
  -------------------------------------------------------- */
  CREATE TABLE IF NOT EXISTS contact_messages (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name  TEXT    NOT NULL,
    last_name   TEXT    NOT NULL,
    email       TEXT    NOT NULL,
    subject     TEXT    NOT NULL DEFAULT 'General Inquiry',
    message     TEXT    NOT NULL,
    status      TEXT    NOT NULL DEFAULT 'unread',  -- unread | read | replied
    ip_address  TEXT,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  /* --------------------------------------------------------
     TABLE: newsletter_subscribers
     Stores newsletter subscription emails.
  -------------------------------------------------------- */
  CREATE TABLE IF NOT EXISTS newsletter_subscribers (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    email         TEXT    NOT NULL UNIQUE,           -- one subscription per email
    source        TEXT    NOT NULL DEFAULT 'footer', -- footer | home | signup_page
    status        TEXT    NOT NULL DEFAULT 'active', -- active | unsubscribed
    ip_address    TEXT,
    subscribed_at TEXT    NOT NULL DEFAULT (datetime('now')),
    unsubscribed_at TEXT
  );

  /* --------------------------------------------------------
     Indexes for common queries
  -------------------------------------------------------- */
  CREATE INDEX IF NOT EXISTS idx_signups_email         ON signups(email);
  CREATE INDEX IF NOT EXISTS idx_signups_status        ON signups(status);
  CREATE INDEX IF NOT EXISTS idx_contact_status        ON contact_messages(status);
  CREATE INDEX IF NOT EXISTS idx_contact_email         ON contact_messages(email);
  CREATE INDEX IF NOT EXISTS idx_newsletter_email      ON newsletter_subscribers(email);
  CREATE INDEX IF NOT EXISTS idx_newsletter_status     ON newsletter_subscribers(status);
`);

console.log('\n✅  Database initialised successfully.');
console.log(`📂  Location: ${path.resolve(DB_PATH)}`);
console.log('📋  Tables created: signups, contact_messages, newsletter_subscribers\n');

db.close();
