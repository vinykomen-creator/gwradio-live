/**
 * controllers/contactController.js
 * ------------------------------------------------------------
 * Handles POST /api/contact
 * - Saves the message to the database
 * - Simulates sending an email notification to the admin
 * - Simulates sending an auto-reply confirmation to the sender
 * ------------------------------------------------------------
 */

'use strict';

const db = require('../db/database');
const { sendSuccess, sendError, simulateSendEmail, sanitiseString, sanitiseEmail } = require('../utils/helpers');

// Admin inbox — change to your real address in production
const ADMIN_EMAIL = 'globalworshipradio@gmail.com';

/**
 * POST /api/contact
 */
function contact(req, res) {
  try {
    const { first_name, last_name, email, subject, message } = req.body;

    // Sanitise
    const cleanFirstName = sanitiseString(first_name);
    const cleanLastName  = sanitiseString(last_name);
    const cleanEmail     = sanitiseEmail(email);
    const cleanSubject   = sanitiseString(subject || 'General Inquiry');
    const cleanMessage   = sanitiseString(message);
    const ipAddress      = req.ip || req.connection?.remoteAddress || null;

    // ── Persist to DB ──────────────────────────────────────
    const stmt = db.prepare(`
      INSERT INTO contact_messages
        (first_name, last_name, email, subject, message, status, ip_address)
      VALUES
        (@first_name, @last_name, @email, @subject, @message, 'unread', @ip_address)
    `);

    const result = stmt.run({
      first_name: cleanFirstName,
      last_name:  cleanLastName,
      email:      cleanEmail,
      subject:    cleanSubject,
      message:    cleanMessage,
      ip_address: ipAddress,
    });

    const messageId = result.lastInsertRowid;

    // ── Simulate: admin notification email ────────────────
    simulateSendEmail({
      to:      ADMIN_EMAIL,
      replyTo: cleanEmail,
      subject: `[Global Worship Radio] ${cleanSubject} — from ${cleanFirstName} ${cleanLastName}`,
      body: `
You have a new contact form submission (ID #${messageId}).

Name:    ${cleanFirstName} ${cleanLastName}
Email:   ${cleanEmail}
Subject: ${cleanSubject}

Message:
--------
${cleanMessage}
--------

Submitted: ${new Date().toUTCString()}
      `.trim(),
    });

    // ── Simulate: auto-reply to sender ────────────────────
    simulateSendEmail({
      to:      cleanEmail,
      subject: `We received your message — Global Worship Radio will be in touch!`,
      body: `
Hi ${cleanFirstName},

Thank you for reaching out to Global Worship Radio! We have received your message and will get back to you within 24 hours.

Your message reference: #${messageId}
Subject: ${cleanSubject}

If your query is urgent, you can also reach us at:
📞 +1 612 217 2429
📍 Arden Hills, Minnesota

Warm regards,
The Global Worship Radio Team
globalworshipradio@gmail.com
      `.trim(),
    });

    console.log(`\n✅ [CONTACT] Message #${messageId} saved and email simulated.`);
    console.log(`   From: ${cleanFirstName} ${cleanLastName} <${cleanEmail}>`);
    console.log(`   Subject: ${cleanSubject}\n`);

    return sendSuccess(
      res,
      `Thank you, ${cleanFirstName}! Your message has been received. We'll reply within 24 hours.`,
      { message_id: messageId },
      201
    );

  } catch (err) {
    console.error('[CONTACT ERROR]', err);
    return sendError(res, 'Something went wrong. Please try again later.', 500);
  }
}

module.exports = { contact };
