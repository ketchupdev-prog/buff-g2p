# Email (SMTP) – Buffr G2P Backend

**Purpose:** Configure and test SMTP for OTP, notifications, and transactional email.

---

## 1. Namecheap Private Email (current setup)

We use **Namecheap Private Email** for `ichigo@ketchup.cc`.

**SMTP settings:**

| Variable | Value | Description |
|----------|--------|-------------|
| `EMAIL_PROVIDER` | `smtp` | Use SMTP. |
| `SMTP_HOST` | `mail.privateemail.com` | Namecheap Private Email server. |
| `SMTP_PORT` | `587` | TLS/STARTTLS (use 465 for SSL and set `SMTP_SECURE=true`). |
| `SMTP_SECURE` | `false` | `false` for port 587, `true` for port 465. |
| `SMTP_USER` | `ichigo@ketchup.cc` | Full email address. |
| `SMTP_PASS` | (account password) | Private Email account password. |
| `SMTP_FROM_EMAIL` | `ichigo@ketchup.cc` | From address (same as user). |
| `FROM_NAME` | `Buffr G2P / Ketchup` | Display name in "From" header. |

**backend/.env (excerpt):**

```bash
EMAIL_PROVIDER=smtp
SMTP_HOST=mail.privateemail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=ichigo@ketchup.cc
SMTP_PASS=your_password
SMTP_FROM_EMAIL=ichigo@ketchup.cc
FROM_NAME=Buffr G2P / Ketchup
```

**Notes:**

- Outgoing authentication must be enabled (username + password).
- Encrypted connection required (587 with STARTTLS or 465 with SSL).
- Alternative server: `smtp.privateemail.com` if `mail.privateemail.com` is unavailable.

---

## 2. Env reference (all SMTP vars)

| Variable | Example | Description |
|----------|---------|-------------|
| `EMAIL_PROVIDER` | `smtp` | `smtp` \| `sendgrid` \| `resend`. |
| `SMTP_HOST` | `mail.privateemail.com` | SMTP server hostname. |
| `SMTP_PORT` | `587` | 587 (STARTTLS) or 465 (SSL). |
| `SMTP_SECURE` | `false` | `true` for 465, `false` for 587. |
| `SMTP_USER` | `ichigo@ketchup.cc` | Full email. |
| `SMTP_PASS` | (secret) | Account or app password. |
| `SMTP_FROM_EMAIL` | `ichigo@ketchup.cc` | From address. |
| `FROM_NAME` | `Buffr G2P / Ketchup` | From display name. |

---

## 3. Test send

From repo root:

```bash
node backend/scripts/send-test-email.mjs pendanek@gmail.com
```

Or to the same inbox:

```bash
node backend/scripts/send-test-email.mjs ichigo@ketchup.cc
```

Success: `Test email sent to … (messageId: …)`.

---

## 4. Other providers (reference)

**Gmail / Google Workspace:** `smtp.gmail.com`, port 587; use an **App Password** if 2FA is enabled.

**Microsoft 365:** `smtp.office365.com`, port 587; use Office 365 account credentials.

---

## 5. App usage

When `EMAIL_PROVIDER=smtp` and `SMTP_HOST` are set, **all** outgoing email uses SMTP (Namecheap Private Email):

- **OTP:** `POST /api/v1/mobile/auth/request-otp` with `channel: "email"` (and optional `email`) sends the verification code via SMTP using the OTP templates in `backend/src/lib/email.ts`.
- **Templates:** OTP (login, register, change_pin, reset_pin, verify_phone), welcome, transaction_alert, security_alert, account_verified, password_changed, login_alert; plus extended templates from `emailTemplates.ts` for money_received, money_sent, bill_payment, transaction_failed, refund_processed, voucher_*, loan_*, wallet_low_balance, group_*, pin_changed, device_added, KYC, account_suspended/reactivated, phone_verified, email_verified.
- **Notifications:** `backend/src/lib/notifications.ts` calls `sendEmail()` / `sendOtpEmail()` / `sendWelcomeEmail()` etc.; all go through `email.ts` and thus SMTP when configured.

No code change is needed beyond env; the same templates and notification triggers apply.
