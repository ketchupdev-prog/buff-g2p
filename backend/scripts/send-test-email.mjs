#!/usr/bin/env node
/**
 * Send a test email via SMTP. Uses backend/.env:
 *   EMAIL_PROVIDER=smtp
 *   SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS
 *   SMTP_FROM_EMAIL, FROM_NAME (or SMTP_FROM_EMAIL only)
 * Run: node backend/scripts/send-test-email.mjs [email]
 * Default recipient: pendanek@gmail.com
 */
import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import nodemailer from "nodemailer";

const __dirname = dirname(fileURLToPath(import.meta.url));
const backend = resolve(__dirname, "..");
const root = resolve(__dirname, "../..");

config({ path: resolve(backend, ".env") });
config({ path: resolve(root, ".env") });

const to = process.argv[2] || "pendanek@gmail.com";

async function main() {
  const provider = process.env.EMAIL_PROVIDER || "sendgrid";
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const secure = process.env.SMTP_SECURE === "true";
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.FROM_EMAIL || "noreply@buffr.ai";
  const fromName = process.env.FROM_NAME || "Buffr G2P";

  if (provider !== "smtp" || !host) {
    console.log("SMTP not configured. Set in backend/.env:");
    console.log("  EMAIL_PROVIDER=smtp");
    console.log("  SMTP_HOST=... SMTP_PORT=587 SMTP_SECURE=false");
    console.log("  SMTP_USER=... SMTP_PASS=...");
    console.log("  SMTP_FROM_EMAIL=... (optional: FROM_NAME=...)");
    console.log("[DEV] Would have sent test email to " + to);
    process.exit(0);
    return;
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: user && pass ? { user, pass } : undefined,
  });

  const sent = await transporter.sendMail({
    from: fromName ? `"${fromName}" <${fromEmail}>` : fromEmail,
    to,
    subject: "Buffr G2P – Test Email",
    text: "This is a test email from the Buffr G2P backend. If you received this, SMTP delivery is working.\n\nSent at: " + new Date().toISOString(),
    html: "<p>This is a <strong>test email</strong> from the Buffr G2P backend.</p><p>If you received this, SMTP delivery is working.</p><p>Sent at: " + new Date().toISOString() + "</p>",
  });

  console.log("Test email sent to " + to + " (messageId: " + (sent.messageId || "n/a") + ")");
}

main().catch((err) => {
  console.error("SMTP error:", err.message || err);
  process.exit(1);
});
