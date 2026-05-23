'use strict';

const pool = require('../db/postgres');
const { sendSuccess, sendError, sanitiseString, sanitiseEmail } = require('../utils/helpers');

async function signup(req, res) {
  try {
    const { first_name, last_name, email, phone, interest, about } = req.body;

    const cleanEmail     = sanitiseEmail(email);
    const cleanFirstName = sanitiseString(first_name);
    const cleanLastName  = sanitiseString(last_name);
    const cleanPhone     = sanitiseString(phone || '');
    const cleanInterest  = sanitiseString(interest || 'General Membership');
    const cleanAbout     = sanitiseString(about || '');
    const ipAddress      = req.ip || req.connection?.remoteAddress || null;

    // Duplicate check
    const { rows: existing } = await pool.query(
      'SELECT id, status FROM signups WHERE email = $1',
      [cleanEmail]
    );

    if (existing.length > 0) {
      const detail = existing[0].status === 'active'
        ? 'This email is already registered and active.'
        : 'This email is already registered. Please contact us if you need help.';
      return sendError(res, detail, 409);
    }

    // Insert
    const { rows } = await pool.query(
      `INSERT INTO signups
         (first_name, last_name, email, phone, interest, about, agreed_terms, status, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, true, 'pending', $7)
       RETURNING id, first_name, last_name, email, interest, status, created_at`,
      [cleanFirstName, cleanLastName, cleanEmail, cleanPhone || null, cleanInterest, cleanAbout || null, ipAddress]
    );

    const newMember = rows[0];

    console.log(`\n✅ [SIGNUP] New member: ${cleanFirstName} ${cleanLastName} <${cleanEmail}>\n`);
    return sendSuccess(res, `Welcome to Global Worship Radio, ${cleanFirstName}! Your account has been created.`, { member: newMember }, 201);

  } catch (err) {
    if (err.code === '23505') { // PostgreSQL unique violation
      return sendError(res, 'This email address is already registered.', 409);
    }
    console.error('[SIGNUP ERROR]', err);
    return sendError(res, 'Something went wrong. Please try again later.', 500);
  }
}

module.exports = { signup };