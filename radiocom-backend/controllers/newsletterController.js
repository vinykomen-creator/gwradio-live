'use strict';

const pool = require('../db/postgres');
const { sendSuccess, sendError, simulateSendEmail, sanitiseEmail, sanitiseString } = require('../utils/helpers');

// ── Subscribe
async function subscribe(req, res) {
  try {
    if (!req.body) return sendError(res, 'No request body received.', 422);

    const { email, source } = req.body;
    if (typeof email !== 'string') return sendError(res, 'Email must be a string.', 422);

    const cleanEmail  = sanitiseEmail(email);
    if (!cleanEmail)  return sendError(res, 'Invalid email format.', 422);

    const cleanSource = sanitiseString(source || 'footer');
    const ipAddress   = req.ip || req.connection?.remoteAddress || null;

    // Check if exists
    const { rows } = await pool.query(
      'SELECT id, status FROM newsletter_subscribers WHERE email = $1',
      [cleanEmail]
    );
    const existing = rows[0];

    if (existing) {
      if (existing.status === 'active') {
        return sendSuccess(res, "You're already part of the Global Worship Radio community. Check your inbox for the latest updates and inspiration.", {});
      }

      // Reactivate
      await pool.query(
        `UPDATE newsletter_subscribers
         SET status = 'active', subscribed_at = NOW(), unsubscribed_at = NULL, source = $1
         WHERE id = $2`,
        [cleanSource, existing.id]
      );

      simulateSendEmail({
        to: cleanEmail,
        subject: 'Welcome back to Global Worship Radio!',
        body: `Hi there,\n\nGreat news — you've been resubscribed to the Global Worship Radio community newsletter!\n\nTo unsubscribe at any time, visit: https://gwradio.live/unsubscribe\n\nWarm regards,\nThe Global Worship Radio Team`.trim(),
      });

      console.log(`\n✅ [NEWSLETTER] Reactivated: ${cleanEmail}\n`);
      return sendSuccess(res, "Welcome back! You've been resubscribed to our newsletter.", {});
    }

    // Fresh insert
    await pool.query(
      `INSERT INTO newsletter_subscribers (email, source, status, ip_address)
       VALUES ($1, $2, 'active', $3)`,
      [cleanEmail, cleanSource, ipAddress]
    );

    simulateSendEmail({
      to: cleanEmail,
      subject: 'Welcome to Global Worship Radio — You are now part of the community!',
      body: `Hi there,\n\nWelcome to Global Worship Radio (GWR).\n\nYou have joined a growing community of listeners, creators, and team members passionate about prayer, word and worship.\n\nTo unsubscribe at any time: https://gwradio.live/unsubscribe\n\nWarm regards,\nThe Global Worship Radio Team\nglobalworshipradio@gmail.com`.trim(),
    });

    console.log(`\n✅ [NEWSLETTER] New subscriber: ${cleanEmail} (source: ${cleanSource})\n`);
    return sendSuccess(res, "You're subscribed! Check your inbox for your welcome email and stay tuned for training, events, and updates from Global Worship Radio.", {}, 201);

  } catch (err) {
    if (err.code === '23505') { // PostgreSQL unique violation
      return sendSuccess(res, "You're already part of the Global Worship Radio community. Check your inbox for the latest updates and inspiration.", {});
    }
    console.error('[NEWSLETTER SUBSCRIBE ERROR]', err);
    return sendError(res, 'Something went wrong. Please try again later.', 500);
  }
}

// ── Unsubscribe
async function unsubscribe(req, res) {
  try {
    const { email } = req.body;
    const cleanEmail = sanitiseEmail(email);
    if (!cleanEmail) return sendError(res, 'Email address is required.', 400);

    const { rows } = await pool.query(
      'SELECT id, status FROM newsletter_subscribers WHERE email = $1',
      [cleanEmail]
    );
    const existing = rows[0];

    if (!existing || existing.status === 'unsubscribed') {
      return sendSuccess(res, "If that email was subscribed, it has been removed.", {});
    }

    await pool.query(
      `UPDATE newsletter_subscribers
       SET status = 'unsubscribed', unsubscribed_at = NOW()
       WHERE email = $1`,
      [cleanEmail]
    );

    console.log(`\n✅ [NEWSLETTER] Unsubscribed: ${cleanEmail}\n`);
    return sendSuccess(res, "You've been unsubscribed. We're sorry to see you go!", {});

  } catch (err) {
    console.error('[NEWSLETTER UNSUBSCRIBE ERROR]', err);
    return sendError(res, 'Something went wrong. Please try again later.', 500);
  }
}

// ── Check Status
async function checkStatus(req, res) {
  const email = sanitiseEmail(req.query.email || '');
  if (!email) return sendError(res, 'Email query parameter is required.', 400);

  const { rows } = await pool.query(
    'SELECT email, status, source, subscribed_at FROM newsletter_subscribers WHERE email = $1',
    [email]
  );
  const row = rows[0];

  if (!row) return sendSuccess(res, 'Email not found.', { subscribed: false });

  return sendSuccess(res, 'Subscription status retrieved.', {
    subscribed: row.status === 'active',
    status:     row.status,
    source:     row.source,
    since:      row.subscribed_at,
  });
}

module.exports = { subscribe, unsubscribe, checkStatus };