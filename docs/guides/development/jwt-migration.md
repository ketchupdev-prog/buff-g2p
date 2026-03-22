# JWT Authentication Migration Guide

## Overview

This guide documents the consolidated JWT authentication system for SmartPay, eliminating code duplication between TypeScript and Python implementations.

**DRY Violation Fixed:** Duplicate JWT validation logic in:
- `backend/src/lib/jwt.ts` (TypeScript)
- `backend_python/smartpay_ai/middleware/auth.py` (Python - was delegating to Node API)

**Solution:** Shared JWT configuration and parallel implementations that follow the same logic.

---

## Architecture

```
smartpay/
├── shared_config/
│   ├── jwt_config.json              # Shared JWT configuration
│   └── JWT_MIGRATION_GUIDE.md       # This document
├── backend/
│   └── src/
│       └── lib/
│           └── jwt.ts               # TypeScript JWT implementation
└── backend_python/
    └── smartpay_ai/
        └── shared/
            ├── __init__.py
            └── jwt_validator.py     # Python JWT implementation
```

---

## Shared Configuration

All JWT settings are now centralized in `shared_config/jwt_config.json`:

```json
{
  "algorithm": "HS256",
  "access_token": {
    "expiry_seconds": 900,
    "type": "access"
  },
  "refresh_token": {
    "expiry_seconds": 604800,
    "type": "refresh"
  },
  "security": {
    "require_jti": true,
    "require_database_validation": true
  }
}
```

---

## Python Implementation

### Installation

The Python JWT validator is now available as a shared module:

```python
from smartpay_ai.shared import (
    verify_access_token,
    verify_refresh_token,
    refresh_access_token,
    set_database_pool
)
```

### Setup Database Connection

```python
import asyncpg
from smartpay_ai.shared import set_database_pool

# Initialize database pool
pool = await asyncpg.create_pool(
    host='localhost',
    database='smartpay',
    user='postgres',
    password='password'
)

# Configure JWT validator with database pool
set_database_pool(pool)
```

### Usage Examples

#### 1. Verify Access Token

```python
from smartpay_ai.shared import verify_access_token, extract_bearer_token

async def authenticate_request(authorization_header: str):
    """Authenticate a request using JWT."""
    # Extract token from header
    token = extract_bearer_token(authorization_header)
    if not token:
        raise ValueError("Missing or invalid Authorization header")
    
    # Verify token
    result = await verify_access_token(token)
    if not result['valid']:
        raise ValueError(f"Authentication failed: {result['error']}")
    
    # Get user ID from payload
    user_id = result['payload']['userId']
    return user_id
```

#### 2. Refresh Access Token

```python
from smartpay_ai.shared import refresh_access_token

async def refresh_user_session(refresh_token: str):
    """Refresh user session with a new access token."""
    result = await refresh_access_token(refresh_token)
    
    if 'error' in result:
        raise ValueError(f"Token refresh failed: {result['error']}")
    
    return result['accessToken']
```

#### 3. Logout (Revoke Tokens)

```python
from smartpay_ai.shared import revoke_all_user_tokens

async def logout_user(user_id: str):
    """Logout user by revoking all their tokens."""
    await revoke_all_user_tokens(user_id)
```

#### 4. Generate New Tokens

```python
from smartpay_ai.shared import generate_access_token, generate_refresh_token

async def create_user_session(user_id: str):
    """Create new session with access and refresh tokens."""
    access_token = await generate_access_token(user_id)
    refresh_token = await generate_refresh_token(user_id)
    
    return {
        'accessToken': access_token,
        'refreshToken': refresh_token,
        'expiresIn': 900  # 15 minutes
    }
```

---

## TypeScript Migration (Optional)

While the TypeScript implementation is already functional, you can optionally migrate it to use the shared configuration for consistency.

### Current TypeScript Implementation

The current implementation in `backend/src/lib/jwt.ts` is feature-complete and working. **No immediate migration is required.**

### Benefits of Migration

1. **Consistency**: All JWT settings in one place
2. **Maintainability**: Update configuration once, affects both systems
3. **Documentation**: Centralized security best practices

### Migration Steps (If Desired)

#### Step 1: Load Shared Configuration

