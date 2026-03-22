# @smartpay/shared-types

Shared type definitions for the SmartPay monorepo. This package serves as the single source of truth for all data types used across TypeScript and Python applications.

## 📁 Directory Structure

```
packages/shared-types/
├── json/              # JSON schemas (source of truth)
│   ├── user.schema.json
│   ├── payment.schema.json
│   ├── transaction.schema.json
│   ├── wallet.schema.json
│   ├── error.schema.json
│   └── response.schema.json
├── typescript/        # Generated TypeScript types
│   ├── index.ts
│   ├── user.ts
│   ├── payment.ts
│   ├── transaction.ts
│   ├── wallet.ts
│   ├── error.ts
│   └── response.ts
├── python/            # Generated Python models
│   ├── __init__.py
│   ├── user.py
│   ├── payment.py
│   ├── transaction.py
│   ├── wallet.py
│   ├── error.py
│   └── response.py
├── package.json
├── tsconfig.json
├── generate.py        # Type generation script
└── README.md          # This file
```

## 🎯 Purpose

This package provides:
- **JSON Schemas**: The canonical definition of all data structures
- **TypeScript Types**: Auto-generated types for the backend and mobile apps
- **Python Models**: Auto-generated Pydantic models for the AI service

## 🚀 Usage

### TypeScript (Backend & Mobile)

```typescript
// Import all types
import { User, Payment, Transaction, Wallet } from '@smartpay/shared-types';

// Use in your code
const user: User = {
  id: '123',
  email: 'user@example.com',
  phone_number: '+1234567890',
  full_name: 'John Doe',
  // ...
};
```

### Python (AI Service)

```python
# Import generated models
from smartpay_types.user import User
from smartpay_types.payment import Payment

# Use in your code
user = User(
    id="123",
    email="user@example.com",
    phone_number="+1234567890",
    full_name="John Doe"
)
```

### JSON Schemas (Validation)

```javascript
// Access raw JSON schemas
import userSchema from '@smartpay/shared-types/json/user.schema.json';

// Use with a validator (e.g., ajv)
const validate = ajv.compile(userSchema);
const valid = validate(userData);
```

## 🔄 Regenerating Types

When you modify JSON schemas, regenerate types for all languages:

```bash
# From this directory
npm run generate

# Or from monorepo root
npm run generate:types
```

This will:
1. Read all JSON schemas from `json/`
2. Generate TypeScript types in `typescript/`
3. Generate Python models in `python/`

## 📝 Adding New Types

1. **Create JSON Schema** (source of truth):
   ```bash
   # Create new schema file
   touch json/new-entity.schema.json
   ```

2. **Define the schema**:
   ```json
   {
     "$schema": "http://json-schema.org/draft-07/schema#",
     "title": "NewEntity",
     "type": "object",
     "properties": {
       "id": { "type": "string" },
       "name": { "type": "string" }
     },
     "required": ["id", "name"]
   }
   ```

3. **Generate types**:
   ```bash
   npm run generate
   ```

4. **Commit changes**:
   ```bash
   git add json/new-entity.schema.json typescript/ python/
   git commit -m "Add NewEntity type definition"
   ```

## 🧪 Validation

### TypeScript Type Checking
```bash
npm test  # Runs tsc --noEmit
```

### JSON Schema Validation
```bash
npm run validate  # Validates all JSON schemas
```

## 📦 Consuming Applications

### Backend (smartpay-backend)
- Location: `apps/smartpay-backend/`
- Usage: Direct import from `@smartpay/shared-types`
- Build: Types are type-checked during build

### Mobile (smartpay-mobile)
- Location: `apps/smartpay-mobile/`
- Usage: Direct import from `@smartpay/shared-types`
- Build: Types are bundled during Metro build

### AI Service (smartpay-ai)
- Location: `apps/smartpay-ai/`
- Usage: Import from generated Python models
- Build: Models are validated with Pydantic

## 🔧 Maintenance

### Best Practices

1. **Always edit JSON schemas first** - They are the source of truth
2. **Never manually edit generated files** - They will be overwritten
3. **Run tests after changes** - Ensure type compatibility
4. **Keep schemas versioned** - Track breaking changes

### Type Generation Process

```
JSON Schemas (json/*.schema.json)
         ↓
    generate.py
         ↓
    ┌────────┴────────┐
    ↓                 ↓
TypeScript         Python
(typescript/)      (python/)
```

## 🐛 Troubleshooting

### Types not updating in apps?
1. Regenerate types: `npm run generate`
2. Clear app caches
3. Restart development servers

### TypeScript errors after type changes?
1. Update consuming code to match new types
2. Check for breaking changes in JSON schemas
3. Run `npm test` to see all type errors

### Python import errors?
1. Ensure `__init__.py` exports all models
2. Check Python path configuration
3. Verify Pydantic is installed

## 📚 Related Documentation

- [Type Generation Guide](../../docs/guides/type-generation.md)
- [Schema Design Patterns](../../docs/guides/schema-patterns.md)
- [Migration Guide](../../docs/guides/migration.md)

## 🤝 Contributing

When adding or modifying types:
1. Update JSON schema first
2. Run `npm run generate`
3. Update consuming applications
4. Add tests for new types
5. Update documentation

## 📄 License

Private package for SmartPay monorepo only.
