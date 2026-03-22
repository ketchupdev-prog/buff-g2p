# SmartPay + Buffr Connect Integration Guide

**Version:** 1.0  
**Last Updated:** March 21, 2026  
**Audience:** Developers integrating Buffr Connect with SmartPay

---

## Quick Start

### Prerequisites

- Node.js 18+ (currently using v24.9.0)
- Supabase account and project
- Buffr Connect running locally or deployed
- Expo CLI (for mobile development)

### 1. Clone and Setup

```bash
# Clone the repository
git clone <repo-url>
cd fintech

# Install dependencies
npm install

# Setup backend
cd apps/smartpay-backend
cp .env.example .env
# Edit .env with your credentials

# Setup mobile
cd ../smartpay-mobile
cp .env.example .env
# Edit .env with your credentials
```

### 2. Configure Supabase

All Supabase credentials should come from the canonical source: `buffr-connect/buffrconnect/.env.local`

**Canonical Supabase Project:**
- Project ID: `cjmtcxfpwjbpbctjseex`
- URL: `https://cjmtcxfpwjbpbctjseex.supabase.co`

**Backend `.env`:**
```bash
SUPABASE_URL=https://cjmtcxfpwjbpbctjseex.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Mobile `.env`:**
```bash
EXPO_PUBLIC_SUPABASE_URL=https://cjmtcxfpwjbpbctjseex.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 3. Configure Buffr Connect

**Backend `.env`:**
```bash
BUFFR_CONNECT_URL=http://localhost:3000
BUFFR_API_KEY=buffr_live_...
BUFFR_WEBHOOK_SECRET=<generate-with-openssl-rand-hex-32>
```

**Mobile `.env`:**
```bash
EXPO_PUBLIC_BUFFR_CONNECT_URL=http://localhost:3000
```

### 4. Start Services

```bash
# Terminal 1: Start Buffr Connect (in buffr-connect/buffrconnect)
cd buffr-connect/buffrconnect
npm run dev

# Terminal 2: Start SmartPay Backend
cd fintech/apps/smartpay-backend
npm run dev

# Terminal 3: Start Mobile App
cd fintech/apps/smartpay-mobile
npm start
```

## Integration Architecture

### Component Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Mobile App Layer                         │
│  - @buffr/react-native SDK                                   │
│  - Supabase Auth Context                                     │
│  - Buffr Provider Context                                    │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ Supabase JWT Token
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                   Backend API Layer                          │
│  - JWT Verification (verifySupabaseBearerToken)              │
│  - Business Logic                                            │
│  - Buffr Client (buffrConnectClient.ts)                      │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ Same Supabase JWT
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                  Buffr Connect API                           │
│  - Open Banking (AIS)                                        │
│  - Account Aggregation                                       │
│  - Transaction Data                                          │
└─────────────────────────────────────────────────────────────┘
```

## Mobile App Integration

### Step 1: Install @buffr/react-native

The package is already installed via workspace link:

```json
{
  "dependencies": {
    "@buffr/react-native": "file:../../../../buffr-connect/packages/buffr-react-native"
  }
}
```

### Step 2: Wrap App with BuffrProvider

```tsx
// contexts/BuffrContext.tsx
import { BuffrProvider, BuffrConnect } from '@buffr/react-native';
import { useSupabaseAuth } from './SupabaseAuthContext';

export function BuffrProviderWrapper({ children }) {
  const { session } = useSupabaseAuth();

  const config = {
    baseUrl: process.env.EXPO_PUBLIC_BUFFR_CONNECT_URL,
    getAccessToken: async () => session?.access_token || null,
  };

  return (
    <BuffrProvider config={config}>
      {children}
    </BuffrProvider>
  );
}
```

### Step 3: Use Buffr Hooks

```tsx
// app/(authenticated)/bank-accounts/index.tsx
import { useAccounts } from '@buffr/react-native';

export default function BankAccountsScreen() {
  const { data: accounts, isLoading, error } = useAccounts();

  return (
    <View>
      {accounts?.map(account => (
        <AccountCard key={account.id} account={account} />
      ))}
    </View>
  );
}
```

### Step 4: Implement Bank Connection Flow

```tsx
import * as WebBrowser from 'expo-web-browser';

async function handleConnectBank(provider: string) {
  const buffrUrl = process.env.EXPO_PUBLIC_BUFFR_CONNECT_URL;
  
  // Open Buffr Connect consent flow
  const result = await WebBrowser.openBrowserAsync(
    `${buffrUrl}/consent?provider=${provider}`
  );
  
  if (result.type === 'dismiss' || result.type === 'cancel') {
    // User cancelled
    return;
  }
  
  // Refresh accounts after consent
  refetch();
}
```

## Backend Integration

### Step 1: Install Supabase Client

```bash
npm install @supabase/supabase-js
```

### Step 2: Implement JWT Verification

The backend already has Supabase JWT verification:

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

### Step 3: Use in Middleware

```typescript
// src/middleware/requireAuth.ts
export async function requireAuth(req, res, next) {
  const token = req.headers.authorization?.substring(7);
  
  const result = await verifySupabaseBearerToken(token);
  if (result.valid) {
    req.userId = result.principal.sub;
    req.userEmail = result.principal.email;
    return next();
  }
  
  return res.status(401).json({ error: 'Unauthorized' });
}
```

### Step 4: Forward Token to Buffr Connect

```typescript
// src/lib/buffrConnectClient.ts
export async function getAisAccounts(accessToken: string) {
  const response = await fetch(`${BUFFR_CONNECT_URL}/api/ais/accounts`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });
  
  return response.json();
}
```

## Testing

### Unit Tests

```bash
# Backend
cd apps/smartpay-backend
npm test

