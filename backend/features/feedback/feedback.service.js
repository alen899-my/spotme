const nodemailer = require('nodemailer');
const { pool } = require('../../db');

/**
 * Creates a new feedback entry for an authenticated user.
 */
async function createFeedback({ userId, category, title, description }) {
  const result = await pool.query(
    `INSERT INTO feedback (user_id, category, title, description)
     VALUES ($1, $2, $3, $4)
     RETURNING id, created_at`,
    [userId, category || 'General', title.trim(), description.trim()]
  );
  return result.rows[0];
}

/**
 * Handles public contact form submissions from the landing page.
 * Stores message in feedback table and dispatches an email notification via Nodemailer.
 */
async function submitContactFeedback({ name, email, msg }) {
  const cleanName = (name || '').trim();
  const cleanEmail = (email || '').trim();
  const cleanMsg = (msg || '').trim();

  // 1. Store in PostgreSQL feedback table so it shows in Admin Feedback Dashboard
  const result = await pool.query(
    `INSERT INTO feedback (user_id, category, title, description)
     VALUES (NULL, 'Contact Form', $1, $2)
     RETURNING id, created_at`,
    [`Contact from ${cleanName}`, `${cleanMsg}\n\nSender Email: ${cleanEmail}\nSender Name: ${cleanName}`]
  );

  const feedbackRecord = result.rows[0];

  // 2. Dispatch email notification via nodemailer if configured
  if (process.env.GMAIL_USER && process.env.GMAIL_PASS) {
    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_PASS,
        },
      });

      await transporter.sendMail({
        from: `"SpotMe Team Contact" <${process.env.GMAIL_USER}>`,
        to: process.env.GMAIL_USER,
        replyTo: cleanEmail,
        subject: `New SpotMe Contact: ${cleanName} (${cleanEmail})`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 580px; margin: 0 auto; background: #ffffff; padding: 24px; border-radius: 12px; border: 1px solid #e5e7eb;">
            <div style="border-bottom: 2px solid #F7CB16; padding-bottom: 12px; margin-bottom: 16px;">
              <h2 style="color: #111827; margin: 0; font-size: 20px;">New Message from SpotMe Landing Page</h2>
              <span style="color: #6b7280; font-size: 12px;">Submitted via Meet the Team / Contact Form</span>
            </div>
            
            <div style="margin-bottom: 16px;">
              <p style="margin: 4px 0; color: #374151; font-size: 14px;"><strong>From:</strong> ${cleanName}</p>
              <p style="margin: 4px 0; color: #374151; font-size: 14px;"><strong>Email:</strong> <a href="mailto:${cleanEmail}" style="color: #2596BE;">${cleanEmail}</a></p>
            </div>

            <div style="background: #f9fafb; border-radius: 8px; padding: 16px; margin: 16px 0; border: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #1f2937; font-size: 14px; white-space: pre-line; line-height: 1.6;">${cleanMsg}</p>
            </div>

            <p style="color: #9ca3af; font-size: 12px; margin-top: 24px; text-align: center;">
              SpotMe Fitness Companion • Database Feedback ID #${feedbackRecord.id}
            </p>
          </div>
        `,
      });
    } catch (mailError) {
      console.error('Failed to send contact notification email:', mailError);
    }
  }

  return feedbackRecord;
}

module.exports = {
  createFeedback,
  submitContactFeedback,
};
