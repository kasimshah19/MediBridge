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

const sendMailSafe = async ({ to, subject, html, text, devLogSummary }) => {
  const plainText = text || html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

  if (transporter) {
    try {
      await transporter.sendMail({
        from: env.EMAIL_FROM,
        to,
        subject,
        html,
        text: plainText,
      });
      return true;
    } catch (err) {
      console.error(`❌ Failed to send email to ${to} via SMTP:`, err.message);
    }
  }

  if (env.NODE_ENV === 'development') {
    console.log('\n======================================================');
    console.log(`📧 [DEV EMAIL] ${subject}`);
    console.log(`Recipient: ${to}`);
    if (devLogSummary) console.log(devLogSummary);
    console.log('======================================================\n');
  }

  return true;
};

/**
 * Standardized responsive, light-themed HTML email layout.
 * Features MediBridge branding, structured layout, action button,
 * and transactional compliance notice with zero tracking pixels.
 */
export const buildTransactionalEmailLayout = ({
  badge,
  badgeBg = '#ECFDF5',
  badgeColor = '#065F46',
  heading,
  name = 'User',
  contentHtml,
  buttonText,
  buttonUrl,
  buttonColor = '#0D9488',
  alertBoxHtml,
}) => {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${heading}</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F0FDFA; margin: 0; padding: 24px; color: #1E293B; }
      .container { max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #CCFBF1; padding: 32px; box-shadow: 0 4px 20px rgba(13, 148, 136, 0.08); }
      .logo { font-size: 20px; font-weight: 800; color: #0D9488; text-decoration: none; display: inline-block; margin-bottom: 20px; letter-spacing: -0.5px; }
      .badge { display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 16px; background-color: ${badgeBg}; color: ${badgeColor}; }
      h2 { color: #134E4A; margin-top: 0; font-size: 20px; font-weight: 700; }
      p { font-size: 14px; line-height: 1.6; color: #475569; margin: 14px 0; }
      .alert-box { background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 14px; margin: 18px 0; font-size: 13px; line-height: 1.5; color: #334155; }
      .btn { display: inline-block; background-color: ${buttonColor}; color: #ffffff !important; padding: 12px 28px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 14px; margin: 18px 0; }
      .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #F1F5F9; font-size: 12px; color: #94A3B8; line-height: 1.5; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="logo">🏥 MediBridge</div>
      ${badge ? `<div><span class="badge">${badge}</span></div>` : ''}
      <h2>${heading}</h2>
      <p>Hello ${name},</p>
      ${alertBoxHtml ? `<div class="alert-box">${alertBoxHtml}</div>` : ''}
      ${contentHtml}
      ${buttonText && buttonUrl ? `
      <div style="text-align: center; margin: 24px 0;">
        <a href="${buttonUrl}" class="btn" target="_blank">${buttonText}</a>
      </div>` : ''}
      <div class="footer">
        <p><strong>MediBridge Healthcare Platform</strong> • Regulated Medicine Exchange Network</p>
        <p style="margin-top: 6px; font-size: 11px; color: #94A3B8;">
          This is an automated transactional message regarding your MediBridge account. No marketing tracking pixels or third-party cookies are used.
        </p>
      </div>
    </div>
  </body>
</html>`;
};

/**
 * Send password reset email with formatted HTML template and token link.
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

  return sendMailSafe({
    to,
    subject: 'MediBridge - Password Reset Request',
    html,
    devLogSummary: `🔗 Reset URL: ${resetUrl}`,
  });
};

/**
 * Send notification when an organization has been verified.
 */
export const sendOrgVerifiedEmail = async ({ to, name, orgName }) => {
  const dashboardUrl = `${env.CLIENT_URL}/ngo/dashboard`;
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #F0FDFA; margin: 0; padding: 24px; color: #1E293B; }
          .container { max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #CCFBF1; padding: 32px; box-shadow: 0 4px 20px rgba(13, 148, 136, 0.08); }
          .logo { font-size: 22px; font-weight: bold; color: #0D9488; margin-bottom: 24px; }
          .badge { display: inline-block; background: #ECFDF5; color: #047857; padding: 6px 14px; border-radius: 20px; font-weight: 700; font-size: 12px; margin-bottom: 16px; border: 1px solid #A7F3D0; }
          h2 { color: #134E4A; margin-top: 0; font-size: 20px; }
          p { font-size: 14px; line-height: 1.6; color: #475569; margin: 14px 0; }
          .btn { display: inline-block; background: linear-gradient(135deg, #0D9488, #0EA5E9); color: #ffffff !important; padding: 12px 28px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 14px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">🏥 MediBridge</div>
          <div class="badge">✓ Verification Approved</div>
          <h2>Congratulations, ${name || 'Partner'}!</h2>
          <p>Your organization <strong>${orgName}</strong> has been officially verified on the MediBridge platform.</p>
          <p>You can now request medicines, match with verified donations within your service radius, and manage redistributions securely.</p>
          <div style="text-align: center;">
            <a href="${dashboardUrl}" class="btn" target="_blank">Access NGO Dashboard</a>
          </div>
        </div>
      </body>
    </html>
  `;

  return sendMailSafe({
    to,
    subject: `MediBridge - Organization Verified (${orgName})`,
    html,
    devLogSummary: `Organization ${orgName} approved. Login URL: ${dashboardUrl}`,
  });
};

/**
 * Send notification when an organization verification is rejected.
 */
export const sendOrgRejectedEmail = async ({ to, name, orgName, note }) => {
  const onboardingUrl = `${env.CLIENT_URL}/ngo/onboarding`;
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #FFF1F2; margin: 0; padding: 24px; color: #1E293B; }
          .container { max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #FFE4E6; padding: 32px; box-shadow: 0 4px 20px rgba(225, 29, 72, 0.08); }
          .logo { font-size: 22px; font-weight: bold; color: #E11D48; margin-bottom: 24px; }
          .reason-box { background: #FFF1F2; border: 1px solid #FECDD3; border-radius: 10px; padding: 16px; margin: 16px 0; font-size: 13px; color: #9F1239; line-height: 1.5; }
          .btn { display: inline-block; background: #E11D48; color: #ffffff !important; padding: 12px 28px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 14px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">🏥 MediBridge</div>
          <h2>Verification Update for ${orgName}</h2>
          <p>Hello ${name || 'Partner'},</p>
          <p>Thank you for submitting your organization documents. During the administrative review, our compliance team noted that further adjustments or documentation are required before approval:</p>
          <div class="reason-box">
            <strong>Administrator Note:</strong><br />
            ${note || 'Please review your uploaded documents and details.'}
          </div>
          <p>You can review the feedback, update your information, and resubmit directly through your portal:</p>
          <div style="text-align: center;">
            <a href="${onboardingUrl}" class="btn" target="_blank">Edit & Resubmit Application</a>
          </div>
        </div>
      </body>
    </html>
  `;

  return sendMailSafe({
    to,
    subject: `MediBridge - Action Required: Organization Verification (${orgName})`,
    html,
    devLogSummary: `Organization ${orgName} rejected. Reason: ${note}`,
  });
};

/**
 * Send notification when a pharmacist applicant is approved.
 */
export const sendUserApprovedEmail = async ({ to, name, role }) => {
  const dashboardUrl = `${env.CLIENT_URL}/${role}/dashboard`;
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #F0FDFA; margin: 0; padding: 24px; color: #1E293B; }
          .container { max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #CCFBF1; padding: 32px; box-shadow: 0 4px 20px rgba(13, 148, 136, 0.08); }
          .logo { font-size: 22px; font-weight: bold; color: #0D9488; margin-bottom: 24px; }
          .btn { display: inline-block; background: linear-gradient(135deg, #0D9488, #0EA5E9); color: #ffffff !important; padding: 12px 28px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 14px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">🏥 MediBridge</div>
          <h2>Welcome to MediBridge, ${name}!</h2>
          <p>Your license credentials have been reviewed and approved by the system administration.</p>
          <p>Your account is now fully active with complete verification privileges.</p>
          <div style="text-align: center;">
            <a href="${dashboardUrl}" class="btn" target="_blank">Open Workspace</a>
          </div>
        </div>
      </body>
    </html>
  `;

  return sendMailSafe({
    to,
    subject: `MediBridge - Account Approved`,
    html,
    devLogSummary: `User ${name} (${role}) approved.`,
  });
};

/**
 * Send notification when a user application is rejected.
 */
export const sendUserRejectedEmail = async ({ to, name, role, note }) => {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #FFF1F2; margin: 0; padding: 24px; color: #1E293B; }
          .container { max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #FFE4E6; padding: 32px; }
          .reason-box { background: #FFF1F2; border: 1px solid #FECDD3; border-radius: 10px; padding: 16px; margin: 16px 0; font-size: 13px; color: #9F1239; }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>Application Status Update</h2>
          <p>Hello ${name},</p>
          <p>Your registration as a ${role} was reviewed by administration:</p>
          <div class="reason-box">
            <strong>Administrator Note:</strong><br />
            ${note || 'Credentials could not be verified.'}
          </div>
          <p>If you have questions, please reach out to MediBridge support.</p>
        </div>
      </body>
    </html>
  `;

  return sendMailSafe({
    to,
    subject: `MediBridge - Application Status Update`,
    html,
    devLogSummary: `User ${name} rejected. Reason: ${note}`,
  });
};

/**
 * Send expiry alert notification email to donor (30-day warning or expired).
 */
export const sendExpiryAlertEmail = async ({ to, name, count, type }) => {
  const isExpiredType = type === 'expired';
  const subject = isExpiredType
    ? `MediBridge Alert - ${count} Medicine${count === 1 ? '' : 's'} Expired`
    : `MediBridge Alert - ${count} Medicine${count === 1 ? '' : 's'} Expiring in 30 Days`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #F8FAFC; margin: 0; padding: 24px; color: #1E293B; }
          .container { max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #E2E8F0; padding: 32px; }
          .badge { display: inline-block; padding: 6px 12px; border-radius: 8px; font-weight: bold; font-size: 13px; margin-bottom: 16px; ${
            isExpiredType ? 'background: #FFE4E6; color: #E11D48;' : 'background: #FEF3C7; color: #D97706;'
          } }
          .cta { display: inline-block; background-color: #0D9488; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="badge">${isExpiredType ? 'EXPIRED' : 'EXPIRING SOON'}</div>
          <h2>Medicine Shelf-Life Update</h2>
          <p>Hello ${name},</p>
          <p>${
            isExpiredType
              ? `${count} of your medicine${count === 1 ? '' : 's'} reached expiry and ${count === 1 ? 'has' : 'have'} been retired from the donation network.`
              : `${count} of your medicine${count === 1 ? '' : 's'} will expire within the next 30 days.`
          }</p>
          <p>You can check status and details in your Expiry Tracker dashboard.</p>
          <a class="cta" href="${env.CLIENT_URL}/donor/expiry?priority=critical">View Expiry Tracker</a>
        </div>
      </body>
    </html>
  `;

  return sendMailSafe({
    to,
    subject,
    html,
    devLogSummary: `Expiry alert (${type}) sent to ${name} for ${count} items.`,
  });
};

/**
 * Send verification decision notification email to donor.
 */
export const sendVerificationDecisionEmail = async ({
  to,
  name,
  donationCode,
  donationId,
  approvedCount = 0,
  rejectedCount = 0,
}) => {
  const donationUrl = `${env.CLIENT_URL}/donor/donations/${donationId}`;
  const subject = `MediBridge - Verification Results for Donation ${donationCode}`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #F0FDFA; margin: 0; padding: 24px; color: #1E293B; }
          .container { max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #CCFBF1; padding: 32px; }
          .logo { font-size: 20px; font-weight: bold; color: #0D9488; margin-bottom: 20px; }
          .stats { display: flex; gap: 12px; margin: 20px 0; }
          .stat-box { flex: 1; padding: 12px; border-radius: 8px; text-align: center; }
          .stat-approved { background: #ECFDF5; border: 1px solid #A7F3D0; color: #065F46; }
          .stat-rejected { background: #FFF1F2; border: 1px solid #FECDD3; color: #9F1239; }
          .btn { display: inline-block; background: #0D9488; color: #ffffff !important; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 16px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">🏥 MediBridge Verification Update</div>
          <h2>Pharmacist Review Complete</h2>
          <p>Hello ${name || 'Donor'},</p>
          <p>A licensed pharmacist has completed the medical verification for donation <strong>${donationCode}</strong>.</p>
          <div style="margin: 20px 0;">
            <p><strong>Approved medicines:</strong> ${approvedCount}</p>
            <p><strong>Rejected medicines:</strong> ${rejectedCount}</p>
          </div>
          <p>Click below to inspect the details, reasons, and next steps:</p>
          <a href="${donationUrl}" class="btn" target="_blank">View Donation Status</a>
        </div>
      </body>
    </html>
  `;

  return sendMailSafe({
    to,
    subject,
    html,
    devLogSummary: `Verification complete email sent to ${to} (${donationCode}): ${approvedCount} approved, ${rejectedCount} rejected.`,
  });
};

/**
 * Send notification when pharmacist requests clarification on a medicine item.
 */
export const sendVerificationMoreInfoEmail = async ({
  to,
  name,
  donationCode,
  donationId,
  medicineName,
  question,
}) => {
  const donationUrl = `${env.CLIENT_URL}/donor/donations/${donationId}`;
  const subject = `MediBridge - Clarification Requested for ${medicineName} (${donationCode})`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #FFFBEB; margin: 0; padding: 24px; color: #1E293B; }
          .container { max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #FDE68A; padding: 32px; }
          .badge { display: inline-block; background: #FEF3C7; color: #92400E; padding: 6px 12px; border-radius: 6px; font-weight: bold; font-size: 12px; margin-bottom: 16px; }
          .question-box { background: #FEF3C7; border-left: 4px solid #D97706; padding: 14px; border-radius: 4px; margin: 16px 0; color: #78350F; font-size: 14px; }
          .btn { display: inline-block; background: #D97706; color: #ffffff !important; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 16px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="badge">ACTION REQUIRED</div>
          <h2>Pharmacist Clarification Needed</h2>
          <p>Hello ${name || 'Donor'},</p>
          <p>During the verification of <strong>${medicineName}</strong> in donation <strong>${donationCode}</strong>, the reviewing pharmacist requested additional information:</p>
          <div class="question-box">
            "${question}"
          </div>
          <p>Please log in to your dashboard to answer the question or provide clearer photos.</p>
          <a href="${donationUrl}" class="btn" target="_blank">Respond to Pharmacist</a>
        </div>
      </body>
    </html>
  `;

  return sendMailSafe({
    to,
    subject,
    html,
    devLogSummary: `Clarification request email sent to ${to} for ${medicineName}: ${question}`,
  });
};

/**
 * Send account status change notification (suspend, reactivate, block)
 */
export const sendAccountStatusChangedEmail = async ({ to, name, action, reason }) => {
  const isSuspended = action === 'suspend';
  const isBlocked = action === 'block';
  const isReactivated = action === 'reactivate';

  let title = 'Account Status Updated';
  let badgeColor = '#0D9488';
  let message = 'Your account status has been updated.';

  if (isSuspended) {
    title = 'Account Suspended';
    badgeColor = '#F59E0B';
    message = `Your MediBridge account has been temporarily suspended by an administrator.${reason ? ` Reason: ${reason}` : ''}`;
  } else if (isBlocked) {
    title = 'Account Access Terminated';
    badgeColor = '#EF4444';
    message = `Your MediBridge account has been permanently blocked.${reason ? ` Reason: ${reason}` : ''}`;
  } else if (isReactivated) {
    title = 'Account Reactivated';
    badgeColor = '#10B981';
    message = 'Your MediBridge account has been reactivated. You may now sign in and resume full platform activities.';
  }

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #F8FAFC; margin: 0; padding: 24px; color: #1E293B; }
          .container { max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #E2E8F0; padding: 32px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05); }
          .logo { font-size: 22px; font-weight: bold; color: #0284C7; margin-bottom: 24px; display: inline-block; }
          .badge { display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600; color: #ffffff; background-color: ${badgeColor}; margin-bottom: 16px; }
          h2 { color: #0F172A; margin-top: 0; font-size: 20px; }
          p { font-size: 14px; line-height: 1.6; color: #475569; margin: 16px 0; }
          .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #F1F5F9; font-size: 12px; color: #94A3B8; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">🏥 MediBridge</div>
          <div><span class="badge">${title}</span></div>
          <h2>Hello ${name || 'User'},</h2>
          <p>${message}</p>
          <p>If you believe this is in error or have questions, please reply directly to this notification or reach out to support.</p>
          <div class="footer">
            <p>MediBridge Healthcare Platform • Regulated Medicine Exchange Network</p>
          </div>
        </div>
      </body>
    </html>
  `;

  return sendMailSafe({
    to,
    subject: `MediBridge - ${title}`,
    html,
    devLogSummary: `ℹ️ Status changed to: ${action} for ${to}`,
  });
};

export default {
  sendPasswordResetEmail,
  sendOrgVerifiedEmail,
  sendOrgRejectedEmail,
  sendUserApprovedEmail,
  sendUserRejectedEmail,
  sendExpiryAlertEmail,
  sendVerificationDecisionEmail,
  sendVerificationMoreInfoEmail,
  sendAccountStatusChangedEmail,
};