# Mobile
cd apps/smartpay-mobile
npm test
```

### Integration Tests

```bash
# Backend integration tests (requires Supabase credentials)
cd apps/smartpay-backend
npm test -- __tests__/integration/auth/

# Test coverage includes:
# - Supabase JWT validation
# - Token refresh
# - Buffr Connect integration
```

### Manual Testing Checklist

- [ ] Mobile app sign-in with Supabase
- [ ] Token stored in secure storage
- [ ] Backend validates Supabase token
- [ ] Bank connection flow works
- [ ] Accounts appear after consent
- [ ] Token refresh works correctly
- [ ] Logout clears all tokens

## Common Issues & Solutions

### Issue 1: "Invalid token" errors

**Symptoms**: Backend returns 401 Unauthorized

**Cause**: Supabase config mismatch

**Solution**:
1. Verify all `.env` files use the same Supabase project
2. Check `SUPABASE_URL` and `SUPABASE_ANON_KEY` match
3. Ensure token is not expired

### Issue 2: Buffr Connect not accessible

**Symptoms**: "Buffr Connect not configured" message

**Cause**: Missing `BUFFR_CONNECT_URL`

**Solution**:
```bash
# Mobile .env
EXPO_PUBLIC_BUFFR_CONNECT_URL=http://localhost:3000

# Backend .env
BUFFR_CONNECT_URL=http://localhost:3000
```

### Issue 3: CORS errors

**Symptoms**: Network requests blocked in mobile app

**Cause**: Buffr Connect doesn't allow mobile origin

**Solution**: Add mobile origin to Buffr Connect CORS settings

## Best Practices

### Security

1. **Never commit `.env` files**: Use `.env.example` as template
2. **Use HTTPS in production**: Configure SSL/TLS certificates
3. **Rotate API keys regularly**: Update both SmartPay and Buffr Connect
4. **Implement rate limiting**: Protect against abuse
5. **Log security events**: Monitor failed auth attempts

### Performance

1. **Cache Supabase client**: Don't create new client per request
2. **Batch API calls**: Reduce network round-trips
3. **Implement retry logic**: Handle transient failures
4. **Use connection pooling**: For database connections
5. **Monitor response times**: Set up alerts for slow endpoints

### Development

1. **Use TypeScript**: Type safety prevents runtime errors
2. **Write integration tests**: Test full auth flow
3. **Document API changes**: Keep docs in sync with code
4. **Use feature flags**: Roll out changes gradually
5. **Version APIs**: Support backward compatibility

## Production Deployment

### Environment Variables Checklist

**Backend:**
- [ ] `SUPABASE_URL` (production)
- [ ] `SUPABASE_ANON_KEY` (production)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` (production)
- [ ] `BUFFR_CONNECT_URL` (production URL)
- [ ] `BUFFR_API_KEY` (production key)
- [ ] `BUFFR_WEBHOOK_SECRET` (unique secret)
- [ ] `JWT_SECRET` (legacy support only)
- [ ] `DATABASE_URL` (production database)

**Mobile:**
- [ ] `EXPO_PUBLIC_SUPABASE_URL` (production)
- [ ] `EXPO_PUBLIC_SUPABASE_ANON_KEY` (production)
- [ ] `EXPO_PUBLIC_BUFFR_CONNECT_URL` (production URL)

### Deployment Steps

1. **Update environment variables** in hosting platform
2. **Run database migrations** before deploying code
3. **Deploy backend first**, then mobile app
4. **Test production endpoints** with staging credentials
5. **Monitor error logs** for first 24 hours
6. **Have rollback plan** ready

## Support & Resources

### Documentation

- [AUTH_FLOW.md](./AUTH_FLOW.md) - Complete auth flow documentation
- [Buffr API Reference](./guides/api/buffr-reference.md) - API endpoints
- [Supabase Docs](https://supabase.com/docs) - Official Supabase docs

### Getting Help

- **Internal**: Create issue in GitHub repository
- **Supabase**: [Supabase Discord](https://discord.supabase.com)
- **Buffr Connect**: Contact backend team

### Code Examples

- Example Buffr integration: `fintech/examples/buffr-integration/`
- Test credentials: See `buffrconnect/.env.local`
- API examples: `docs/guides/api/buffr-integration.md`

---

**Next Steps:**
1. Complete environment setup
2. Run integration tests
3. Test bank connection flow
4. Deploy to staging
5. Monitor and iterate
