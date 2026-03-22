# @smartpay/shared-security

Shared security utilities for the SmartPay monorepo. 

⚠️ **This is currently a placeholder package for future expansion.**

## 📁 Directory Structure

```
packages/shared-security/
├── typescript/         # TypeScript security utilities (empty - future)
│   └── .gitkeep
├── python/             # Python security utilities (empty - future)
│   └── .gitkeep
├── package.json
└── README.md           # This file
```

## 🎯 Purpose

This package is reserved for shared security utilities that will be used across multiple applications in the monorepo.

### Current Status: PLACEHOLDER

Currently, security code lives in application-specific directories:
- **Backend**: `apps/smartpay-backend/src/lib/security/`
- **AI Service**: `apps/smartpay-ai/smartpay_ai/security/`
- **Mobile**: `apps/smartpay-mobile/utils/security/`

## 🚀 Future Planned Utilities

When this package is populated, it will contain:

### Encryption Utilities
```typescript
// Future: @smartpay/shared-security/encryption
import { encrypt, decrypt } from '@smartpay/shared-security/encryption';

const encrypted = encrypt(sensitiveData, key);
const decrypted = decrypt(encrypted, key);
```

### Token Validation
```typescript
// Future: @smartpay/shared-security/tokens
import { validateJWT, generateToken } from '@smartpay/shared-security/tokens';

const isValid = validateJWT(token);
```

### Password Hashing
```typescript
// Future: @smartpay/shared-security/passwords
import { hashPassword, verifyPassword } from '@smartpay/shared-security/passwords';

const hash = await hashPassword(password);
const valid = await verifyPassword(password, hash);
```

### Input Sanitization
```typescript
// Future: @smartpay/shared-security/sanitize
import { sanitizeInput, validateEmail } from '@smartpay/shared-security/sanitize';

const clean = sanitizeInput(userInput);
```

### Rate Limiting Helpers
```typescript
// Future: @smartpay/shared-security/rate-limit
import { checkRateLimit, recordAttempt } from '@smartpay/shared-security/rate-limit';

const allowed = await checkRateLimit(userId, endpoint);
```

## 📝 How to Add Security Utilities

When you're ready to add shared security utilities, follow these steps:

### 1. Create the Utility File

**TypeScript:**
```bash
# Create utility file
touch packages/shared-security/typescript/encryption.ts
```

**Python:**
```bash
# Create utility module
touch packages/shared-security/python/encryption.py
```

### 2. Implement the Utility

**TypeScript Example:**
```typescript
// packages/shared-security/typescript/encryption.ts
import crypto from 'crypto';

export function encrypt(data: string, key: string): string {
  const cipher = crypto.createCipher('aes-256-cbc', key);
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

export function decrypt(encrypted: string, key: string): string {
  const decipher = crypto.createDecipher('aes-256-cbc', key);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
```

**Python Example:**
```python
# packages/shared-security/python/encryption.py
from cryptography.fernet import Fernet

def encrypt(data: str, key: bytes) -> bytes:
    """Encrypt data using Fernet symmetric encryption."""
    f = Fernet(key)
    return f.encrypt(data.encode())

def decrypt(encrypted: bytes, key: bytes) -> str:
    """Decrypt data using Fernet symmetric encryption."""
    f = Fernet(key)
    return f.decrypt(encrypted).decode()
```

### 3. Create Index Files

**TypeScript:**
```typescript
// packages/shared-security/typescript/index.ts
export * from './encryption';
export * from './tokens';
export * from './passwords';
```

**Python:**
```python
# packages/shared-security/python/__init__.py
from .encryption import encrypt, decrypt
from .tokens import validate_jwt, generate_token
from .passwords import hash_password, verify_password
```

### 4. Update package.json

