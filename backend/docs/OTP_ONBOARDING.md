# OTP and onboarding – Buffr G2P Backend

**Purpose:** Get OTP working so users receive codes by **email** or **SMS** during onboarding (not only on screen).

---

## Why OTP only showed on screen

1. **DB function missing** – The backend calls `create_otp(...)` in Neon. If migrations have not been run, that function does not exist → `NeonDbError: function create_otp(unknown, unknown, unknown, unknown) does not exist`. On that error the backend still returns HTTP 200 and puts the code in the response as `devCode`, so the app shows it on screen but **no email or SMS is sent**.

2. **ON CONFLICT needs unique index** – `create_otp()` uses `INSERT ... ON CONFLICT (phone, purpose)` on `otp_rate_limits`. That requires a unique index on `(phone, purpose)`. Migration `004_otp_verification.sql` creates the table but did not add the index; `004b_otp_rate_limits_unique.sql` adds it.

3. **Delivery not configured** – Even after migrations, OTP is only sent if you configure:
   - **Email:** SMTP (see [EMAIL_SMTP.md](./EMAIL_SMTP.md)). User must choose “Email” and enter email on the onboarding screen; backend uses `sendOtpEmail()` when `channel === "email"`.
   - **SMS:** Twilio (or similar). Backend must be configured with credentials and the request-otp payload must use `channel: "sms"` (and the phone number).

---

## Fix: run migrations then configure delivery

### 1. Run migrations (Neon)

From repo root (with `DATABASE_URL` in `backend/.env`):

```bash
node backend/scripts/run-migrations.mjs
```

Or from `backend`:

```bash
npm run migrate
```

This runs all `.sql` files in `backend/migrations/` in order, including:

- **004_otp_verification.sql** – Creates `otp_codes`, `otp_rate_limits`, and functions `create_otp`, `verify_otp`, etc.
- **004b_otp_rate_limits_unique.sql** – Adds unique index on `(phone, purpose)` so `create_otp()`’s `ON CONFLICT` works.

After this, `create_otp` exists and rate-limiting inserts will succeed.

### 2. Configure email OTP (recommended for testing)

See **[EMAIL_SMTP.md](./EMAIL_SMTP.md)** for full SMTP setup. Summary:

- Set in `backend/.env`: `EMAIL_PROVIDER=smtp`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM_EMAIL`, `FROM_NAME`.
- In the app, during onboarding, user selects **Email** and enters their email.
- Backend endpoint `POST /api/v1/mobile/auth/request-otp` is called with `channel: "email"` (and optional `email`); backend calls `sendOtpEmail()` and the code is sent via SMTP.

Test SMTP:

```bash
node backend/scripts/send-test-email.mjs your@email.com
```

### 3. Configure SMS OTP (optional)

If you use Twilio (or another provider), configure the credentials in `backend/.env` and ensure the backend’s request-otp handler sends SMS when `channel === "sms"`. Implementation is in `backend/src/lib/otp.ts` and related server route.

---

## Summary

| Step | Action |
|------|--------|
| 1 | Run migrations: `node backend/scripts/run-migrations.mjs` (from repo root) so `create_otp` and the unique index exist. |
| 2 | Configure SMTP (see EMAIL_SMTP.md) so OTP can be sent by email when user chooses “Email” and enters email. |
| 3 | (Optional) Configure Twilio/SMS so OTP can be sent by SMS when user chooses “SMS”. |

After step 1, the “function create_otp does not exist” error goes away. After step 2 (and/or 3), users receive the OTP by email or SMS instead of only seeing it on screen.

---

## Test OTP email via API

With the server running (`npm run dev`) and SMTP configured, you can send a real OTP to an email:

```bash
curl -X POST http://localhost:3001/api/v1/mobile/auth/request-otp \
  -H "Content-Type: application/json" \
  -d '{"phone":"+264812345678","email":"recipient@example.com","channel":"email","purpose":"login"}'
```

Success: `{"success":true,"expiresIn":299,"message":"Verification code sent to email"}`. The 6-digit code is sent to `email` and expires in about 5 minutes.

- **Generic test email** (no OTP): `node backend/scripts/send-test-email.mjs recipient@example.com` (see [EMAIL_SMTP.md](./EMAIL_SMTP.md)).
