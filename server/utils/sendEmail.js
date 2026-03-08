import nodemailer from 'nodemailer';

// ── Transport setup ─────────────────────────────────────────────────────────

let transporter = null;

const getTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host:   process.env.EMAIL_HOST,
      port:   Number(process.env.EMAIL_PORT) || 587,
      secure: process.env.EMAIL_PORT === '465',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }
  return transporter;
};

// ── Public helpers ──────────────────────────────────────────────────────────

/**
 * Send an email with optional attachment.
 *
 * @param {object} options
 * @param {string}   options.to          - Recipient email
 * @param {string}   options.subject     - Email subject
 * @param {string}   options.html        - HTML body
 * @param {Array}    options.attachments - Nodemailer attachment objects
 */
export const sendEmail = async ({ to, subject, html, attachments = [] }) => {
  const mailOptions = {
    from: `"Maruti Furniture" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
    attachments,
  };
  return getTransporter().sendMail(mailOptions);
};

// ── Email templates ─────────────────────────────────────────────────────────

export const quotationEmailHTML = (clientName, quotationNumber, pdfUrl) => `
<div style="font-family:Arial;max-width:600px;margin:0 auto;">
  <h2 style="color:#c8a84b;">Maruti Furniture</h2>
  <p>Dear <strong>${clientName}</strong>,</p>
  <p>Please find your quotation <strong>${quotationNumber}</strong> attached.</p>
  <p><a href="${pdfUrl}" style="background:#c8a84b;color:#000;padding:10px 20px;text-decoration:none;border-radius:4px;font-weight:bold;">View / Download Quotation</a></p>
  <p style="color:#999;font-size:12px;margin-top:24px;">This quotation is valid for 30 days.</p>
</div>
`;

export const invoiceEmailHTML = (clientName, invoiceNumber, pdfUrl) => `
<div style="font-family:Arial;max-width:600px;margin:0 auto;">
  <h2 style="color:#c8a84b;">Maruti Furniture</h2>
  <p>Dear <strong>${clientName}</strong>,</p>
  <p>Your invoice <strong>${invoiceNumber}</strong> is ready.</p>
  <p><a href="${pdfUrl}" style="background:#c8a84b;color:#000;padding:10px 20px;text-decoration:none;border-radius:4px;font-weight:bold;">View / Download Invoice</a></p>
</div>
`;

export const passwordResetEmailHTML = (name, resetUrl) => `
<div style="font-family:Arial;max-width:600px;margin:0 auto;">
  <h2>Password Reset</h2>
  <p>Hi <strong>${name}</strong>, click below to reset your password. Expires in 1 hour.</p>
  <p><a href="${resetUrl}" style="background:#1a1a1a;color:#fff;padding:10px 20px;text-decoration:none;border-radius:4px;">Reset Password</a></p>
  <p style="color:#999;font-size:12px;">If you did not request this, ignore this email.</p>
</div>
`;