```typescript
// backend/src/lib/jwt-config.ts
import * as fs from 'fs';
import * as path from 'path';

interface JWTConfig {
  algorithm: string;
  access_token: {
    expiry_seconds: number;
    type: string;
  };
  refresh_token: {
    expiry_seconds: number;
    type: string;
  };
  validation_rules: {
    allow_clock_skew_seconds: number;
  };
}

let config: JWTConfig;

try {
  const configPath = path.join(__dirname, '../../../shared_config/jwt_config.json');
  config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
} catch (error) {
  // Fallback to defaults
  config = {
    algorithm: 'HS256',
    access_token: { expiry_seconds: 900, type: 'access' },
    refresh_token: { expiry_seconds: 604800, type: 'refresh' },
    validation_rules: { allow_clock_skew_seconds: 30 }
  };
}

export const JWT_CONFIG = config;
export const ACCESS_TOKEN_EXPIRY = config.access_token.expiry_seconds;
export const REFRESH_TOKEN_EXPIRY = config.refresh_token.expiry_seconds;
```

#### Step 2: Update jwt.ts to Use Shared Config

```typescript
// backend/src/lib/jwt.ts
import { JWT_CONFIG, ACCESS_TOKEN_EXPIRY, REFRESH_TOKEN_EXPIRY } from './jwt-config';

// Replace hardcoded values
// Before:
// const ACCESS_TOKEN_EXPIRY = 15 * 60;
// After:
// Import from jwt-config.ts (shown above)
```

#### Step 3: Testing

```typescript
// backend/src/__tests__/jwt.test.ts
import { verifyAccessToken, generateAccessToken } from '../lib/jwt';
import { ACCESS_TOKEN_EXPIRY } from '../lib/jwt-config';

describe('JWT Configuration', () => {
  it('should use shared configuration values', () => {
    expect(ACCESS_TOKEN_EXPIRY).toBe(900); // From shared config
  });
  
  it('should generate and verify tokens correctly', async () => {
    const token = await generateAccessToken('test-user-id');
    const result = await verifyAccessToken(token);
    
    expect(result.valid).toBe(true);
    expect(result.payload?.userId).toBe('test-user-id');
    expect(result.payload?.type).toBe('access');
  });
});
```

---

## Token Flow Diagram

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │
       │ 1. POST /auth/login
       │    { phone, pin }
       ▼
┌─────────────────┐
│   Backend API   │
│  (TypeScript)   │
└────────┬────────┘
         │
         │ 2. Verify credentials
         │
         │ 3. Generate tokens
         │    - generateAccessToken(userId)
         │    - generateRefreshToken(userId)
         │
         │ 4. Store in database
         │    - user_sessions table
         │    - refresh_tokens table
         │
         ▼
    ┌─────────────────────┐
    │  Return to client:  │
    │  {                  │
    │    accessToken,     │
    │    refreshToken,    │
    │    expiresIn: 900   │
    │  }                  │
    └─────────────────────┘

┌─────────────────────────────────────┐
│  Subsequent API Requests            │
└──────┬──────────────────────────────┘
       │
       │ Authorization: Bearer <accessToken>
       │
       ▼
┌────────────────────┐        ┌──────────────────────┐
│  TypeScript API    │   OR   │   Python AI Service  │
│  (Express)         │        │   (FastAPI)          │
└────────┬───────────┘        └──────────┬───────────┘
         │                               │
         │ verifyAccessToken()           │ verify_access_token()
         │ - Check signature             │ - Check signature
         │ - Check expiration            │ - Check expiration
         │ - Check database              │ - Check database
         │ - Check token type            │ - Check token type
         │                               │
         ▼                               ▼
    ┌─────────────────────────────────────┐
    │  Process authenticated request      │
    └─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  Token Refresh Flow                 │
└──────┬──────────────────────────────┘
       │
       │ POST /auth/refresh
       │ { refreshToken }
       │
       ▼
┌────────────────────┐
│  Backend API       │
└────────┬───────────┘
         │
         │ verifyRefreshToken()
         │ - Validate signature
         │ - Check not revoked
         │
         │ generateAccessToken()
         │ - New access token
         │
         ▼
    ┌─────────────────────┐
    │  Return new token:  │
    │  {                  │
    │    accessToken,     │
    │    expiresIn: 900   │
    │  }                  │
    └─────────────────────┘
```

---

## Security Best Practices

### 1. Environment Variables

**Always set these in production:**

```bash
# .env
JWT_SECRET=<minimum-32-character-random-string>
JWT_REFRESH_SECRET=<different-32-character-random-string>
NODE_ENV=production
```

**Generate secure secrets:**

```bash
# Using OpenSSL
openssl rand -base64 32

