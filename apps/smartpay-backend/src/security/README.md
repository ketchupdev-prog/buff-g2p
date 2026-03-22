# SmartPay Security Module

**🔒 PSD-12 Compliance Security Suite**

Complete security implementation for the SmartPay fintech platform.

> **📚 Full Documentation:** For complete implementation guide, architecture, testing, and deployment instructions, see:  
> [`docs/guides/security/security-implementation.md`](../../../../docs/guides/security/security-implementation.md)
>
> This README provides quick API reference. For comprehensive documentation, always refer to the canonical guide above.

## API base paths

- **Canonical:** `/api/v1/security/fraud`, `/api/v1/security/auth`, `/api/v1/security/audit`, `/api/v1/security/payments` (same handlers as the legacy roots below). See [`docs/API_ROUTING.md`](../docs/API_ROUTING.md).
- **Legacy (deprecated):** `/api/fraud`, `/api/auth`, `/api/audit`, `/api/payments` — responses include `Deprecation` and related headers when mounted from `src/index.ts`.

**Note:** Mobile OTP lives at **`/api/v1/auth`** (`routes/auth.ts`). **`/api/auth`** is the PSD-12 security / 2FA API, not mobile login.

## Quick Start

```typescript
import express from 'express';
import { setupSecurityRoutes } from './security';

const app = express();
app.use(express.json());

// Mount all security routes
setupSecurityRoutes(app);

app.listen(4000);
```

## API Endpoints

### Fraud Detection API (`/api/fraud`)

#### `POST /api/fraud/check-payment`
Check payment for fraud indicators.

**Request:**
```json
{
  "paymentId": "pay_123",
  "userId": "user_456",
  "amount": 1000,
  "currency": "NAD",
  "paymentType": "CARD",
  "paymentMethod": "CARD_NOT_PRESENT",
  "deviceId": "device_789",
  "ipAddress": "192.168.1.100"
}
```

**Response:**
```json
{
  "allowed": true,
  "blocked": false,
  "requiresReview": false,
  "requiresStepUpAuth": false,
  "riskScore": 15,
  "riskLevel": "LOW",
  "rulesTriggered": [],
  "fraudIndicators": [],
  "actionTaken": "ALLOWED"
}
```

#### `GET /api/fraud/rules`
Get all active fraud detection rules.

#### `POST /api/fraud/rules`
Create or update fraud detection rule (admin only).

#### `GET /api/fraud/stats`
Get fraud detection statistics.

### Authentication API (`/api/auth`)

#### `POST /api/auth/verify-2fa-session`
Verify if user has valid 2FA session for payment operations.

**Request:**
```json
{
  "user_id": "user_123"
}
```

**Response:**
```json
{
  "verified": true,
  "method": "SMS_OTP",
  "verifiedAt": "2026-03-18T10:30:00Z",
  "expiresAt": "2026-03-18T10:35:00Z"
}
```

#### `POST /api/auth/verify-2fa`
Verify 2FA code and create session.

**Request:**
```json
{
  "userId": "user_123",
  "otpId": "otp_abc",
  "otpCode": "123456",
  "method": "SMS_OTP",
  "purpose": "PAYMENT"
}
```

#### `POST /api/auth/request-otp`
Request OTP for 2FA.

**Request:**
```json
{
  "userId": "user_123",
  "phoneNumber": "+264812345678",
  "purpose": "PAYMENT"
}
```

#### `POST /api/auth/setup-totp`
Setup TOTP authenticator app.

**Request:**
```json
{
  "userId": "user_123",
  "userEmail": "user@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "secret": "JBSWY3DPEHPK3PXP",
  "qrCodeUrl": "data:image/png;base64,...",
  "backupCodes": ["ABC12345", "DEF67890", ...]
}
```

#### `GET /api/auth/2fa-status/:userId`
Check if user has 2FA enabled.

### Audit Logging API (`/api/audit`)

#### `POST /api/audit/log`
Log audit event to database.

**Request:**
```json
{
  "timestamp": "2026-03-18T10:30:00Z",
  "event_type": "TWO_FACTOR_AUTH_SUCCESS",
  "user_id": "user_123",
  "event_data": {
    "success": true,
    "method": "SMS_OTP"
  },
  "ip_address": "192.168.1.100",
  "user_agent": "Mozilla/5.0...",
  "severity": "INFO",
  "source": "python_backend"
}
```

#### `GET /api/audit/logs`
Query audit logs with filtering.

**Query Parameters:**
- `user_id`: Filter by user ID
- `event_type`: Filter by event type
- `severity`: Filter by severity (INFO, WARNING, ERROR, CRITICAL)
- `start_date`: Filter by start date
- `end_date`: Filter by end date
- `limit`: Number of results (default: 100, max: 1000)
- `offset`: Pagination offset

#### `GET /api/audit/security-events`
Get security events (high-severity only).

#### `GET /api/audit/compliance-report`
Generate compliance report for PSD-12 audit.

### Payment API (`/api/payments`)

#### `POST /api/payments/initiate`
Initiate a payment transaction (requires 2FA).

