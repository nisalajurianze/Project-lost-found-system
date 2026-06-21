// ============================================
// Email Service
// Nodemailer with 6 professional HTML templates
// Graceful fallback: console-log when SMTP unavailable
// ============================================

import nodemailer from 'nodemailer';

let transporter = null;
let isEmailConfigured = false;

/**
 * Initialise the email transporter.
 */
const initEmailService = () => {
  const { RESEND_API_KEY, SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;

  if (RESEND_API_KEY && RESEND_API_KEY !== 'your_resend_api_key') {
    isEmailConfigured = true;
    console.log('✅ Email service configured using Resend API.');
    return;
  }

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    console.warn('⚠️  Email credentials not configured. Emails will be logged to console.');
    return;
  }

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: parseInt(SMTP_PORT, 10) || 587,
    secure: parseInt(SMTP_PORT, 10) === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });

  isEmailConfigured = true;
  console.log('✅ Email service configured using SMTP.');
};

// ── Base HTML template ──────────────────────────────────────────────────

const baseTemplate = (title, bodyContent) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f6f9;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f9;padding:40px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#4f46e5,#6366f1,#818cf8);padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:0.5px;">
                🔍 Smart Lost &amp; Found
              </h1>
              <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">
                University Lost &amp; Found Management System
              </p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              ${bodyContent}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color:#f9fafb;padding:24px 40px;text-align:center;border-top:1px solid #e5e7eb;">
              <p style="margin:0;color:#9ca3af;font-size:12px;">
                &copy; ${new Date().getFullYear()} Smart Lost &amp; Found. All rights reserved.
              </p>
              <p style="margin:8px 0 0;color:#9ca3af;font-size:12px;">
                This is an automated email. Please do not reply directly.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

// ── Button helper ───────────────────────────────────────────────────────

const buttonHtml = (text, url) => `
  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px auto;">
    <tr>
      <td style="border-radius:8px;background:linear-gradient(135deg,#4f46e5,#6366f1);">
        <a href="${url}" target="_blank"
           style="display:inline-block;padding:14px 32px;color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;letter-spacing:0.3px;">
          ${text}
        </a>
      </td>
    </tr>
  </table>`;

// ── Email Templates ─────────────────────────────────────────────────────

