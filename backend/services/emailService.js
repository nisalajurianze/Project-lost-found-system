import crypto from 'node:crypto';
import nodemailer from 'nodemailer';

const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, (character) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  "'": '&#39;',
  '"': '&quot;',
}[character]));

const safeUrl = (value) => {
  try {
    const url = new URL(String(value));
    if (!['https:', 'http:'].includes(url.protocol)) throw new Error('Unsupported protocol');
    return escapeHtml(url.toString());
  } catch {
    return '#';
  }
};

const shell = (title, body) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title></head>
<body style="margin:0;background:#f4f6fb;font-family:Arial,sans-serif;color:#1f2937">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:32px 12px;background:#f4f6fb"><tr><td align="center">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#fff;border-radius:14px;overflow:hidden">
<tr><td style="padding:26px 30px;background:#4338ca;color:#fff"><h1 style="font-size:23px;margin:0">Smart Lost &amp; Found</h1></td></tr>
<tr><td style="padding:30px"><h2 style="margin-top:0">${escapeHtml(title)}</h2>${body}
<p style="color:#64748b;font-size:12px;margin-top:30px">This is an automated security-conscious notification. Never email passwords or private proof documents.</p></td></tr>
</table></td></tr></table></body></html>`;

const button = (label, url) => `<p style="margin:24px 0"><a href="${safeUrl(url)}" style="display:inline-block;padding:12px 18px;background:#4f46e5;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">${escapeHtml(label)}</a></p>`;

const emailTemplates = {
  verification: (data) => ({
    subject: 'Verify your Smart Lost & Found account',
    html: shell('Verify your email', `<p>Hello ${escapeHtml(data.name)},</p><p>Verify your email address to activate your account.</p>${button('Verify email', data.url || data.verificationUrl)}<p>This link expires in 24 hours.</p>`),
  }),
  welcome: (data) => ({
    subject: 'Welcome to Smart Lost & Found',
    html: shell('Welcome', `<p>Hello ${escapeHtml(data.name)}. Your account is ready.</p>`),
  }),
  passwordReset: (data) => ({
    subject: 'Reset your Smart Lost & Found password',
    html: shell('Password reset', `<p>Hello ${escapeHtml(data.name)},</p><p>A password reset was requested for your account.</p>${button('Reset password', data.url || data.resetUrl)}<p>This link expires in one hour. Ignore this message if you did not request it.</p>`),
  }),
  matchFound: (data) => ({
    subject: `Potential match: ${String(data.itemName || 'item')}`,
    html: shell('Potential match found', `<p>A report may match <strong>${escapeHtml(data.itemName)}</strong>${data.score !== undefined ? ` with a current similarity score of <strong>${escapeHtml(data.score)}%</strong>` : ''}.</p><p>Similarity is not proof of ownership. Review the reports and use the secure claim workflow.</p>${button('Review match', data.url || data.matchUrl)}`),
  }),
  claimReceived: (data) => ({
    subject: `New claim for ${String(data.itemName || 'item')}`,
    html: shell('New claim received', `<p>Hello ${escapeHtml(data.name)},</p><p>A claim was submitted for <strong>${escapeHtml(data.itemName)}</strong>. Sign in to review the evidence securely.</p>${button('Review claim', data.url)}`),
  }),
  claimApproved: (data) => ({
    subject: `Claim approved: ${String(data.itemName || 'item')}`,
    html: shell('Claim approved', `<p>Hello ${escapeHtml(data.name)},</p><p>Your claim for <strong>${escapeHtml(data.itemName)}</strong> was approved.</p><p>${escapeHtml(data.message || 'Use the secure dashboard to arrange the handover.')}</p>${button('Open claim', data.url)}`),
  }),
  claimApprovedReporter: (data) => ({
    subject: `Claim approved: ${String(data.itemName || 'item')}`,
    html: shell('Handover in progress', `<p>Hello ${escapeHtml(data.name)},</p><p>The claim for <strong>${escapeHtml(data.itemName)}</strong> was approved.</p>${button('Open claim', data.url)}`),
  }),
  claimRejected: (data) => ({
    subject: `Claim update: ${String(data.itemName || 'item')}`,
    html: shell('Claim rejected', `<p>Hello ${escapeHtml(data.name)},</p><p>The claim for <strong>${escapeHtml(data.itemName)}</strong> was rejected.</p><p>${escapeHtml(data.reason || 'The submitted evidence was not sufficient.')}</p>`),
  }),
  contactShared: (data) => ({
    subject: `Contact shared for ${String(data.itemName || 'item')}`,
    html: shell('Contact access granted', `<p>Hello ${escapeHtml(data.name)},</p><p>The reporter shared contact access for <strong>${escapeHtml(data.itemName)}</strong>. View the details only inside the authenticated dashboard.</p>${button('Open claim', data.url)}`),
  }),
  accountSuspended: (data) => ({
    subject: 'Smart Lost & Found account status',
    html: shell('Account deactivated', `<p>Hello ${escapeHtml(data.name)},</p><p>Your account was deactivated by an administrator.</p><p>${escapeHtml(data.reason || '')}</p>`),
  }),
  resolutionReminder: (data) => ({
    subject: `Confirm handover: ${String(data.itemName || 'item')}`,
    html: shell('Confirm item handover', `<p>Hello ${escapeHtml(data.name || 'there')},</p><p>Please confirm whether <strong>${escapeHtml(data.itemName)}</strong> was handed over successfully.</p>${button('Verify resolution', data.url)}`),
  }),
};

let smtpTransporter = null;
let provider = 'none';

const initEmailService = () => {
  smtpTransporter = null;
  provider = 'none';

  if (process.env.RESEND_API_KEY && !process.env.RESEND_API_KEY.startsWith('your_')) {
    provider = 'resend';
    console.log('[email] Resend provider configured.');
    return true;
  }

  const host = process.env.SMTP_HOST || process.env.EMAIL_HOST;
  const port = Number(process.env.SMTP_PORT || process.env.EMAIL_PORT || 587);
  const user = process.env.SMTP_USER || process.env.EMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.EMAIL_PASSWORD;
  if (host && user && pass) {
    smtpTransporter = nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } });
    provider = 'smtp';
    console.log('[email] SMTP provider configured.');
    return true;
  } else {
    console.warn('[email] No provider configured. Delivery attempts will fail closed without logging message secrets.');
    return false;
  }
};

const isEmailConfigured = () => provider !== 'none';

const getFromAddress = () => {
  const configured = process.env.EMAIL_FROM;
  if (configured) return configured;
  const address = process.env.SMTP_USER || 'noreply@example.invalid';
  return `Smart Lost & Found <${address}>`;
};

const sendViaResend = async ({ to, subject, html, idempotencyKey }) => {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
      ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey.slice(0, 256) } : {}),
    },
    body: JSON.stringify({ from: getFromAddress(), to: [to], subject, html }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Resend delivery failed (${response.status})${detail ? `: ${detail.slice(0, 200)}` : ''}`);
  }
};

const sendEmail = async ({ to, template, data = {}, idempotencyKey }) => {
  const render = emailTemplates[template];
  if (!render) throw new Error(`Unsupported email template: ${template}`);
  if (!to || !String(to).includes('@')) throw new Error('A valid recipient email is required.');

  if (provider === 'none') {
    console.warn('[email] delivery skipped: provider not configured', {
      template,
      recipientDomain: String(to).split('@')[1] || 'invalid',
    });
    return false;
  }

  const message = render(data);
  const stableKey = idempotencyKey || (data.eventId
    ? crypto.createHash('sha256').update(`${template}:${data.eventId}:${to}`).digest('hex')
    : undefined);

  if (provider === 'resend') {
    await sendViaResend({ to, ...message, idempotencyKey: stableKey });
  } else {
    await smtpTransporter.sendMail({ from: getFromAddress(), to, ...message });
  }
  return true;
};

export { initEmailService, isEmailConfigured, sendEmail, emailTemplates };
