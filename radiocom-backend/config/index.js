/**
 * config/index.js
 * ------------------------------------------------------------
 * Single source of truth for all environment-driven config.
 * ------------------------------------------------------------
 */

'use strict';

require('dotenv').config();

module.exports = {
  port: parseInt(process.env.PORT, 10) || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',
  isDev: (process.env.NODE_ENV || 'development') === 'development',

  // CORS — split comma-separated string into array
  allowedOrigins: (process.env.ALLOWED_ORIGINS || 'http://localhost:5500,null')
    .split(',')
    .map(o => o.trim()),

  db: {
    path: process.env.DB_PATH || './db/radiocom.sqlite',
    url: process.env.DATABASE_URL || null,
  },
  

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000, // 15 min
    max:      parseInt(process.env.RATE_LIMIT_MAX, 10) || 100,
  },

  email: {
    logBody: process.env.LOG_EMAIL_BODY !== 'false',
  },
};
