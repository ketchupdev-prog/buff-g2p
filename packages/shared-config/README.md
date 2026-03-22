# @smartpay/shared-config

Shared configuration files for the SmartPay monorepo. This package contains centralized configuration that is used across multiple applications and services.

## 📁 Directory Structure

```
packages/shared-config/
├── rate_limits.yaml       # API rate limiting configuration
├── jwt_config.json        # JWT token settings
├── fee_structure.yaml     # Payment fee configuration
├── package.json
└── README.md              # This file
```

## 🎯 Purpose

This package provides centralized configuration for:
- **Rate Limits**: API endpoint throttling and rate limiting rules
- **JWT Configuration**: Token generation and validation settings
- **Fee Structure**: Transaction and payment fee schedules

## 📝 Configuration Files

### rate_limits.yaml

Defines rate limiting rules for API endpoints across all services.

**Structure:**
```yaml
rate_limits:
  default:
    requests_per_minute: 60
    burst_capacity: 10
  endpoints:
    - path: /api/auth/login
      requests_per_minute: 5
      burst_capacity: 2
    # ...
```

**Usage:**
```typescript
// In Node.js/TypeScript
import yaml from 'yaml';
import fs from 'fs';

const rateLimits = yaml.parse(
  fs.readFileSync('node_modules/@smartpay/shared-config/rate_limits.yaml', 'utf8')
);
```

```python
# In Python
import yaml

with open('packages/shared-config/rate_limits.yaml') as f:
    rate_limits = yaml.safe_load(f)
```

### jwt_config.json

JWT token configuration for authentication and authorization.

**Structure:**
```json
{
  "issuer": "smartpay",
  "audience": "smartpay-services",
  "access_token_expiry": "15m",
  "refresh_token_expiry": "7d",
  "algorithm": "RS256"
}
```

**Usage:**
```typescript
// In TypeScript/Node.js
import jwtConfig from '@smartpay/shared-config/jwt';

const token = jwt.sign(payload, privateKey, {
  expiresIn: jwtConfig.access_token_expiry,
  issuer: jwtConfig.issuer,
  audience: jwtConfig.audience
});
```

### fee_structure.yaml

Transaction and payment fee schedules.

**Structure:**
```yaml
fees:
  transaction:
    domestic:
      percentage: 0.5
      minimum: 0.10
      maximum: 5.00
    international:
      percentage: 2.5
      minimum: 1.00
      maximum: 25.00
  # ...
```

**Usage:**
```typescript
import yaml from 'yaml';
import fs from 'fs';

const feeStructure = yaml.parse(
  fs.readFileSync('node_modules/@smartpay/shared-config/fee_structure.yaml', 'utf8')
);

function calculateFee(amount: number, type: 'domestic' | 'international') {
  const config = feeStructure.fees.transaction[type];
  const fee = Math.max(
    config.minimum,
    Math.min(config.maximum, amount * (config.percentage / 100))
  );
  return fee;
}
```

## 🚀 Using Configuration

### In TypeScript/Node.js Apps

#### Direct Import (for JSON):
```typescript
import jwtConfig from '@smartpay/shared-config/jwt';
```

#### With YAML Parser:
```typescript
import yaml from 'yaml';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const configPath = resolve(
  __dirname,
  '../../../packages/shared-config/rate_limits.yaml'
);
const rateLimits = yaml.parse(readFileSync(configPath, 'utf8'));
```

### In Python Apps

```python
import yaml
import json
from pathlib import Path

# Load YAML config
config_dir = Path(__file__).parent.parent.parent / 'packages' / 'shared-config'

with open(config_dir / 'rate_limits.yaml') as f:
    rate_limits = yaml.safe_load(f)

with open(config_dir / 'jwt_config.json') as f:
    jwt_config = json.load(f)
```

### As Environment-Specific Overrides

```typescript
import defaultConfig from '@smartpay/shared-config/rate-limits';

// Merge with environment-specific overrides
const config = {
  ...defaultConfig,
  ...loadEnvironmentOverrides()
};
```

## 🔧 Modifying Configuration

### Best Practices

1. **Never commit secrets** - Use environment variables for sensitive data
2. **Document changes** - Update this README when adding new config
3. **Validate before committing** - Run validation scripts
4. **Version carefully** - Config changes can break dependent services

### Adding New Configuration

1. **Create the config file**:
   ```bash
   touch packages/shared-config/new-config.yaml
   ```

2. **Add to package.json exports**:
   ```json
   {
     "exports": {
       "./new-config": "./new-config.yaml"
     }
   }
   ```

3. **Document usage** in this README

4. **Add validation** (if applicable)

### Validation

```bash
# Validate JSON files
npm run validate:json

# Validate YAML files (requires yamllint)
npm run validate:yaml
```

## 📦 Consuming Applications

### Backend (smartpay-backend)
- Uses: All config files
- Primary configs: rate_limits.yaml, jwt_config.json, fee_structure.yaml

### Mobile (smartpay-mobile)
- Uses: JWT config (client-side token validation)
- Primary configs: jwt_config.json

### AI Service (smartpay-ai)
- Uses: Rate limits, fee structure (for recommendations)
- Primary configs: rate_limits.yaml, fee_structure.yaml

## 🔐 Security Considerations

### What's In This Package
- ✅ Non-sensitive configuration
- ✅ Default values
- ✅ Rate limits and thresholds
- ✅ Fee schedules

### What's NOT In This Package
- ❌ API keys
- ❌ Database passwords
- ❌ Private keys
- ❌ Secret tokens

**Secrets belong in:**
- Environment variables (`.env` files, NOT committed)
- Secret management systems (AWS Secrets Manager, etc.)
- Encrypted configuration stores

## 🧪 Testing Configuration

```typescript
// Example: Test fee calculation
import { calculateFee } from '../utils/fees';
import feeConfig from '@smartpay/shared-config/fees';

describe('Fee Calculation', () => {
  it('applies correct domestic fee', () => {
    const amount = 100;
    const fee = calculateFee(amount, 'domestic', feeConfig);
    expect(fee).toBe(0.50); // 0.5% of 100
  });
});
```

## 📚 Related Documentation

- [Configuration Management Guide](../../docs/guides/configuration.md)
- [Environment Setup](../../docs/guides/environment-setup.md)
- [Security Best Practices](../../docs/guides/security.md)

## 🐛 Troubleshooting

### Config not found in app?
1. Check package.json exports are correct
2. Verify monorepo workspace linking
3. Ensure file path resolution is correct

### YAML parsing errors?
1. Validate YAML syntax online or with yamllint
2. Check for tab characters (use spaces)
3. Verify indentation is consistent

### Config changes not taking effect?
1. Restart development servers
2. Clear build caches
3. Check if config is cached in application

## 🤝 Contributing

When modifying configuration:
1. Test locally first
2. Document changes in this README
3. Update dependent applications if needed
4. Consider backward compatibility
5. Notify team of breaking changes

## 📝 Future Enhancements

Planned additions:
- `compliance_limits.yaml` - Regulatory compliance thresholds
- `monitoring_config.yaml` - Logging and monitoring settings
- `feature_flags.json` - Feature toggle configuration

## 📄 License

Private package for SmartPay monorepo only.
