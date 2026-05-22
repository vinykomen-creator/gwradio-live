/**
 * controllers/signupController.js
 * ------------------------------------------------------------
 * Handles POST /api/signup
 * - Checks for duplicate email
 * - Inserts new member record
 * - Returns created member (without sensitive fields)
 * ------------------------------------------------------------
 */

'use strict';

const db = require('../db/database');
const { sendSuccess, sendError, sanitiseString, sanitiseEmail } = require('../utils/helpers');

/**
 * POST /api/signup
 */
function signup(req, res) {
  try {
    const {
      first_name,
      last_name,
      email,
      phone,
      interest,
      about,
      agreed_terms,
    } = req.body;

    // Sanitise
    const cleanEmail     = sanitiseEmail(email);
    const cleanFirstName = sanitiseString(first_name);
    const cleanLastName  = sanitiseString(last_name);
    const cleanPhone     = sanitiseString(phone || '');
    const cleanInterest  = sanitiseString(interest || 'General Membership');
    const cleanAbout     = sanitiseString(about || '');
    const ipAddress      = req.ip || req.connection?.remoteAddress || null;

    // ── Duplicate email check ──────────────────────────────
    const existing = db
      .prepare('SELECT id, status FROM signups WHERE email = ?')
      .get(cleanEmail);

    if (existing) {
      const detail =
        existing.status === 'active'
          ? 'This email is already registered and active.'
          : 'This email is already registered. Please contact us if you need help.';
      return sendError(res, detail, 409);
    }

    // ── Insert ─────────────────────────────────────────────
    const stmt = db.prepare(`
      INSERT INTO signups
        (first_name, last_name, email, phone, interest, about, agreed_terms, status, ip_address)
      VALUES
        (@first_name, @last_name, @email, @phone, @interest, @about, @agreed_terms, 'pending', @ip_address)
    `);

    const result = stmt.run({
      first_name:   cleanFirstName,
      last_name:    cleanLastName,
      email:        cleanEmail,
      phone:        cleanPhone || null,
      interest:     cleanInterest,
      about:        cleanAbout || null,
      agreed_terms: 1,
      ip_address:   ipAddress,
    });

    // ── Fetch the created record for the response ──────────
    const newMember = db
      .prepare('SELECT id, first_name, last_name, email, interest, status, created_at FROM signups WHERE id = ?')
      .get(result.lastInsertRowid);

    // Console log for dev visibility
    console.log(`\n✅ [SIGNUP] New member registered:`);
    console.log(`   Name:  ${cleanFirstName} ${cleanLastName}`);
    console.log(`   Email: ${cleanEmail}`);
    console.log(`   Interest: ${cleanInterest}\n`);

    return sendSuccess(
      res,
      `Welcome to RadioCom, ${cleanFirstName}! Your account has been created.`,
      { member: newMember },
      201
    );

  } catch (err) {
    // SQLite unique constraint fallback (belt-and-suspenders)
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return sendError(res, 'This email address is already registered.', 409);
    }
    console.error('[SIGNUP ERROR]', err);
    return sendError(res, 'Something went wrong. Please try again later.', 500);
  }
}

module.exports = { signup };
