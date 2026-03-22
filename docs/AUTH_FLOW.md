# Authentication Flow Documentation

**Version:** 2.0  
**Last Updated:** March 21, 2026  
**Status:** Integration Complete

---

## Overview

SmartPay uses **Supabase Auth** as the primary authentication system, with full integration to **Buffr Connect** for open banking and account aggregation services. This document describes the complete authentication architecture and data flow.

## Architecture Diagram

```
┌─────────────────┐
│  Mobile App     │
│  (React Native) │
└────────┬────────┘
         │
         │ 1. Sign In/Sign Up
         │    (email + password)
         ↓
┌─────────────────────────┐
│  Supabase Auth          │
│  - User Management      │
│  - JWT Token Issuance   │
│  - Session Management   │
└────────┬────────────────┘
         │
         │ 2. JWT Access Token
         │    (contains: sub, email, exp)
         ↓
┌─────────────────────────┐
│  SmartPay Backend       │
│  - JWT Verification     │
│  - API Authorization    │
│  - Business Logic       │
└────────┬────────────────┘
         │
         │ 3. Same JWT Token
         │    (forwarded to Buffr)
         ↓
┌─────────────────────────┐
│  Buffr Connect          │
│  - Open Banking API     │
│  - Account Aggregation  │
│  - Transaction Data     │
└─────────────────────────┘
```

## Authentication Components

### 1. Mobile App (`apps/smartpay-mobile`)

#### Supabase Integration

```tsx
// contexts/SupabaseAuthContext.tsx
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

// Sign in
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password123',
});

// Access token available at: data.session.access_token
```

#### Buffr Connect Integration

```tsx
// contexts/BuffrContext.tsx
import { BuffrProvider } from '@buffr/react-native';

<BuffrProvider
  config={{
    baseUrl: process.env.EXPO_PUBLIC_BUFFR_CONNECT_URL,
    getAccessToken: async () => session?.access_token || null,
  }}
>
  {children}
</BuffrProvider>
```

### 2. Backend (`apps/smartpay-backend`)

#### JWT Verification Middleware

```typescript
// src/middleware/requireAuth.ts
import { verifySupabaseBearerToken } from '../services/auth/supabase-verify';

export async function requireAuth(req, res, next) {
  const token = req.headers.authorization?.substring(7); // Remove 'Bearer '
  
  // Primary: Verify as Supabase JWT
  const supabaseCheck = await verifySupabaseBearerToken(token);
  if (supabaseCheck.valid) {
    req.userId = supabaseCheck.principal.sub;
    req.userEmail = supabaseCheck.principal.email;
    return next();
  }
  
  // Fallback: Verify as legacy JWT (for backward compatibility)
  // ...
  
  return res.status(401).json({ error: 'Unauthorized' });
}
```

#### Supabase Verification Service

```typescript
// src/services/auth/supabase-verify.ts
import { createClient } from '@supabase/supabase-js';

const client = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export async function verifySupabaseBearerToken(token: string) {
  const { data, error } = await client.auth.getUser(token);
  
  if (error || !data?.user) {
    return { valid: false, error: error?.message };
  }
  
  return {
    valid: true,
    principal: {
      sub: data.user.id,
      email: data.user.email,
    },
  };
}
```

### 3. Buffr Connect Integration

The backend forwards Supabase JWTs to Buffr Connect for AIS (Account Information Services):

```typescript
// src/lib/buffrConnectClient.ts
export async function getAisAccounts(accessToken: string) {
  const response = await fetch(`${BUFFR_CONNECT_URL}/api/ais/accounts`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });
  
  return response.json();
}
```

## Complete Authentication Flows

### Flow 1: User Sign-In

1. **Mobile App**: User enters email and password
2. **Supabase**: Validates credentials, returns JWT access token
3. **Mobile App**: Stores token in secure storage, updates session state
4. **All subsequent API calls**: Include `Authorization: Bearer <token>` header

```
User → Mobile → Supabase → Mobile (stores token)
  ↓
All API calls include token
```

### Flow 2: Backend API Request

1. **Mobile App**: Sends request with `Authorization: Bearer <token>`
2. **Backend**: Extracts token from header
3. **Backend**: Verifies token with `verifySupabaseBearerToken()`
4. **Backend**: Attaches `userId` and `userEmail` to request
5. **Backend**: Processes request with user context

```
Mobile → Backend → Supabase (verify) → Backend (process)
```

### Flow 3: Buffr Connect Bank Data

1. **Mobile App**: User initiates bank connection
2. **Mobile App**: Opens Buffr Connect consent flow
3. **Buffr Connect**: User authorizes bank access
4. **Mobile App**: Fetches accounts using Supabase token
5. **Backend**: Forwards token to Buffr Connect
6. **Buffr Connect**: Validates token, returns bank data

```
Mobile → Buffr (consent) → Mobile → Backend → Buffr (data)
```

### Flow 4: Token Refresh

