import nodemailer from 'nodemailer';
import env from '../config/env.js';
import logger from '../config/logger.js';

let transporter;

const getTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.secure,
      auth: {
        user: env.smtp.user,
        pass: env.smtp.pass,
      },
      pool: true,
      maxConnections: 5,
    });
  }
  return transporter;
};

export const sendMail = async ({ to, subject, html, text }) => {
  const mailer = getTransporter();
  const mailOptions = {
    from: `"${env.smtp.fromName}" <${env.smtp.fromEmail}>`,
    to: Array.isArray(to) ? to.join(', ') : to,
    subject,
    html,
    text: text || html.replace(/<[^>]*>/g, ''),
  };

  try {
    const info = await mailer.sendMail(mailOptions);
    logger.info('Email sent', { messageId: info.messageId, to, subject });
    return info;
  } catch (err) {
    logger.error('Failed to send email', { error: err.message, to, subject });
    throw err;
  }
};


export const sendPasswordResetEmail = (to, { name, resetUrl }) =>
  sendMail({
    to,
    subject: 'Password Reset Request — RechPays',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
        <h2 style="color:#1a73e8;">Password Reset Request</h2>
        <p>Hello ${name},</p>
        <p>We received a request to reset your RechPays account password.</p>
        <p>Click the button below to reset your password. This link expires in <strong>15 minutes</strong>.</p>
        <a href="${resetUrl}" style="display:inline-block;background:#1a73e8;color:#fff;padding:12px 24px;text-decoration:none;border-radius:4px;margin:16px 0;">Reset Password</a>
        <p>If you did not request this, ignore this email. Your password will remain unchanged.</p>
        <hr/>
        <small style="color:#666;">RechPays | This is an automated email, please do not reply.</small>
      </div>
    `,
  });

export const sendWelcomeEmail = (to, { name }) =>
  sendMail({
    to,
    subject: 'Welcome to RechPays',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
        <h2 style="color:#1a73e8;">Welcome to RechPays!</h2>
        <p>Hello ${name},</p>
        <p>Your account has been successfully created on RechPays.</p>
        <p>You can now log in and start processing recharges through your retailer dashboard.</p>
        <hr/>
        <small style="color:#666;">RechPays | This is an automated email, please do not reply.</small>
      </div>
    `,
  });

export const sendAccountLockedEmail = (to, { name, unlockTime }) =>
  sendMail({
    to,
    subject: 'Account Locked — RechPays',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
        <h2 style="color:#e53935;">Account Temporarily Locked</h2>
        <p>Hello ${name},</p>
        <p>Your account has been temporarily locked due to multiple failed login attempts.</p>
        <p>Your account will be automatically unlocked at <strong>${unlockTime}</strong>.</p>
        <p>If you did not attempt to log in, please contact support immediately.</p>
        <hr/>
        <small style="color:#666;">RechPays | This is an automated email, please do not reply.</small>
      </div>
    `,
  });
