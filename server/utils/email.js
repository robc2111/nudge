// server/utils/email.js
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT ?? 587),
  secure: Number(process.env.SMTP_PORT) === 465, // true only for 465
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Optional: verify SMTP on boot
transporter.verify().then(() => {
  console.log('[email] SMTP connection verified');
}).catch((err) => {
  console.error('[email] SMTP verify failed:', err.message);
});

async function sendResetEmail({ to, resetUrl }) {
  console.log('[email] sending password reset:', { to, resetUrl });

  const fromName = process.env.SMTP_FROM_NAME || 'GoalCrumbs';
  const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER;
  const from = `${fromName} <${fromEmail}>`;

  const html = `
    <div style="font-family:system-ui,Segoe UI,Roboto,Helvetica,Arial">
      <h2>Reset your GoalCrumbs password</h2>
      <p>We received a request to reset your password.</p>
      <p>
        <a href="${resetUrl}" style="background:#bd661d;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none">
          Set a new password
        </a>
      </p>
      <p>If the button doesn't work, copy and paste this link into your browser:</p>
      <p style="word-break:break-all;">${resetUrl}</p>
      <p>This link will expire in 60 minutes. If you didn't request this, you can ignore this email.</p>
    </div>
  `;

  await transporter.sendMail({
    from,
    to,
    subject: 'Reset your GoalCrumbs password',
    html,
  });
}

module.exports = { sendResetEmail };