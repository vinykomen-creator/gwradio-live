'use strict';

const pool = require('../db/postgres');
const { sendSuccess, sendError, simulateSendEmail, sanitiseString, sanitiseEmail } = require('../utils/helpers');

const ADMIN_EMAIL = 'globalworshipradio@gmail.com';

async function contact(req, res) {
  try {
    const { first_name, last_name, email, subject, message } = req.body;

    const cleanFirstName = sanitiseString(first_name);
    const cleanLastName  = sanitiseString(last_name);
    const cleanEmail     = sanitiseEmail(email);
    const cleanSubject   = sanitiseString(subject || 'General Inquiry');
    const cleanMessage   = sanitiseString(message);
    const ipAddress      = req.ip || req.connection?.remoteAddress || null;

    const { rows } = await pool.query(
      `INSERT INTO contact_messages
         (first_name, last_name, email, subject, message, status, ip_address)
       VALUES ($1, $2, $3, $4, $5, 'unread', $6)
       RETURNING id`,
      [cleanFirstName, cleanLastName, cleanEmail, cleanSubject, cleanMessage, ipAddress]
    );

    const messageId = rows[0].id;

    simulateSendEmail({
      to: ADMIN_EMAIL,
      replyTo: cleanEmail,
      subject: `[Global Worship Radio] ${cleanSubject} — from ${cleanFirstName} ${cleanLastName}`,
      body: `New contact form submission (ID #${messageId}).\n\nName: ${cleanFirstName} ${cleanLastName}\nEmail: ${cleanEmail}\nSubject: ${cleanSubject}\n\nMessage:\n--------\n${cleanMessage}\n--------\nSubmitted: ${new Date().toUTCString()}`.trim(),
    });

    simulateSendEmail({
      to: cleanEmail,
      subject: `We received your message — Global Worship Radio will be in touch!`,
      body: `Hi ${cleanFirstName},\n\nThank you for reaching out to Global Worship Radio! We have received your message and will get back to you within 24 hours.\n\nYour message reference: #${messageId}\nSubject: ${cleanSubject}\n\nWarm regards,\nThe Global Worship Radio Team\nglobalworshipradio@gmail.com`.trim(),
    });

    console.log(`\n✅ [CONTACT] Message #${messageId} saved.`);
    return sendSuccess(res, `Thank you, ${cleanFirstName}! Your message has been received. We'll reply within 24 hours.`, { message_id: messageId }, 201);

  } catch (err) {
    console.error('[CONTACT ERROR]', err);
    return sendError(res, 'Something went wrong. Please try again later.', 500);
  }
}

module.exports = { contact };