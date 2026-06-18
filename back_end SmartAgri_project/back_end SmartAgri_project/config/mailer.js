const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.MAIL_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

/**
 * Send forgot-password reset email
 */
const sendResetPasswordEmail = async (toEmail, userName, resetToken) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

  await transporter.sendMail({
    from: process.env.MAIL_FROM || '"Smart Agriculture" <noreply@smartagri.com>',
    to: toEmail,
    subject: '🌱 Reset Your Password — Smart Agriculture',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 520px; margin: auto; padding: 32px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #2d6a4f;">🌱 Smart Agriculture</h2>
        <p>Hi <strong>${userName}</strong>,</p>
        <p>We received a request to reset your password. Click the button below to proceed:</p>
        <a href="${resetUrl}"
           style="display:inline-block; margin: 16px 0; padding: 12px 28px;
                  background-color: #2d6a4f; color: #fff; text-decoration: none;
                  border-radius: 6px; font-size: 16px;">
          Reset Password
        </a>
        <p style="color: #888; font-size: 13px;">This link expires in <strong>30 minutes</strong>.</p>
        <p style="color: #888; font-size: 13px;">If you did not request a password reset, please ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 24px 0;" />
        <p style="color: #aaa; font-size: 12px;">Smart Agriculture Management Platform</p>
      </div>
    `,
  });
};

/**
 * Send email-update confirmation email
 */
const sendEmailUpdateNotification = async (oldEmail, newEmail, userName) => {
  await transporter.sendMail({
    from: process.env.MAIL_FROM || '"Smart Agriculture" <noreply@smartagri.com>',
    to: oldEmail,
    subject: '📧 Your Email Was Changed — Smart Agriculture',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 520px; margin: auto; padding: 32px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #2d6a4f;">🌱 Smart Agriculture</h2>
        <p>Hi <strong>${userName}</strong>,</p>
        <p>Your account email has been updated to: <strong>${newEmail}</strong></p>
        <p style="color: #888; font-size: 13px;">If you did not make this change, please contact support immediately.</p>
      </div>
    `,
  });
};

module.exports = { sendResetPasswordEmail, sendEmailUpdateNotification };