# Using Python
python3 -c "import secrets; print(secrets.token_urlsafe(32))"

# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 2. HTTPS Only

**Never transmit JWT tokens over HTTP in production:**

```typescript
// Express.js - Force HTTPS
app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'production' && !req.secure) {
    return res.redirect('https://' + req.headers.host + req.url);
  }
  next();
});
```

```python
# FastAPI - Force HTTPS
from fastapi.middleware.httpsredirect import HTTPSRedirectMiddleware

if os.getenv('NODE_ENV') == 'production':
    app.add_middleware(HTTPSRedirectMiddleware)
```

### 3. Secure Cookie Storage (Frontend)

```typescript
// Store tokens in httpOnly cookies instead of localStorage
res.cookie('accessToken', token, {
  httpOnly: true,
  secure: true,  // HTTPS only
  sameSite: 'strict',
  maxAge: 900000  // 15 minutes
});
```

### 4. Token Rotation

**Implement refresh token rotation for enhanced security:**

```python
async def refresh_with_rotation(old_refresh_token: str):
    """Refresh access token and rotate refresh token."""
    # Verify old refresh token
    result = await verify_refresh_token(old_refresh_token)
    if not result['valid']:
        raise ValueError("Invalid refresh token")
    
    user_id = result['payload']['userId']
    
    # Revoke old refresh token
    await revoke_refresh_token(old_refresh_token)
    
    # Generate new tokens
    new_access_token = await generate_access_token(user_id)
    new_refresh_token = await generate_refresh_token(user_id)
    
    return {
        'accessToken': new_access_token,
        'refreshToken': new_refresh_token
    }
```

### 5. Rate Limiting

**Prevent brute force attacks:**

```python
from fastapi import Request
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

@app.post("/auth/login")
@limiter.limit("5/minute")
async def login(request: Request):
    # Login logic
    pass
```

### 6. Audit Logging

**Log all authentication events:**

```python
import logging

audit_log = logging.getLogger('audit')

async def log_auth_event(event_type: str, user_id: str, success: bool, ip: str):
    """Log authentication event for security audit."""
    audit_log.info({
        'event': event_type,
        'user_id': user_id,
        'success': success,
        'ip_address': ip,
        'timestamp': datetime.utcnow().isoformat()
    })
```

### 7. Token Cleanup

**Run periodic cleanup to remove expired tokens:**

```python
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from smartpay_ai.shared import cleanup_expired_tokens

scheduler = AsyncIOScheduler()

@scheduler.scheduled_job('cron', hour=2)  # Run daily at 2 AM
async def daily_token_cleanup():
    """Clean up expired tokens daily."""
    access_count, refresh_count = await cleanup_expired_tokens()
    logging.info(f"Cleaned up {access_count} access and {refresh_count} refresh tokens")

scheduler.start()
```

---

## Database Schema

Ensure these tables exist with proper indexes:

```sql
-- Access tokens (user sessions)
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    last_active_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_token ON user_sessions(token);
CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at);

-- Refresh tokens
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    revoked BOOLEAN DEFAULT false,
    revoked_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token ON refresh_tokens(token);
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
CREATE INDEX idx_refresh_tokens_revoked ON refresh_tokens(revoked) WHERE revoked = false;
```

---

## Testing

### Python Tests

```python
import pytest
from smartpay_ai.shared import (
    generate_access_token,
    verify_access_token,
    refresh_access_token
)

@pytest.mark.asyncio
async def test_token_generation_and_verification():
    """Test token generation and verification."""
    # Generate token
    token = await generate_access_token("test-user-123")
    assert token is not None
    
    # Verify token
    result = await verify_access_token(token)
    assert result['valid'] is True
    assert result['payload']['userId'] == "test-user-123"
    assert result['payload']['type'] == "access"

@pytest.mark.asyncio
async def test_token_expiration():
    """Test that expired tokens are rejected."""
    # This requires mocking time or waiting for expiration
    # Implementation depends on testing framework
    pass

@pytest.mark.asyncio
async def test_refresh_token_flow():
    """Test complete refresh token flow."""
    user_id = "test-user-456"
    
    # Generate refresh token
    refresh_token = await generate_refresh_token(user_id)
    
    # Use refresh token to get new access token
    result = await refresh_access_token(refresh_token)
    assert 'accessToken' in result
    
    # Verify new access token
    verification = await verify_access_token(result['accessToken'])
    assert verification['valid'] is True
```

