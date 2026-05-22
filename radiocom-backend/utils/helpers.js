'use strict';

const config = require('../config');

// ── Response helpers ─────────────────────────────────────────

/**
 * Send a standardised success JSON response.
 * @param {object} res        - Express response object
 * @param {string} message    - Human-readable success message
 * @param {object} [data={}]  - Optional payload
 * @param {number} [status=200]
 */
function sendSuccess(res, message, data = {}, status = 200) {
  return res.status(status).json({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Send a standardised error JSON response.
 * @param {object} res
 * @param {string} message
 * @param {number} [status=400]
 * @param {object} [errors=null] - Field-level validation errors
 */
function sendError(res, message, status = 400, errors = null) {
  const body = {
    success: false,
    message,
    timestamp: new Date().toISOString(),
  };
  if (errors) body.errors = errors;
  return res.status(status).json(body);
}

// ── Email simulator ──────────────────────────────────────────

/**
 * Simulates sending an email by printing a formatted log.
 * Replace the internals with a real transport (nodemailer, Resend, etc.)
 * when moving to production.
 *
 * @param {{ to, subject, replyTo, body }} emailData
 */
function simulateSendEmail({ to, subject, replyTo, body }) {
  const divider = '─'.repeat(60);
  console.log('\n📧  EMAIL SIMULATION');
  console.log(divider);
  console.log(`  To:       ${to}`);
  console.log(`  Reply-To: ${replyTo || '(none)'}`);
  console.log(`  Subject:  ${subject}`);
  if (config.email.logBody) {
    console.log(`  Body:\n${body.split('\n').map(l => '    ' + l).join('\n')}`);
  }
  console.log(divider + '\n');

  // In production, swap the above console.log block for:
  //
  //   const transporter = nodemailer.createTransport({ ... });
  //   await transporter.sendMail({ from, to, replyTo, subject, text: body });
  //
  // or use Resend / SendGrid / AWS SES SDK.
}

// ── String sanitisers ────────────────────────────────────────

/** Trim and normalise whitespace in a string value. */
function sanitiseString(value) {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/\s+/g, ' ');
}

/** Lowercase and trim an email address. */
function sanitiseEmail(email) {
  if (!email || typeof email !== 'string') return null;

  const clean = email.trim().toLowerCase();

  // safe and standard email regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  return emailRegex.test(clean) ? clean : null;
}

module.exports = { sendSuccess, sendError, simulateSendEmail, sanitiseString, sanitiseEmail };