**Request:**
```json
{
  "amount": 1000,
  "currency": "NAD",
  "recipientId": "user_456",
  "paymentType": "CARD",
  "paymentMethod": "CARD_NOT_PRESENT"
}
```

#### `POST /api/payments/verify-2fa`
Verify 2FA for payment.

#### `POST /api/payments/request-otp`
Request OTP for payment 2FA.

#### `POST /api/payments/tokenize-card`
Tokenize card number (PSD-12 Section 12.1).

**Request:**
```json
{
  "cardNumber": "4111111111111111"
}
```

**Response:**
```json
{
  "success": true,
  "token": "tok_abc123...",
  "maskedCard": "****1111"
}
```

## Services

### Fraud Detection Service

```typescript
import { fraudDetectionService } from './security';

const result = await fraudDetectionService.checkPayment({
  paymentId: 'pay_123',
  userId: 'user_456',
  amount: 15000,
  currency: 'NAD',
  paymentType: 'CARD',
  paymentMethod: 'CARD_NOT_PRESENT',
  deviceId: 'device_789',
  ipAddress: '192.168.1.100',
});

if (result.blocked) {
  console.log('Payment blocked:', result.blockReason);
} else if (result.requiresStepUpAuth) {
  console.log('Additional authentication required');
} else {
  console.log('Payment allowed');
}
```

### Two-Factor Auth Service

```typescript
import { twoFactorAuthService } from './security';

// Send OTP
const otpResult = await twoFactorAuthService.sendSMSOTP(
  'user_123',
  '+264812345678',
  'PAYMENT'
);

// Verify OTP
const verifyResult = await twoFactorAuthService.verifySMSOTP(
  'user_123',
  otpResult.otpId,
  '123456',
  'PAYMENT'
);

// Check if 2FA enabled
const is2FAEnabled = await twoFactorAuthService.is2FAEnabled('user_123');
```

### Encryption Service

```typescript
import { encryptionService } from './security';

// Tokenize card number
const { token, maskedValue } = encryptionService.tokenizeCardNumber(
  '4111111111111111',
  true
);

// Encrypt sensitive data
const encrypted = encryptionService.encryptValue('sensitive data');
const decrypted = encryptionService.decryptValue(encrypted);

// Mask value
const masked = encryptionService.maskValue('1234567890', 'PHONE');
// Result: "******7890"
```

## Middleware

### Require 2FA Middleware

```typescript
import express from 'express';
import { require2FAForPayment, check2FAEnabled } from './security/middleware/require2FA';

const app = express();

// Protect payment endpoint
app.post(
  '/api/payments/send',
  authenticateUser,           // Your auth middleware
  check2FAEnabled,            // Check if 2FA is enabled
  require2FAForPayment,       // Require 2FA verification
  async (req, res) => {
    // Process payment
    // This code only runs if all middleware passes
  }
);
```

## PSD-12 Compliance

### Section 12.2: Two-Factor Authentication
✅ 2FA required for EVERY payment  
✅ Multiple methods supported (SMS, TOTP, Biometric)  
✅ 5-minute session validity  

### Section 11.6: Fraud Monitoring
✅ ALL payments monitored for fraud  
✅ 10 fraud detection rules  
✅ Real-time risk scoring (0-100)  
✅ Behavioral analytics  

### Section 11.13: Audit Trail
✅ Comprehensive audit logging  
✅ Structured JSON format  
✅ Queryable logs with filtering  
✅ Critical event tracking  

### Section 12.1: Encryption/Tokenization
✅ Card tokenization  
✅ Data encryption at rest  
✅ TLS for data in transit  

## Environment Variables

```bash
# Node.js Backend (.env)
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+264812345678
DATABASE_URL=postgresql://user:password@localhost:5432/smartpay
REDIS_URL=redis://localhost:6379

# Python Backend (.env)
SMARTPAY_API_BASE_URL=http://localhost:4000
DATABASE_URL=postgresql://user:password@localhost:5432/smartpay
REDIS_URL=redis://localhost:6379
AUDIT_LOG_TO_FILE=true
AUDIT_LOG_FILE=/var/log/smartpay/audit.log
TWOFA_TIMEOUT_SECONDS=300
```

## Testing

```bash
# Test 2FA verification
curl -X POST http://localhost:4000/api/auth/request-otp \
  -H "Content-Type: application/json" \
  -d '{"userId": "user_123", "phoneNumber": "+264812345678"}'

# Test fraud detection
curl -X POST http://localhost:4000/api/fraud/check-payment \
  -H "Content-Type: application/json" \
  -d '{
    "paymentId": "pay_123",
    "userId": "user_456",
    "amount": 50000,
    "currency": "NAD",
    "paymentType": "CARD",
    "paymentMethod": "CARD_NOT_PRESENT"
  }'

# Test audit logging
curl -X POST http://localhost:4000/api/audit/log \
  -H "Content-Type: application/json" \
  -d '{
    "timestamp": "2026-03-18T10:30:00Z",
    "event_type": "TEST_EVENT",
    "user_id": "user_123",
    "severity": "INFO"
  }'
```

## License

Proprietary - SmartPay Namibia