1. **Mobile App**: Detects token expiration
2. **Supabase**: Automatic refresh using refresh token
3. **Mobile App**: Updates stored access token
4. **All subsequent requests**: Use new token

```
Mobile → Supabase (refresh) → Mobile (update token)
```

## Environment Variables

### Mobile App (`.env`)

```bash
# Supabase Configuration (from buffrconnect/.env.local)
EXPO_PUBLIC_SUPABASE_URL=https://cjmtcxfpwjbpbctjseex.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Buffr Connect URL
EXPO_PUBLIC_BUFFR_CONNECT_URL=http://localhost:3000
```

### Backend (`.env`)

```bash
# Supabase Configuration (from buffrconnect/.env.local)
SUPABASE_URL=https://cjmtcxfpwjbpbctjseex.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Buffr Connect Integration
BUFFR_CONNECT_URL=http://localhost:3000
BUFFR_API_KEY=buffr_live_...
BUFFR_WEBHOOK_SECRET=...
```

## Security Considerations

### JWT Token Security

- ✅ **Tokens are verified**: Backend uses `client.auth.getUser(token)` for verification
- ✅ **No custom JWT secrets**: Uses Supabase's signing infrastructure
- ✅ **Tokens expire**: Default 1-hour expiry with automatic refresh
- ✅ **Secure storage**: Mobile app uses `expo-secure-store`

### API Key Management

- ✅ **Public keys for mobile**: Only ANON_KEY exposed (rate-limited, RLS-protected)
- ✅ **Service role on backend**: SERVICE_ROLE_KEY never exposed to client
- ✅ **Buffr API keys**: Stored only on backend, never on mobile

### Best Practices

1. **Never log tokens**: Redact authorization headers in logs
2. **HTTPS only**: All API calls use TLS 1.2+
3. **Token refresh**: Handle refresh transparently in the app
4. **Logout cleanup**: Clear all tokens on sign-out
5. **Error handling**: Don't expose internal errors to client

## Testing

### Integration Tests

```bash
# Backend tests
cd apps/smartpay-backend
npm test -- __tests__/integration/auth/

# Tests include:
# - Supabase JWT validation
# - Token refresh flow
# - Buffr Connect integration
# - End-to-end auth flow
```

### Manual Testing

1. **Sign In Flow**:
   ```bash
   # Mobile app
   expo start
   # Sign in with test credentials
   # Verify token in network inspector
   ```

2. **Backend Verification**:
   ```bash
   curl -X GET http://localhost:4000/api/v1/user/profile \
     -H "Authorization: Bearer <token>"
   ```

3. **Buffr Connect**:
   ```bash
   # Connect a bank account in mobile app
   # Verify accounts appear in Buffr Connect dashboard
   ```

## Troubleshooting

### Common Issues

#### 1. "Invalid token" errors

**Cause**: Token expired or Supabase config mismatch

**Solution**:
- Verify `SUPABASE_URL` and `SUPABASE_ANON_KEY` match across mobile and backend
- Check token expiry (`exp` claim in JWT)
- Ensure backend is using `verifySupabaseBearerToken()`

#### 2. "Buffr Connect not configured"

**Cause**: Missing `BUFFR_CONNECT_URL`

**Solution**:
```bash
# Mobile .env
EXPO_PUBLIC_BUFFR_CONNECT_URL=http://localhost:3000

# Backend .env
BUFFR_CONNECT_URL=http://localhost:3000
```

#### 3. CORS errors with Buffr Connect

**Cause**: Buffr Connect not allowing mobile origin

**Solution**: Add mobile origin to Buffr Connect CORS settings

## Migration Notes

### From Custom JWT to Supabase

If migrating from custom JWT authentication:

1. **Backward compatibility**: The backend supports both Supabase and legacy JWTs
2. **Gradual migration**: Users can continue using old tokens during transition
3. **Force re-login**: Optionally require all users to sign in again with Supabase

### Deprecated Patterns

❌ **Don't do this**:
```typescript
// Using custom JWT_SECRET
jwt.verify(token, process.env.JWT_SECRET);
```

✅ **Do this instead**:
```typescript
// Using Supabase verification
await verifySupabaseBearerToken(token);
```

## Future Enhancements

- [ ] Social auth (Google, Apple Sign-In via Supabase)
- [ ] Biometric authentication (Touch ID / Face ID)
- [ ] Multi-factor authentication (MFA)
- [ ] OAuth2 PKCE flow for Buffr Connect
- [ ] Refresh token rotation

## Support

For authentication issues:
- **Supabase**: Check [Supabase Auth docs](https://supabase.com/docs/guides/auth)
- **Buffr Connect**: See `docs/guides/api/buffr-integration.md`
- **Internal**: Contact backend team

---

**Related Documents:**
- [Integration Guide](./INTEGRATION_GUIDE.md)
- [Buffr Connect API Reference](./guides/api/buffr-reference.md)
- [Security Best Practices](./SECURITY.md)
