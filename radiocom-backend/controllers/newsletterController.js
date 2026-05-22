/*
 * controllers/newsletterController.js
 * ------------------------------------------------------------
 * Handles:
 *   POST /api/subscribe       — add or reactivate a subscriber
 *   POST /api/unsubscribe     — mark a subscriber inactive
 *   GET  /api/subscribe/check — check subscription status (dev util)
 * ------------------------------------------------------------
 */

'use strict';

const db = require('../db/database');
const { sendSuccess, sendError, simulateSendEmail, sanitiseEmail, sanitiseString } = require('../utils/helpers');

// ── Subscribe 


function subscribe(req, res) {
  try {
    // ── Validation 
    if (!req.body) {
      return sendError(res, 'No request body received.', 422);
    }

    const { email, source } = req.body;   // ← ONE declaration only

    if (typeof email !== 'string') {
      return sendError(res, 'Email must be a string.', 422);
    }

    const cleanEmail = sanitiseEmail(email);
    if (!cleanEmail) {
      return sendError(res, 'Invalid email format.', 422);
    }

    const cleanSource = sanitiseString(source || 'footer');
    const ipAddress   = req.ip || req.connection?.remoteAddress || null;

    // ── Check if email already exists ─────────────────────
    const existing = db
      .prepare('SELECT id, status FROM newsletter_subscribers WHERE email = ?')
      .get(cleanEmail);

    if (existing) {
      if (existing.status === 'active') {
        // Already subscribed — treat as success (avoid enumeration)
        return sendSuccess(res, "You’re already part of the Global Worship Radio community. Check your inbox for the latest updates and inspiration.", {});
      }

      // Was unsubscribed — reactivate
      db.prepare(`
        UPDATE newsletter_subscribers
        SET status = 'active', subscribed_at = datetime('now'), unsubscribed_at = NULL, source = @source
        WHERE id = @id
      `).run({ id: existing.id, source: cleanSource });

      simulateSendEmail({
        to:      cleanEmail,
        subject: 'Welcome back to Global Worship Radio!',
        body: `
Hi there,

Great news — you've been resubscribed to the Global Worship Radio community newsletter!

You'll now receive:
  • Upcoming event invitations
  • New training program announcements
  • Community stories and show highlights
  • Exclusive member news

To unsubscribe at any time, visit: https://gwradio.live/unsubscribe

Warm regards,
The Global Worship Radio Team
        `.trim(),
      });

      console.log(`\n✅ [NEWSLETTER] Reactivated: ${cleanEmail}\n`);
      return sendSuccess(res, "Welcome back! You've been resubscribed to our newsletter.", {});
    }

    // ── Fresh insert ───────────────────────────────────────
    db.prepare(`
      INSERT INTO newsletter_subscribers (email, source, status, ip_address)
      VALUES (@email, @source, 'active', @ip_address)
    `).run({ email: cleanEmail, source: cleanSource, ip_address: ipAddress });

    // Simulate welcome email
    simulateSendEmail({
      to:      cleanEmail,
      subject: 'Welcome to Global Worship Radio — You are now part of the community!',
      body: `
Hi there,

Welcome to Global Worship Radio (GWR).

You have joined a growing community of listeners, creators, and Team members who are passionate about prayer, word and worship.

Here's what to expect in your inbox:
  • Upcoming events and workshops
  • New training programs
  • Community stories and member spotlights
  • Live show announcements

We are excited to journey with you as we grow together in worship and prayer. Stay tuned for updates, and feel free to reach out if you have any questions or ideas.

if you wish to unsubscribe at any time, you can do so here:
https://gwradio.live/unsubscribe

Stay connected and stay inspired.


Warm regards,
The Global Worship Radio Team
globalworshipradio@gmail.com
      `.trim(),
    });

    console.log(`\n✅ [NEWSLETTER] New subscriber: ${cleanEmail} (source: ${cleanSource})\n`);

    return sendSuccess(
      res,
      "You’re subscribed! Check your inbox for your welcome email and stay tuned for training, events, and updates from Global Worship Radio.",
      {},
      201
    );

  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      // Race condition safety net
      return sendSuccess(res, "You’re already part of the Global Worship Radio community. Check your inbox for the latest updates and inspiration.", {});
    }
    console.error('[NEWSLETTER SUBSCRIBE ERROR]', err);
    return sendError(res, 'Something went wrong. Please try again later.', 500);
  }
}

// ── Unsubscribe ───────────────────────────────────────────────

/**
 * POST /api/unsubscribe
 */
function unsubscribe(req, res) {
  try {
    const { email } = req.body;
    const cleanEmail = sanitiseEmail(email);
    console.log('SANITIZED EMAIL:', cleanEmail);

    if (!cleanEmail) {
      return sendError(res, 'Email address is required.', 400);
    }

    const existing = db
      .prepare('SELECT id, status FROM newsletter_subscribers WHERE email = ?')
      .get(cleanEmail);

    if (!existing || existing.status === 'unsubscribed') {
      // Don't reveal whether the email exists — generic message
      return sendSuccess(res, "If that email was subscribed, it has been removed.", {});
    }

    db.prepare(`
      UPDATE newsletter_subscribers
      SET status = 'unsubscribed', unsubscribed_at = datetime('now')
      WHERE email = ?
    `).run(cleanEmail);

    console.log(`\n✅ [NEWSLETTER] Unsubscribed: ${cleanEmail}\n`);

    return sendSuccess(res, "You've been unsubscribed. We're sorry to see you go!", {});

  } catch (err) {
    console.error('[NEWSLETTER UNSUBSCRIBE ERROR]', err);
    return sendError(res, 'Something went wrong. Please try again later.', 500);
  }
}

// ── Status check (dev/admin utility) ─────────────────────────

/**
 * GET /api/subscribe/check?email=...
 */
function checkStatus(req, res) {
  const email = sanitiseEmail(req.query.email || '');
  if (!email) return sendError(res, 'Email query parameter is required.', 400);

  const row = db
    .prepare('SELECT email, status, source, subscribed_at FROM newsletter_subscribers WHERE email = ?')
    .get(email);

  if (!row) return sendSuccess(res, 'Email not found.', { subscribed: false });

  return sendSuccess(res, 'Subscription status retrieved.', {
    subscribed: row.status === 'active',
    status:     row.status,
    source:     row.source,
    since:      row.subscribed_at,
  });
}

module.exports = { subscribe, unsubscribe, checkStatus };
