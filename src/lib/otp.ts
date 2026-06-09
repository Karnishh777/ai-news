import "server-only";
import { env } from "./env";

// ─────────────────────────────────────────────────────────────
// Email OTP
//
// Delivery strategy (first match wins):
//   1. RESEND_API_KEY set      -> send via Resend HTTP API (serverless-safe)
//   2. SMTP_HOST + SMTP_USER   -> send via SMTP (see deliverViaSmtp)
//   3. nothing configured      -> "demo mode": the code is logged and
//                                 returned to the client so signup still works
//
// Resend is recommended on Netlify/Vercel because outbound SMTP ports are
// commonly blocked on serverless platforms, while HTTPS always works.
// ─────────────────────────────────────────────────────────────

export const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
export const MAX_OTP_ATTEMPTS = 5;

const fromAddress = () => env("EMAIL_FROM") || "NewsFlow AI <onboarding@resend.dev>";

export function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function hasEmailProvider(): boolean {
  return Boolean(env("RESEND_API_KEY") || (env("SMTP_HOST") && env("SMTP_USER")));
}

export async function sendOtpEmail(email: string, code: string): Promise<void> {
  const subject = "Your NewsFlow AI verification code";

  if (env("RESEND_API_KEY")) {
    await deliverViaResend(email, subject, code);
    return;
  }
  if (env("SMTP_HOST") && env("SMTP_USER")) {
    await deliverViaSmtp(email, subject, code);
    return;
  }

  // Demo mode: no provider configured.
  console.info(`\n📧  OTP for ${email}: ${code}  (expires in 10m)\n`);
}

async function deliverViaResend(to: string, subject: string, code: string): Promise<void> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env("RESEND_API_KEY")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromAddress(),
      to: [to],
      subject,
      html: otpEmailHtml(code),
      text: `Your NewsFlow AI verification code is ${code}. It expires in 10 minutes. If you didn't request this, ignore this email.`,
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error(`[otp] Resend ${res.status}: ${detail}`);
    throw new Error(`Resend ${res.status}: ${detail}`);
  }
}

async function deliverViaSmtp(to: string, subject: string, code: string): Promise<void> {
  // Integration point for nodemailer / SES. Install `nodemailer` and uncomment:
  //   const nodemailer = (await import("nodemailer")).default;
  //   const transporter = nodemailer.createTransport({
  //     host: process.env.SMTP_HOST,
  //     port: Number(process.env.SMTP_PORT ?? 587),
  //     auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  //   });
  //   await transporter.sendMail({ to, from: FROM, subject, html: otpEmailHtml(code) });
  console.info(`[smtp] would send "${subject}" to ${to} (code ${code})`);
}

function otpEmailHtml(code: string): string {
  return `
  <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#0b1020;border-radius:16px;color:#e8ecf5">
    <h1 style="margin:0 0 8px;font-size:20px">NewsFlow <span style="color:#8b5cf6">AI</span></h1>
    <p style="color:#9aa3b8;margin:0 0 24px">Verify your email to finish creating your account.</p>
    <div style="background:#151b30;border:1px solid #232a44;border-radius:12px;padding:24px;text-align:center">
      <div style="font-size:36px;letter-spacing:10px;font-weight:800;color:#fff">${code}</div>
    </div>
    <p style="color:#9aa3b8;font-size:13px;margin:24px 0 0">This code expires in 10 minutes. If you didn't request it, you can ignore this email.</p>
  </div>`;
}

/**
 * Whether to echo the OTP in the API response. Always in development, and in
 * production ONLY when no email provider is configured (demo mode), so signup
 * remains usable. Configure RESEND_API_KEY to disable this automatically.
 */
export function exposeOtpInResponse(): boolean {
  return process.env.NODE_ENV !== "production" || !hasEmailProvider();
}
