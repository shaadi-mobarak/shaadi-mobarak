// OTP delivery provider abstraction.
// Channel is email via SMTP (nodemailer). No provider is configured until the owner
// supplies SMTP credentials — until then requests return 503 and no code is ever
// returned in any API response. Test mode (OTP_TEST_MODE=test, never in production)
// records codes in an in-memory outbox so integration tests can verify the flow.
import nodemailer from 'nodemailer';

export const testOutbox = [];

export function isOtpConfigured() {
  if (process.env.OTP_TEST_MODE === 'test' && process.env.NODE_ENV !== 'production') return true;
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

export function otpChannel() {
  return isOtpConfigured() ? 'email' : null;
}

let transporter = null;
function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: String(process.env.SMTP_PORT) === '465',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return transporter;
}

export async function sendOtpCode({ to, code }) {
  if (process.env.OTP_TEST_MODE === 'test' && process.env.NODE_ENV !== 'production') {
    testOutbox.push({ to, code, at: new Date() });
    return;
  }
  if (!isOtpConfigured()) throw new Error('OTP delivery is not configured');
  await getTransporter().sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject: 'Shaadi Mobarak — OTP verification code',
    text: `Your Shaadi Mobarak verification code is ${code}. It expires in 10 minutes. Do not share it with anyone.`,
  });
}