### TypeScript Tests

```typescript
import { generateAccessToken, verifyAccessToken, refreshAccessToken } from '../lib/jwt';

describe('JWT Operations', () => {
  it('should generate and verify access token', async () => {
    const token = await generateAccessToken('test-user-123');
    expect(token).toBeDefined();
    
    const result = await verifyAccessToken(token);
    expect(result.valid).toBe(true);
    expect(result.payload?.userId).toBe('test-user-123');
    expect(result.payload?.type).toBe('access');
  });
  
  it('should refresh access token', async () => {
    const userId = 'test-user-456';
    const refreshToken = await generateRefreshToken(userId);
    
    const result = await refreshAccessToken(refreshToken);
    expect(result.accessToken).toBeDefined();
    expect(result.error).toBeUndefined();
  });
});
```

---

## Troubleshooting

### Common Issues

#### 1. "Invalid signature" Error

**Cause:** JWT_SECRET mismatch between environments

**Solution:**
```bash
# Verify secrets are the same
echo $JWT_SECRET
# Ensure both TypeScript and Python use the same value
```

#### 2. "Token expired" Error

**Cause:** System clock skew or token actually expired

**Solution:**
- Check system time synchronization
- Increase clock skew allowance in config (30 seconds default)
- Implement automatic token refresh on client

#### 3. "Token revoked or session not found"

**Cause:** Token was manually revoked or database session expired

**Solution:**
- User needs to re-authenticate
- Check token cleanup job isn't running too frequently

#### 4. Database Connection Error

**Cause:** Database pool not initialized

**Solution:**
```python
from smartpay_ai.shared import set_database_pool

# Initialize pool before using JWT functions
pool = await asyncpg.create_pool(...)
set_database_pool(pool)
```

---

## Monitoring & Metrics

### Key Metrics to Track

1. **Token Generation Rate**
   - Tracks authentication volume
   - Alerts for unusual spikes

2. **Token Verification Failures**
   - Tracks invalid/expired tokens
   - Identifies potential attacks

3. **Token Refresh Rate**
   - Normal: Steady refresh rate
   - Abnormal: Sudden spike (token theft?)

4. **Database Query Performance**
   - Monitor token validation query times
   - Optimize indexes if slow

### Example Monitoring Code

```python
from prometheus_client import Counter, Histogram

# Metrics
token_generated = Counter('jwt_tokens_generated', 'JWT tokens generated', ['type'])
token_verified = Counter('jwt_tokens_verified', 'JWT tokens verified', ['type', 'result'])
token_validation_duration = Histogram('jwt_validation_duration_seconds', 'Token validation duration')

async def verify_access_token_with_metrics(token: str):
    """Verify token with metrics."""
    token_verified.labels(type='access', result='attempt').inc()
    
    with token_validation_duration.time():
        result = await verify_access_token(token)
    
    if result['valid']:
        token_verified.labels(type='access', result='success').inc()
    else:
        token_verified.labels(type='access', result='failure').inc()
    
    return result
```

---

## Conclusion

This migration consolidates JWT authentication logic, eliminating code duplication while maintaining full feature parity between TypeScript and Python implementations.

### Key Benefits

✅ **DRY Principle**: Single source of truth for JWT configuration  
✅ **Consistency**: Both implementations follow the same logic  
✅ **Maintainability**: Update config once, affects both systems  
✅ **Security**: Centralized best practices and validation  
✅ **Type Safety**: Strong typing in both implementations  
✅ **Database Integration**: Token revocation and session management  
✅ **Production Ready**: Comprehensive error handling and logging  

### Next Steps

1. ✅ **Phase 1**: Python implementation complete
2. ⏳ **Phase 2**: Optional TypeScript migration to shared config
3. ⏳ **Phase 3**: Implement token rotation
4. ⏳ **Phase 4**: Add monitoring and alerts
5. ⏳ **Phase 5**: Security audit and penetration testing

---

## Support

For questions or issues:
- Check troubleshooting section above
- Review shared configuration: `shared_config/jwt_config.json`
- Check implementation: `backend_python/smartpay_ai/shared/jwt_validator.py`
- TypeScript reference: `backend/src/lib/jwt.ts`