const templates = {
  // 1. Email Verification
  verification: (name, verificationUrl) =>
    baseTemplate(
      'Verify Your Email',
      `
      <h2 style="margin:0 0 16px;color:#1f2937;font-size:20px;">Welcome, ${name}! 👋</h2>
      <p style="color:#4b5563;font-size:15px;line-height:1.6;">
        Thank you for registering with Smart Lost &amp; Found. Please verify your email address to activate your account.
      </p>
      ${buttonHtml('Verify Email Address', verificationUrl)}
      <p style="color:#6b7280;font-size:13px;line-height:1.5;">
        This link will expire in <strong>24 hours</strong>. If you didn't create an account, you can safely ignore this email.
      </p>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />
      <p style="color:#9ca3af;font-size:12px;word-break:break-all;">
        If the button doesn't work, copy and paste this link:<br />
        <a href="${verificationUrl}" style="color:#4f46e5;">${verificationUrl}</a>
      </p>`
    ),

  // 2. Welcome (post-verification)
  welcome: (name) =>
    baseTemplate(
      'Welcome to Smart Lost & Found',
      `
      <h2 style="margin:0 0 16px;color:#1f2937;font-size:20px;">You're all set, ${name}! 🎉</h2>
      <p style="color:#4b5563;font-size:15px;line-height:1.6;">
        Your email has been verified and your account is now active. Here's what you can do:
      </p>
      <ul style="color:#4b5563;font-size:15px;line-height:2;padding-left:20px;">
        <li>📋 Report lost items with detailed descriptions</li>
        <li>📦 Register found items to help others</li>
        <li>🤖 Get AI-powered matching suggestions</li>
        <li>📩 Receive real-time notifications</li>
        <li>✅ Claim and recover your belongings</li>
      </ul>
      ${buttonHtml('Go to Dashboard', process.env.CLIENT_URL || 'http://localhost:5173')}
      <p style="color:#6b7280;font-size:13px;">We hope you find what you're looking for!</p>`
    ),

  // 3. Password Reset
  passwordReset: (name, resetUrl) =>
    baseTemplate(
      'Reset Your Password',
      `
      <h2 style="margin:0 0 16px;color:#1f2937;font-size:20px;">Password Reset Request 🔐</h2>
      <p style="color:#4b5563;font-size:15px;line-height:1.6;">
        Hi ${name}, we received a request to reset your password. Click the button below to create a new one.
      </p>
      ${buttonHtml('Reset Password', resetUrl)}
      <p style="color:#6b7280;font-size:13px;line-height:1.5;">
        This link will expire in <strong>1 hour</strong>. If you didn't request a password reset, please ignore this email or contact support if you're concerned about your account security.
      </p>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />
      <p style="color:#9ca3af;font-size:12px;word-break:break-all;">
        If the button doesn't work, copy and paste this link:<br />
        <a href="${resetUrl}" style="color:#4f46e5;">${resetUrl}</a>
      </p>`
    ),

  // 4. Match Found
  matchFound: (name, lostItemName, foundItemName, matchScore, matchUrl) =>
    baseTemplate(
      'Potential Match Found!',
      `
      <h2 style="margin:0 0 16px;color:#1f2937;font-size:20px;">Potential Match Found! 🎯</h2>
      <p style="color:#4b5563;font-size:15px;line-height:1.6;">
        Hi ${name}, great news! Our system found a potential match for your item.
      </p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
             style="background-color:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:20px;margin:16px 0;">
        <tr>
          <td>
            <p style="margin:0 0 8px;color:#166534;font-size:14px;font-weight:600;">Match Details:</p>
            <p style="margin:0 0 4px;color:#15803d;font-size:14px;">📋 Lost Item: <strong>${lostItemName}</strong></p>
            <p style="margin:0 0 4px;color:#15803d;font-size:14px;">📦 Found Item: <strong>${foundItemName}</strong></p>
            <p style="margin:0;color:#15803d;font-size:14px;">📊 Match Score: <strong>${matchScore}%</strong></p>
          </td>
        </tr>
      </table>
      ${buttonHtml('View Match Details', matchUrl)}
      <p style="color:#6b7280;font-size:13px;">
        Review the match and submit a claim if this is your item.
      </p>`
    ),

  // 5. Claim Approved
  claimApproved: (name, itemName, collectionDetails) =>
    baseTemplate(
      'Claim Approved!',
      `
      <h2 style="margin:0 0 16px;color:#1f2937;font-size:20px;">Claim Approved! ✅</h2>
      <p style="color:#4b5563;font-size:15px;line-height:1.6;">
        Hi ${name}, your claim for <strong>"${itemName}"</strong> has been approved.
      </p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
             style="background-color:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:20px;margin:16px 0;">
        <tr>
          <td>
            <p style="margin:0 0 8px;color:#1e40af;font-size:14px;font-weight:600;">Collection Information:</p>
            <p style="margin:0;color:#1d4ed8;font-size:14px;">${collectionDetails || 'Please visit the university Lost & Found office to collect your item. Bring a valid ID.'}</p>
          </td>
        </tr>
      </table>
      ${buttonHtml('View Details', process.env.CLIENT_URL || 'http://localhost:5173')}
      <p style="color:#6b7280;font-size:13px;">Congratulations on getting your item back!</p>`
    ),

  // 6. Claim Rejected
  claimRejected: (name, itemName, reason) =>
    baseTemplate(
      'Claim Update',
      `
      <h2 style="margin:0 0 16px;color:#1f2937;font-size:20px;">Claim Update ❌</h2>
      <p style="color:#4b5563;font-size:15px;line-height:1.6;">
        Hi ${name}, unfortunately your claim for <strong>"${itemName}"</strong> has been rejected.
      </p>
      ${
        reason
          ? `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
             style="background-color:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:20px;margin:16px 0;">
        <tr>
          <td>
            <p style="margin:0 0 8px;color:#991b1b;font-size:14px;font-weight:600;">Reason:</p>
            <p style="margin:0;color:#b91c1c;font-size:14px;">${reason}</p>
          </td>
        </tr>
      </table>`
          : ''
      }
      <p style="color:#4b5563;font-size:15px;line-height:1.6;">
        If you believe this was a mistake, you can submit a new claim with additional proof or contact the administration.
      </p>
      ${buttonHtml('Submit New Claim', process.env.CLIENT_URL || 'http://localhost:5173')}
      `
    ),

  // 7. Claim Received (to Founder)
  claimReceived: (name, itemName, claimantName) =>
    baseTemplate(
      'New Claim Request',
      `
      <h2 style="margin:0 0 16px;color:#1f2937;font-size:20px;">New Claim Request 🛡️</h2>
      <p style="color:#4b5563;font-size:15px;line-height:1.6;">
        Hi ${name}, <strong>${claimantName}</strong> has submitted a claim with proof for the item you found: <strong>"${itemName}"</strong>.
      </p>
      <p style="color:#4b5563;font-size:15px;line-height:1.6;">
        Please log in to your dashboard to review the proof and approve or reject the claim.
      </p>
      ${buttonHtml('Review Claim', process.env.CLIENT_URL || 'http://localhost:5173')}
      `
    ),

  // 8. Claim Approved (to Founder)
  claimApprovedFounder: (name, itemName, claimantDetails) =>
    baseTemplate(
      'Claim Approved - Contact Details',
      `
      <h2 style="margin:0 0 16px;color:#1f2937;font-size:20px;">Claim Approved! ✅</h2>
      <p style="color:#4b5563;font-size:15px;line-height:1.6;">
        Hi ${name}, you (or an administrator) have approved the claim for <strong>"${itemName}"</strong>.
      </p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
             style="background-color:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:20px;margin:16px 0;">
        <tr>
          <td>
            <p style="margin:0 0 8px;color:#1e40af;font-size:14px;font-weight:600;">Claimant Contact Information:</p>
            <pre style="margin:0;color:#1d4ed8;font-size:14px;font-family:inherit;white-space:pre-wrap;">${claimantDetails}</pre>
          </td>
        </tr>
      </table>
      <p style="color:#6b7280;font-size:13px;">Please contact them to coordinate returning the item.</p>
      `
    ),

  // 9. Account Suspended
  accountSuspended: (name, reason) =>
    baseTemplate(
      'Account Suspended',
      `
      <h2 style="margin:0 0 16px;color:#1f2937;font-size:20px;">Account Suspended 🚫</h2>
      <p style="color:#4b5563;font-size:15px;line-height:1.6;">
        Hi ${name}, your account on Smart Lost &amp; Found has been suspended due to <strong>${reason}</strong>.
      </p>
      <p style="color:#4b5563;font-size:15px;line-height:1.6;">
        If you believe this is an error, please contact the administration for an appeal.
      </p>
      ${buttonHtml('Contact Support', process.env.CLIENT_URL || 'http://localhost:5173')}
      `
    ),
};

