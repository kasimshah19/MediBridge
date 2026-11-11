import nodemailer from 'nodemailer';
import env from '../config/env.js';

let transporter = null;

// Initialize SMTP transporter if credentials exist
if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT || 587,
    secure: env.SMTP_PORT === 465,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
  });
}

/**
 * Send password reset email with formatted HTML template and token link.
 * Falls back to printing link in development console if SMTP is not configured.
 *
 * @param {object} params
 * @param {string} params.to - Recipient email
 * @param {string} params.name - User name
 * @param {string} params.resetToken - Unhashed reset token
 */
export const sendPasswordResetEmail = async ({ to, name, resetToken }) => {
  const resetUrl = `${env.CLIENT_URL}/reset-password/${resetToken}`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #F0FDFA; margin: 0; padding: 24px; color: #1E293B; }
          .container { max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #CCFBF1; padding: 32px; box-shadow: 0 4px 20px rgba(13, 148, 136, 0.08); }
          .logo { font-size: 22px; font-weight: bold; color: #0D9488; margin-bottom: 24px; display: inline-block; }
          h2 { color: #134E4A; margin-top: 0; font-size: 20px; }
          p { font-size: 14px; line-height: 1.6; color: #475569; margin: 16px 0; }
          .btn { display: inline-block; background: linear-gradient(135deg, #0D9488, #0EA5E9); color: #ffffff !important; padding: 12px 28px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 14px; margin: 20px 0; }
          .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #F1F5F9; font-size: 12px; color: #94A3B8; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">🏥 MediBridge</div>
          <h2>Password Reset Request</h2>
          <p>Hello ${name || 'User'},</p>
          <p>We received a request to reset your password for your MediBridge account. Click the button below to choose a new password:</p>
          <div style="text-align: center;">
            <a href="${resetUrl}" class="btn" target="_blank">Reset My Password</a>
          </div>
          <p>This password reset link will expire in <strong>15 minutes</strong>. If you did not request a password reset, you can safely ignore this email.</p>
          <div class="footer">
            <p>MediBridge Healthcare Platform • Regulated Medicine Exchange Network</p>
          </div>
        </div>
      </body>
    </html>
  `;

  if (transporter) {
    try {
      await transporter.sendMail({
        from: env.EMAIL_FROM,
        to,
        subject: 'MediBridge - Password Reset Request',
        html,
      });
      return true;
    } catch (err) {
      console.error('❌ Failed to send reset email via SMTP:', err.message);
    }
  }

  // Fallback for development: print link to console
  if (env.NODE_ENV === 'development') {
    console.log('\n======================================================');
    console.log('📧 [DEV EMAIL] Password Reset Link for:', to);
    console.log('🔗 Reset URL:', resetUrl);
    console.log('⏳ Expires in 15 minutes');
    console.log('======================================================\n');
  }

  return true;
};

export default {
  sendPasswordResetEmail,
};