```json
{
  "exports": {
    ".": "./typescript/index.ts",
    "./encryption": "./typescript/encryption.ts",
    "./tokens": "./typescript/tokens.ts",
    "./python/encryption": "./python/encryption.py"
  },
  "dependencies": {
    "crypto": "^1.0.1",
    "jsonwebtoken": "^9.0.0",
    "bcrypt": "^5.1.0"
  }
}
```

### 5. Add Tests

```bash
mkdir -p packages/shared-security/__tests__
```

### 6. Update This README

Document the new utilities with usage examples and API documentation.

## 🔐 Security Best Practices

When adding security utilities to this package:

1. **Never hardcode secrets** - Use environment variables
2. **Use established libraries** - Don't roll your own crypto
3. **Add comprehensive tests** - Security code needs thorough testing
4. **Document clearly** - Explain usage and security implications
5. **Follow standards** - Use industry-standard algorithms
6. **Regular updates** - Keep dependencies patched
7. **Audit regularly** - Review security code frequently

### Recommended Libraries

**TypeScript/Node.js:**
- `crypto` (built-in) - Encryption/hashing
- `bcrypt` - Password hashing
- `jsonwebtoken` - JWT handling
- `helmet` - Security headers
- `express-rate-limit` - Rate limiting

**Python:**
- `cryptography` - Encryption/decryption
- `passlib` - Password hashing
- `PyJWT` - JWT handling
- `python-jose` - JOSE/JWT
- `ratelimit` - Rate limiting

## 📦 Current Security Code Locations

Until utilities are moved here, find security code in:

### Backend (apps/smartpay-backend/)
```
src/lib/
├── jwtService.ts          # JWT token handling
├── encryption.ts          # Data encryption
├── passwordService.ts     # Password hashing
└── rateLimiter.ts         # Rate limiting
```

### AI Service (apps/smartpay-ai/)
```
smartpay_ai/
├── security/
│   ├── encryption.py      # Data encryption
│   └── validation.py      # Input validation
```

### Mobile (apps/smartpay-mobile/)
```
utils/
├── secureStorage.ts       # Secure local storage
└── biometric.ts           # Biometric auth
```

## 🚧 Migration Plan

When migrating security utilities to this package:

1. **Identify shared code** - Find duplicated security logic
2. **Extract to this package** - Move to shared-security
3. **Add tests** - Ensure functionality preserved
4. **Update imports** - Change apps to use shared package
5. **Remove duplicates** - Clean up old code
6. **Verify security** - Audit after migration

## 🧪 Testing Strategy

When utilities are added:

```typescript
// Example test structure
describe('Security Utilities', () => {
  describe('encryption', () => {
    it('encrypts and decrypts data correctly', () => {
      // Test implementation
    });
    
    it('fails with invalid key', () => {
      // Test implementation
    });
  });
});
```

## 📚 Related Documentation

- [Security Architecture](../../docs/architecture/security.md)
- [Authentication Guide](../../docs/guides/authentication.md)
- [Encryption Standards](../../docs/guides/encryption.md)
- [Security Checklist](../../docs/security/checklist.md)

## 🐛 Troubleshooting

### When to Add Utilities Here?

Add utilities to this package when:
- ✅ The utility is used in 2+ applications
- ✅ The logic is identical across uses
- ✅ It's a core security function (encryption, validation, etc.)

Keep utilities in apps when:
- ❌ Only used in one application
- ❌ Highly specific to application context
- ❌ Still evolving rapidly

## 🤝 Contributing

When ready to add utilities:

1. Discuss security approach with team first
2. Follow security best practices
3. Add comprehensive tests
4. Document thoroughly
5. Request security review before merging

## 📝 Next Steps

To activate this package:

1. Identify duplicated security code across apps
2. Extract common patterns
3. Implement in this package
4. Add tests
5. Update consuming applications
6. Document usage

## 📄 License

Private package for SmartPay monorepo only.

---

**Note**: This package will remain a placeholder until shared security utilities are needed. For now, application-specific security code should remain in the respective app directories.