// ── Send Email Function ─────────────────────────────────────────────────

/**
 * Send an email using a named template.
 *
 * @param {object} opts
 * @param {string} opts.to       - Recipient email address
 * @param {string} opts.template - Template name (verification, welcome, etc.)
 * @param {object} opts.data     - Template-specific data
 * @returns {Promise<boolean>} Whether the email was sent
 */
const sendEmail = async ({ to, template, data = {} }) => {
  // Build subject line based on template
    const subjects = {
      verification: '📧 Verify Your Email - Smart Lost & Found',
      welcome: '🎉 Welcome to Smart Lost & Found!',
      passwordReset: '🔐 Password Reset Request - Smart Lost & Found',
      matchFound: '🎯 Potential Match Found! - Smart Lost & Found',
      claimApproved: '✅ Claim Approved - Smart Lost & Found',
      claimRejected: '❌ Claim Update - Smart Lost & Found',
      claimReceived: '🛡️ New Claim Request - Smart Lost & Found',
      claimApprovedFounder: '✅ Claim Approved - Smart Lost & Found',
      accountSuspended: '🚫 Account Suspended - Smart Lost & Found',
    };

  const subject = subjects[template] || 'Smart Lost & Found Notification';

  // Generate HTML from template
  let html;
  try {
    switch (template) {
      case 'verification':
        html = templates.verification(data.name, data.verificationUrl);
        break;
      case 'welcome':
        html = templates.welcome(data.name);
        break;
      case 'passwordReset':
        html = templates.passwordReset(data.name, data.resetUrl);
        break;
      case 'matchFound':
        html = templates.matchFound(
          data.name,
          data.lostItemName,
          data.foundItemName,
          data.matchScore,
          data.matchUrl
        );
        break;
      case 'claimApproved':
        html = templates.claimApproved(data.name, data.itemName, data.collectionDetails);
        break;
      case 'claimRejected':
        html = templates.claimRejected(data.name, data.itemName, data.reason);
        break;
      default:
        console.warn(`⚠️  Unknown email template: ${template}`);
        return false;
    }
  } catch (err) {
    console.error(`❌ Email template error [${template}]: ${err.message}`);
    return false;
  }

  // Fallback: log to console if not configured
  if (!isEmailConfigured) {
    console.log('═══════════════════════════════════════════════');
    console.log(`📧 EMAIL (console fallback)`);
    console.log(`   To:       ${to}`);
    console.log(`   Subject:  ${subject}`);
    console.log(`   Template: ${template}`);
    console.log(`   Data:     ${JSON.stringify(data, null, 2)}`);
    console.log('═══════════════════════════════════════════════');
    return true; // Return true so the calling code continues normally
  }

  const { RESEND_API_KEY, EMAIL_FROM, EMAIL_FROM_NAME } = process.env;
  const fromName = EMAIL_FROM_NAME || 'Smart Lost & Found';
  const fromEmail = EMAIL_FROM || (RESEND_API_KEY ? 'onboarding@resend.dev' : process.env.SMTP_USER);

  // 1. Try sending via Resend API
  if (RESEND_API_KEY && RESEND_API_KEY !== 'your_resend_api_key') {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${RESEND_API_KEY}`
        },
        body: JSON.stringify({
          from: `"${fromName}" <${fromEmail}>`,
          to: [to],
          subject,
          html
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Resend API responded with ${response.status}: ${errText}`);
      }

      const resData = await response.json();
      console.log(`📧 Email sent via Resend API to ${to} [${template}]. ID: ${resData.id}`);
      return true;
    } catch (error) {
      console.error(`❌ Resend API send error [${template}] to ${to}: ${error.message}`);
      // Fallback to SMTP if available
      if (!transporter) return false;
    }
  }

  // 2. Try sending via SMTP
  if (transporter) {
    try {
      const mailOptions = {
        from: `"${fromName}" <${fromEmail}>`,
        to,
        subject,
        html,
      };

      await transporter.sendMail(mailOptions);
      console.log(`📧 Email sent via SMTP to ${to} [${template}]`);
      return true;
    } catch (error) {
      console.error(`❌ SMTP send error [${template}] to ${to}: ${error.message}`);
      return false;
    }
  }

  return false;
};

export { initEmailService, sendEmail };
