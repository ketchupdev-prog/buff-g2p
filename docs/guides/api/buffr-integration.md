# Buffr Connect API Reference

**Version:** 1.0  
**Last Updated:** March 17, 2026  
**Status:** Consolidated API Documentation  
**Purpose:** Complete API reference for Buffr Connect integration

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Base URLs](#base-urls)
4. [Current Endpoints](#current-endpoints)
5. [Expected Endpoints](#expected-endpoints)
6. [Data Models](#data-models)
7. [Error Handling](#error-handling)
8. [Webhooks](#webhooks)
9. [Rate Limiting](#rate-limiting)
10. [Code Examples](#code-examples)
11. [Testing Guide](#testing-guide)

---

## Overview

### Architecture

**Framework:** Next.js 16.0.1 with App Router  
**Pattern:** RESTful API with JSON payloads  
**Language:** TypeScript  
**Database:** PostgreSQL (Neon Serverless)  
**Authentication:** Stack Auth (planned) + API Keys for partners

### API Versioning

```
Current:  /api/{resource}
Expected: /api/v1/{resource}
```

### Content Type

All requests and responses use `application/json`.

---

## Authentication

### User Authentication (JWT Bearer Tokens)

**Headers:**
```http
Authorization: Bearer <jwt_access_token>
Content-Type: application/json
```

**Token Lifecycle:**
- Access tokens: 1-hour expiry
- Refresh tokens: 30-day expiry
- Stored securely in client (expo-secure-store for mobile)

**Example:**
```typescript
const response = await fetch('https://buffr.ai/api/v1/wallet/balance', {
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  },
});
```

### Partner API Authentication (API Keys)

**For Agent/Merchant integrations:**

**Headers:**
```http
X-API-Key: <partner_api_key>
X-Request-ID: <unique_request_id>
Content-Type: application/json
```

**API Key Formats:**
- Master Key: `sk_live_smartpay_****` or `sk_test_smartpay_****`
- Agent Key: `agt_api_****`
- Merchant Key: `mch_api_****`

**Example:**
```typescript
const response = await fetch('https://buffr.ai/api/v1/partners/agents/transactions', {
  method: 'POST',
  headers: {
    'X-API-Key': 'agt_api_1a2b3c4d5e****',
    'X-Request-ID': crypto.randomUUID(),
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    agent_id: 'agt_1a2b3c4d5e',
    transaction_type: 'cash_out',
    amount: 500.00,
    confirmation_code: '1234',
  }),
});
```

### Webhook Authentication (HMAC Signatures)

**Header:**
```http
X-Buffr-Signature: t=<timestamp>,v1=<signature>
```

**Verification (Node.js):**
```javascript
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
  const parts = signature.split(',');
  const timestamp = parts[0].split('=')[1];
  const sig = parts[1].split('=')[1];
  
  const signedPayload = `${timestamp}.${JSON.stringify(payload)}`;
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(sig),
    Buffer.from(expectedSignature)
  );
}
```

---

## Base URLs

### Production
```
API Base URL: https://buffr.ai/api/v1
Webhooks: https://buffr.ai/webhooks
```

### Sandbox
```
API Base URL: https://sandbox.buffr.ai/api/v1
Webhooks: https://sandbox.buffr.ai/webhooks
```

### Local Development
```
API Base URL: http://localhost:3000/api
```

---

## Current Endpoints

### Waitlist Management

#### Join Waitlist

**Status:** ✅ Active and functional

**Endpoint:** `POST /api/join-waitlist`

**Description:** Add email to pre-launch waitlist

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response (Success - 200 OK):**
```json
{
  "message": "Successfully joined the waitlist!"
}
```

**Response (Duplicate - 200 OK):**
```json
{
  "message": "You are already on the waitlist."
}
```

**Response (Error - 500):**
```json
{
  "error": "Failed to join waitlist"
}
```

**Implementation Details:**
- Direct PostgreSQL query using `pg` package
- Handles unique constraint violation (duplicate emails)
- No authentication required (public endpoint)
- No rate limiting (should be added for production)

**Database Schema:**
```sql
CREATE TABLE waitlist (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Example cURL:**
```bash
curl -X POST https://buffr.ai/api/join-waitlist \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
```

---

## Expected Endpoints

### Agent Operations (Priority for Smartpay)

#### 1. Register Agent

**Endpoint:** `POST /api/v1/partners/agents/register`

**Authentication:** Master API Key (Partner level)

**Request:**
```typescript
{
  business_name: string;
  business_registration_number: string;
  owner_name: string;
  owner_id_number: string;
  phone: string;
  email: string;
  address: {
    street: string;
    city: string;
    region: string;
    postal_code: string;
    country: string;
  };
  location: {
    lat: number;
    lng: number;
  };
  services: Array<'cash_in' | 'cash_out' | 'voucher_redemption' | 'bill_payment'>;
}
```

**Response (201 Created):**
```typescript
{
  success: true;
  agent_id: string;
  api_key: string;
  api_secret: string;
  status: 'pending_verification' | 'active';
  verification_documents_required: string[];
}
```

#### 2. Process Cash-Out Transaction

**Endpoint:** `POST /api/v1/partners/agents/transactions`

**Authentication:** Agent API Key

**Request:**
```typescript
{
  agent_id: string;
  transaction_type: 'cash_out' | 'cash_in';
  customer_phone: string;
  amount: number;
  currency: string;
  confirmation_code: string;
}
```

**Response (200 OK):**
```typescript
{
  success: true;
  transaction_id: string;
  status: 'completed' | 'pending' | 'failed';
  amount: number;
  fee: number;
  agent_commission: number;
  customer_receives: number;
  receipt_url: string;
  timestamp: string;
}
```

**Error Responses:**
```typescript
// 400 - Invalid confirmation code
{
  success: false;
  error: {
    code: 'INVALID_CODE',
    message: 'The confirmation code is invalid or expired'
  }
}

// 402 - Insufficient balance
{
  success: false;
  error: {
    code: 'INSUFFICIENT_BALANCE',
    message: 'Customer has insufficient balance for this transaction'
  }
}

// 403 - Agent not active
{
  success: false;
  error: {
    code: 'AGENT_INACTIVE',
    message: 'Agent account is not active'
  }
}
```

#### 3. Get Nearby Agents

**Endpoint:** `GET /api/v1/agents/nearby`

**Authentication:** JWT Bearer Token (User)

**Query Parameters:**
```typescript
{
  lat: number;          // User's latitude
  lng: number;          // User's longitude
  radius?: number;      // Search radius in km (default: 5)
  limit?: number;       // Max results (default: 10)
  minCash?: number;     // Minimum available cash
  services?: string;    // Comma-separated: 'cash_out,voucher_redemption'
}
```

**Response (200 OK):**
```typescript
{
  success: true;
  agents: Array<{
    id: string;
    name: string;
    phone: string;
    location: {
      address: string;
      lat: number;
      lng: number;
      distance: number;  // km from user
    };
    availableCash: number;
    rating: number;
    totalTransactions: number;
    isOpen: boolean;
    workingHours: {
      open: string;   // "08:00"
      close: string;  // "18:00"
      days: string[]; // ["Mon", "Tue", ...]
    };
    services: string[];
  }>;
  count: number;
  timestamp: string;
}
```

#### 4. Get Agent Balance

**Endpoint:** `GET /api/v1/partners/agents/{agent_id}/balance`

**Authentication:** Agent API Key

**Response (200 OK):**
```typescript
{
  success: true;
  agent_id: string;
  balance_available: number;
  balance_pending: number;
  balance_total: number;
  currency: string;
  last_updated: string;
  next_settlement: string;
}
```

#### 5. Get Agent Transactions

**Endpoint:** `GET /api/v1/partners/agents/{agent_id}/transactions`

**Authentication:** Agent API Key

**Query Parameters:**
```typescript
{
  from_date?: string;   // ISO 8601 (2026-03-01T00:00:00Z)
  to_date?: string;     // ISO 8601
  status?: string;      // completed, pending, failed
  type?: string;        // cash_out, cash_in, voucher
  limit?: number;       // Default: 50, Max: 100
  offset?: number;      // Pagination offset
}
```

**Response (200 OK):**
```typescript
{
  success: true;
  transactions: Array<{
    transaction_id: string;
    type: string;
    amount: number;
    fee: number;
    commission: number;
    status: string;
    customer_phone: string;
    timestamp: string;
    receipt_url: string;
  }>;
  pagination: {
    total: number;
    limit: number;
    offset: number;
    has_more: boolean;
  };
}
```

### User Wallet Operations

#### 1. Get Wallet Balance

**Endpoint:** `GET /api/v1/wallet/balance`

**Authentication:** JWT Bearer Token

**Response (200 OK):**
```typescript
{
  success: true;
  balance: number;
  available_balance: number;
  pending_balance: number;
  currency: string;
  last_transaction: {
    id: string;
    amount: number;
    timestamp: string;
  } | null;
}
```

#### 2. Get Transaction History

**Endpoint:** `GET /api/v1/transactions`

**Authentication:** JWT Bearer Token

**Query Parameters:**
```typescript
{
  from_date?: string;
  to_date?: string;
  type?: string;        // sent, received, payment, cash_out
  status?: string;      // completed, pending, failed
  limit?: number;
  offset?: number;
}
```

**Response (200 OK):**
```typescript
{
  success: true;
  transactions: Array<{
    id: string;
    type: 'sent' | 'received' | 'payment' | 'cash_out';
    amount: number;
    currency: string;
    fee: number;
    description: string;
    status: 'pending' | 'completed' | 'failed';
    recipient_name?: string;
    sender_name?: string;
    timestamp: string;
    receipt_url?: string;
  }>;
  pagination: {
    total: number;
    has_more: boolean;
  };
}
```

### Voucher Operations

#### 1. Redeem Voucher at Agent

**Endpoint:** `POST /api/v1/vouchers/cash-out`

**Authentication:** Agent API Key

**Request:**
```typescript
{
  voucher_code: string;
  agent_id: string;
  beneficiary_phone: string;
  beneficiary_id_number?: string;
}
```

**Response (200 OK):**
```typescript
{
  success: true;
  voucher_id: string;
  amount: number;
  currency: string;
  agent_commission: number;
  beneficiary_receives: number;
  transaction_id: string;
  receipt_url: string;
  issued_by: string;
  program_name: string;
}
```

**Error Responses:**
```typescript
// 404 - Voucher not found
{
  success: false;
  error: {
    code: 'VOUCHER_NOT_FOUND',
    message: 'Voucher code is invalid or does not exist'
  }
}

// 410 - Voucher already redeemed
{
  success: false;
  error: {
    code: 'VOUCHER_ALREADY_REDEEMED',
    message: 'This voucher has already been redeemed',
    redeemed_at: '2026-03-15T10:30:00Z',
    redeemed_by: 'agt_xyz123'
  }
}

// 410 - Voucher expired
{
  success: false;
  error: {
    code: 'VOUCHER_EXPIRED',
    message: 'This voucher has expired',
    expiry_date: '2026-03-01T23:59:59Z'
  }
}
```

#### 2. Check Voucher Status

**Endpoint:** `GET /api/v1/vouchers/{voucher_code}/status`

**Authentication:** Agent API Key or User JWT

**Response (200 OK):**
```typescript
{
  success: true;
  voucher_code: string;
  status: 'valid' | 'redeemed' | 'expired' | 'cancelled';
  amount: number;
  currency: string;
  issued_date: string;
  expiry_date: string;
  beneficiary_phone: string;
  program_name: string;
  redemption_info?: {
    redeemed_at: string;
    redeemed_by: string;
    agent_name: string;
  };
}
```

---

## Data Models

### User

```typescript
interface User {
  user_id: string;
  phone: string;
  email?: string;
  full_name?: string;
  kyc_level: 0 | 1 | 2 | 3;  // 0=none, 3=full verification
  status: 'active' | 'suspended' | 'blocked';
  created_at: string;
  updated_at: string;
}
```

### Wallet

```typescript
interface Wallet {
  wallet_id: string;
  user_id: string;
  type: 'personal' | 'group' | 'agent';
  balance_total: number;
  balance_available: number;
  balance_pending: number;
  currency: string;
  status: 'active' | 'frozen' | 'closed';
  created_at: string;
}
```

### Transaction

```typescript
interface Transaction {
  transaction_id: string;
  from_wallet_id: string;
  to_wallet_id?: string;
  amount: number;
  fee: number;
  net_amount: number;
  currency: string;
  type: 'sent' | 'received' | 'payment' | 'cash_out' | 'cash_in' | 'voucher';
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  payment_method: 'qr_code' | 'phone_transfer' | 'bank_transfer' | 'agent_pos';
  description?: string;
  timestamp: string;
  completed_at?: string;
  receipt_url?: string;
  metadata?: Record<string, any>;
}
```

### Agent

```typescript
interface Agent {
  agent_id: string;
  business_name: string;
  owner_name: string;
  phone: string;
  email: string;
  status: 'pending_verification' | 'active' | 'suspended' | 'inactive';
  location: {
    address: string;
    city: string;
    region: string;
    country: string;
    lat: number;
    lng: number;
  };
  cash_balance: number;
  commission_rate: number;  // e.g., 0.02 for 2%
  rating: number;
  total_transactions: number;
  services: string[];
  working_hours: {
    open: string;
    close: string;
    days: string[];
  };
  created_at: string;
}
```

### Voucher

```typescript
interface Voucher {
  voucher_id: string;
  voucher_code: string;
  amount: number;
  currency: string;
  status: 'issued' | 'redeemed' | 'expired' | 'cancelled';
  beneficiary_id: string;
  beneficiary_phone: string;
  program_name: string;
  issuer_name: string;
  issued_date: string;
  expiry_date: string;
  redeemed_at?: string;
  redeemed_by?: string;
}
```

---

## Error Handling

### Standard Error Response

**Format:**
```typescript
{
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  }
}
```

### HTTP Status Codes

| Status | Meaning | Use Case |
|--------|---------|----------|
| 200 | OK | Successful request |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Invalid request parameters |
| 401 | Unauthorized | Missing or invalid authentication |
| 402 | Payment Required | Insufficient balance |
| 403 | Forbidden | Valid auth but no permission |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate resource |
| 410 | Gone | Resource expired or deleted |
| 422 | Unprocessable Entity | Validation failed |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |
| 502 | Bad Gateway | Upstream service error |
| 503 | Service Unavailable | Maintenance or overload |

### Error Codes

**Authentication:**
- `INVALID_API_KEY` - API key is invalid or expired
- `INVALID_TOKEN` - JWT token is invalid or expired
- `MISSING_CREDENTIALS` - No authentication provided

**Validation:**
- `INVALID_PHONE` - Phone number format invalid
- `INVALID_AMOUNT` - Amount must be positive
- `INVALID_CODE` - Confirmation code invalid

**Business Logic:**
- `INSUFFICIENT_BALANCE` - Not enough funds
- `AGENT_INACTIVE` - Agent not active
- `VOUCHER_EXPIRED` - Voucher past expiry
- `VOUCHER_ALREADY_REDEEMED` - Voucher used
- `TRANSACTION_LIMIT_EXCEEDED` - Daily limit reached

**System:**
- `DATABASE_ERROR` - Database operation failed
- `NETWORK_ERROR` - External service unavailable
- `RATE_LIMIT_EXCEEDED` - Too many requests

---

## Webhooks

### Event Types

| Event | Description | Payload |
|-------|-------------|---------|
| `transaction.completed` | Transaction successfully processed | Transaction object |
| `transaction.failed` | Transaction failed | Transaction object + error |
| `agent.settlement.processed` | Daily settlement completed | Settlement object |
| `voucher.redeemed` | Voucher redeemed at agent | Voucher + transaction |
| `agent.balance.low` | Agent cash running low | Agent object + threshold |

### Webhook Payload Structure

```typescript
{
  event: string;
  timestamp: string;
  data: any;
  signature: string;
}
```

### Example: Transaction Completed

**Webhook POST to your endpoint:**
```json
{
  "event": "transaction.completed",
  "timestamp": "2026-03-17T10:30:00Z",
  "data": {
    "transaction_id": "txn_abc123xyz",
    "agent_id": "agt_1a2b3c4d5e",
    "type": "cash_out",
    "amount": 500.00,
    "fee": 7.50,
    "agent_commission": 3.00,
    "customer_phone": "+264812345678",
    "status": "completed",
    "completed_at": "2026-03-17T10:30:00Z"
  }
}
```

### Webhook Configuration

**Endpoint:** `POST /api/v1/webhooks/configure`

**Request:**
```typescript
{
  url: string;
  events: string[];
  secret: string;
}
```

**Response:**
```typescript
{
  success: true;
  webhook_id: string;
  url: string;
  events: string[];
  status: 'active';
}
```

---

## Rate Limiting

### Limits by Authentication Type

| Type | Requests per Minute | Burst Allowance |
|------|---------------------|-----------------|
| Public (no auth) | 10 | 20 |
| User (JWT) | 60 | 100 |
| Partner (API Key) | 1000 | 2000 |
| Agent (API Key) | 120 | 200 |

### Rate Limit Headers

**Included in all responses:**
```http
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1710676800
```

### Rate Limit Exceeded Response

**Status:** 429 Too Many Requests

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. Please try again in 30 seconds.",
    "retry_after": 30
  }
}
```

---

## Code Examples

### Node.js/TypeScript Examples

#### 1. Agent Cash-Out Transaction

```typescript
import fetch from 'node-fetch';

async function processCashOut(
  agentId: string,
  customerPhone: string,
  amount: number,
  confirmationCode: string
) {
  const response = await fetch(
    'https://buffr.ai/api/v1/partners/agents/transactions',
    {
      method: 'POST',
      headers: {
        'X-API-Key': process.env.BUFFR_AGENT_API_KEY!,
        'X-Request-ID': crypto.randomUUID(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        agent_id: agentId,
        transaction_type: 'cash_out',
        customer_phone: customerPhone,
        amount: amount,
        currency: 'NAD',
        confirmation_code: confirmationCode,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error.message);
  }

  const data = await response.json();
  
  if (data.success && data.status === 'completed') {
    console.log('✓ Cash-out successful');
    console.log(`Transaction ID: ${data.transaction_id}`);
    console.log(`Commission earned: NAD ${data.agent_commission}`);
    return data;
  } else {
    throw new Error('Transaction failed');
  }
}

// Usage
try {
  const result = await processCashOut(
    'agt_1a2b3c4d5e',
    '+264812345678',
    500.00,
    '1234'
  );
  // Dispense cash to customer
} catch (error) {
  console.error('Cash-out failed:', error.message);
  // Show error to agent
}
```

#### 2. Voucher Redemption

```typescript
async function redeemVoucher(
  voucherCode: string,
  agentId: string,
  beneficiaryPhone: string
) {
  const response = await fetch(
    'https://buffr.ai/api/v1/vouchers/cash-out',
    {
      method: 'POST',
      headers: {
        'X-API-Key': process.env.BUFFR_AGENT_API_KEY!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        voucher_code: voucherCode,
        agent_id: agentId,
        beneficiary_phone: beneficiaryPhone,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    if (error.error.code === 'VOUCHER_ALREADY_REDEEMED') {
      throw new Error('This voucher has already been used');
    }
    if (error.error.code === 'VOUCHER_EXPIRED') {
      throw new Error('This voucher has expired');
    }
    throw new Error(error.error.message);
  }

  const data = await response.json();
  
  console.log(`✓ Voucher redeemed: NAD ${data.amount}`);
  console.log(`Commission: NAD ${data.agent_commission}`);
  
  return data;
}
```

#### 3. Webhook Handler

```typescript
import express from 'express';
import crypto from 'crypto';

const app = express();
app.use(express.json());

function verifyWebhookSignature(
  payload: any,
  signature: string,
  secret: string
): boolean {
  const parts = signature.split(',');
  const timestamp = parts[0].split('=')[1];
  const sig = parts[1].split('=')[1];
  
  const signedPayload = `${timestamp}.${JSON.stringify(payload)}`;
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(sig),
    Buffer.from(expectedSignature)
  );
}

app.post('/webhooks/buffr', (req, res) => {
  const signature = req.headers['x-buffr-signature'] as string;
  const secret = process.env.BUFFR_WEBHOOK_SECRET!;
  
  if (!verifyWebhookSignature(req.body, signature, secret)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  
  const { event, data } = req.body;
  
  switch (event) {
    case 'transaction.completed':
      handleTransactionCompleted(data);
      break;
    case 'agent.settlement.processed':
      handleSettlementProcessed(data);
      break;
    default:
      console.log(`Unknown event: ${event}`);
  }
  
  res.status(200).json({ received: true });
});

function handleTransactionCompleted(data: any) {
  console.log(`Transaction completed: ${data.transaction_id}`);
  // Update local database, send notifications, etc.
}

function handleSettlementProcessed(data: any) {
  console.log(`Settlement processed: ${data.settlement_id}`);
  // Reconcile accounts, generate reports
}
```

### Python Examples

#### 1. Agent Cash-Out

```python
import requests
import os
import uuid

def process_cash_out(agent_id, customer_phone, amount, confirmation_code):
    url = "https://buffr.ai/api/v1/partners/agents/transactions"
    
    headers = {
        "X-API-Key": os.environ["BUFFR_AGENT_API_KEY"],
        "X-Request-ID": str(uuid.uuid4()),
        "Content-Type": "application/json"
    }
    
    payload = {
        "agent_id": agent_id,
        "transaction_type": "cash_out",
        "customer_phone": customer_phone,
        "amount": amount,
        "currency": "NAD",
        "confirmation_code": confirmation_code
    }
    
    response = requests.post(url, json=payload, headers=headers)
    
    if response.status_code == 200:
        data = response.json()
        if data["success"] and data["status"] == "completed":
            print(f"✓ Cash-out successful: {data['transaction_id']}")
            print(f"Commission: NAD {data['agent_commission']}")
            return data
        else:
            raise Exception("Transaction failed")
    else:
        error = response.json()
        raise Exception(error["error"]["message"])

# Usage
try:
    result = process_cash_out(
        agent_id="agt_1a2b3c4d5e",
        customer_phone="+264812345678",
        amount=500.00,
        confirmation_code="1234"
    )
    # Dispense cash to customer
except Exception as e:
    print(f"Error: {e}")
```

#### 2. Webhook Verification

```python
import hmac
import hashlib
import json

def verify_webhook_signature(payload, signature, secret):
    parts = signature.split(',')
    timestamp = parts[0].split('=')[1]
    sig = parts[1].split('=')[1]
    
    signed_payload = f"{timestamp}.{json.dumps(payload)}"
    expected_signature = hmac.new(
        secret.encode(),
        signed_payload.encode(),
        hashlib.sha256
    ).hexdigest()
    
    return hmac.compare_digest(sig, expected_signature)

# Flask webhook handler
from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route('/webhooks/buffr', methods=['POST'])
def buffr_webhook():
    signature = request.headers.get('X-Buffr-Signature')
    secret = os.environ['BUFFR_WEBHOOK_SECRET']
    
    if not verify_webhook_signature(request.json, signature, secret):
        return jsonify({'error': 'Invalid signature'}), 401
    
    event = request.json.get('event')
    data = request.json.get('data')
    
    if event == 'transaction.completed':
        handle_transaction_completed(data)
    elif event == 'agent.settlement.processed':
        handle_settlement_processed(data)
    
    return jsonify({'received': True}), 200
```

---

## Testing Guide

### Sandbox Environment

**Access:**
1. Contact Buffr API team: api-support@buffr.ai
2. Receive sandbox credentials
3. Test with provided test data

**Sandbox Base URL:**
```
https://sandbox.buffr.ai/api/v1
```

**Test Credentials:**
```
Master API Key: sk_test_smartpay_sandbox_****
Agent API Key: agt_api_test_****
Webhook Secret: whsec_test_****
```

### Test Scenarios

#### 1. Successful Cash-Out

```bash
# Test with valid confirmation code
curl -X POST https://sandbox.buffr.ai/api/v1/partners/agents/transactions \
  -H "X-API-Key: agt_api_test_****" \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "agt_test_001",
    "transaction_type": "cash_out",
    "customer_phone": "+264811111111",
    "amount": 100.00,
    "currency": "NAD",
    "confirmation_code": "1234"
  }'

# Expected: 200 OK with transaction_id
```

#### 2. Invalid Confirmation Code

```bash
curl -X POST https://sandbox.buffr.ai/api/v1/partners/agents/transactions \
  -H "X-API-Key: agt_api_test_****" \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "agt_test_001",
    "transaction_type": "cash_out",
    "customer_phone": "+264811111111",
    "amount": 100.00,
    "currency": "NAD",
    "confirmation_code": "9999"
  }'

# Expected: 400 Bad Request with error code INVALID_CODE
```

#### 3. Insufficient Balance

```bash
# Test user: +264822222222 has NAD 50 balance
curl -X POST https://sandbox.buffr.ai/api/v1/partners/agents/transactions \
  -H "X-API-Key: agt_api_test_****" \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "agt_test_001",
    "transaction_type": "cash_out",
    "customer_phone": "+264822222222",
    "amount": 100.00,
    "currency": "NAD",
    "confirmation_code": "5678"
  }'

# Expected: 402 Payment Required with error code INSUFFICIENT_BALANCE
```

#### 4. Voucher Redemption

```bash
# Test voucher: G2P-TEST-ABC123 worth NAD 300
curl -X POST https://sandbox.buffr.ai/api/v1/vouchers/cash-out \
  -H "X-API-Key: agt_api_test_****" \
  -H "Content-Type: application/json" \
  -d '{
    "voucher_code": "G2P-TEST-ABC123",
    "agent_id": "agt_test_001",
    "beneficiary_phone": "+264833333333"
  }'

# Expected: 200 OK with amount and commission details
```

### Test Data

**Test Users:**
```
Phone: +264811111111 | Balance: NAD 1,000 | KYC: Level 2
Phone: +264822222222 | Balance: NAD 50    | KYC: Level 1
Phone: +264833333333 | Balance: NAD 0     | KYC: Level 0
```

**Test Agents:**
```
ID: agt_test_001 | Status: active   | Cash: NAD 50,000
ID: agt_test_002 | Status: active   | Cash: NAD 5,000
ID: agt_test_003 | Status: inactive | Cash: NAD 0
```

**Test Vouchers:**
```
Code: G2P-TEST-ABC123 | Amount: NAD 300 | Status: valid
Code: G2P-TEST-XYZ789 | Amount: NAD 500 | Status: redeemed
Code: G2P-TEST-OLD001 | Amount: NAD 200 | Status: expired
```

**Test Confirmation Codes:**
```
1234 - Valid code
5678 - Valid code
9999 - Invalid code (always fails)
```

---

## Best Practices

### API Integration

**DO:**
- ✅ Store API keys in environment variables
- ✅ Use HTTPS for all requests
- ✅ Implement retry logic with exponential backoff
- ✅ Log all transactions with timestamps
- ✅ Validate responses before processing
- ✅ Handle all error cases gracefully
- ✅ Use idempotency keys for write operations
- ✅ Implement webhook signature verification

**DON'T:**
- ❌ Hardcode API keys in source code
- ❌ Skip error handling
- ❌ Ignore rate limits
- ❌ Store sensitive data in logs
- ❌ Trust client-side validation only
- ❌ Use production keys for testing

### Security Considerations

**Agent POS Terminals:**
- Secure API key storage (encrypted)
- Transaction logging for audit trail
- Timeout idle sessions
- Regular software updates
- Physical security of terminals

**Network Security:**
- TLS 1.2+ for all API calls
- Certificate pinning (mobile apps)
- No sensitive data in URLs/query params
- Encrypt data at rest

**Fraud Prevention:**
- Flag suspicious patterns (velocity checks)
- Daily transaction limits per agent
- Real-time monitoring alerts
- Regular agent audits

---

## Support

### Technical Support

**Email:** api-support@buffr.ai  
**Phone:** +264 81 437 6206  
**Hours:** Mon-Fri 8:00 AM - 6:00 PM NAT

### API Status

**Status Page:** https://status.buffr.ai (expected)  
**Uptime SLA:** 99.9% (expected)

### Documentation

**Main Docs:** https://docs.buffr.ai (expected)  
**Changelog:** https://buffr.ai/changelog (expected)  
**GitHub SDK:** github.com/buffr/agent-sdk (expected)

---

## Appendix

### API Response Times (Expected)

| Endpoint | p50 | p95 | p99 |
|----------|-----|-----|-----|
| GET /agents/nearby | 50ms | 150ms | 300ms |
| POST /agents/transactions | 200ms | 500ms | 1000ms |
| POST /vouchers/cash-out | 150ms | 400ms | 800ms |
| GET /transactions | 100ms | 250ms | 500ms |

### Database Schema (Expected)

**Core Tables:**
- `users` - User accounts
- `wallets` - User wallets
- `transactions` - All transactions
- `agents` - Agent network
- `vouchers` - G2P vouchers
- `settlements` - Agent settlements
- `api_keys` - Partner API keys
- `webhooks` - Webhook configurations

**For complete schema, contact Buffr API team.**

---

**Document Version:** 1.0  
**Last Updated:** March 17, 2026  
**Maintained By:** Smartpay Technical Team

**Source Documents Consolidated:**
- BUFFR_CONNECT_API_REFERENCE.md (3127 lines)
- BUFFR_SMARTPAY_API_SPECIFICATION.md (1714 lines)
- README_BUFFR_API_DOCS.md (576 lines)

**Total Consolidation:** ~5,400 lines → 650 lines (88% reduction)

---

*For integration guide, see: BUFFR_SMARTPAY_INTEGRATION.md*  
*For implementation steps, see: IMPLEMENTATION_GUIDE.md*
