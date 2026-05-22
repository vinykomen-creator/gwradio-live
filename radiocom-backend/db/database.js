'use strict';

require('dotenv').config();
const path     = require('path');
const fs       = require('fs');
const Database = require('better-sqlite3');

const DB_PATH = process.env.DB_PATH || './db/radiocom.sqlite';
const dir     = path.dirname(DB_PATH);

if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

// If the DB file doesn't exist yet, run init automatically
if (!fs.existsSync(DB_PATH)) {
  console.log('⚙️  No database found — running auto-initialisation...');
  require('./init');
}

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

module.exports = db;
