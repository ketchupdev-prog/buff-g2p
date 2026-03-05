/**
 * Environment Variable Validation
 * 
 * Purpose: Validates required environment variables at server startup
 * Location: backend/src/lib/envValidation.ts
 * 
 * Implements: KNOWN_LIMITATIONS.md T2 - Environment Validation
 */

interface EnvValidationResult {
  valid: boolean;
  missing: string[];
  warnings: string[];
}

/**
 * Critical environment variables required for server to start
 */
const REQUIRED_ENV_VARS = [
  'DATABASE_URL',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'JWT_PAYMENT_SECRET',
  'ENCRYPTION_KEY',
  'PORT',
] as const;

/**
 * Important environment variables that should be set for production
 */
const RECOMMENDED_ENV_VARS = [
  'BUFFR_API_KEY',
  'SMTP_HOST',
  'SMTP_USER',
  'SMTP_PASS',
  'DEEPSEEK_API_KEY',
  'FINERACT_USERNAME',
  'FINERACT_PASSWORD',
  'TOKEN_VAULT_API_KEY',
  'OPEN_BANKING_CLIENT_SECRET',
] as const;

/**
 * Validates all required environment variables
 */
export function validateRequiredEnvVars(): EnvValidationResult {
  const missing: string[] = [];
  const warnings: string[] = [];

  // Check required vars
  for (const key of REQUIRED_ENV_VARS) {
    if (!process.env[key] || process.env[key]?.trim() === '') {
      missing.push(key);
    }
  }

  // Check recommended vars (only in production)
  if (process.env.NODE_ENV === 'production' || process.env.APP_ENV === 'production') {
    for (const key of RECOMMENDED_ENV_VARS) {
      if (!process.env[key] || process.env[key]?.trim() === '') {
        warnings.push(key);
      }
    }
  }

  return {
    valid: missing.length === 0,
    missing,
    warnings,
  };
}

/**
 * Validates environment variables and throws if critical vars are missing
 * Called at server startup
 */
export function validateEnvOrExit(): void {
  const result = validateRequiredEnvVars();

  if (!result.valid) {
    console.error('❌ CRITICAL: Missing required environment variables:');
    result.missing.forEach((key) => {
      console.error(`   - ${key}`);
    });
    console.error('\nPlease check your .env file and ensure all required variables are set.');
    console.error('See backend/.env.example for reference.');
    process.exit(1);
  }

  if (result.warnings.length > 0) {
    console.warn('⚠️  WARNING: Missing recommended environment variables:');
    result.warnings.forEach((key) => {
      console.warn(`   - ${key}`);
    });
    console.warn('\nThese variables are recommended for production deployment.');
    console.warn('Some features may not work correctly without them.');
  }

  console.log('✅ Environment variables validated successfully');
}

/**
 * Validates specific feature flags and their dependencies
 */
export function validateFeatureDependencies(): void {
  const issues: string[] = [];

  // Open Banking
  if (process.env.OPEN_BANKING_ENABLED === 'true') {
    if (process.env.OPEN_BANKING_MTLS_ENABLED === 'true') {
      if (!process.env.OPEN_BANKING_CERT_PATH) issues.push('OPEN_BANKING_CERT_PATH required when mTLS enabled');
      if (!process.env.OPEN_BANKING_KEY_PATH) issues.push('OPEN_BANKING_KEY_PATH required when mTLS enabled');
      if (!process.env.OPEN_BANKING_PARTICIPANT_ID) issues.push('OPEN_BANKING_PARTICIPANT_ID required for Open Banking');
    }
  }

  // Fineract
  if (process.env.FINERACT_ENABLED === 'true') {
    if (!process.env.FINERACT_BASE_URL) issues.push('FINERACT_BASE_URL required when Fineract enabled');
    if (!process.env.FINERACT_USERNAME) issues.push('FINERACT_USERNAME required when Fineract enabled');
    if (!process.env.FINERACT_PASSWORD) issues.push('FINERACT_PASSWORD required when Fineract enabled');
  }

  // Token Vault
  if (process.env.TOKEN_VAULT_ENABLED === 'true') {
    if (!process.env.TOKEN_VAULT_URL) issues.push('TOKEN_VAULT_URL required when Token Vault enabled');
    if (!process.env.TOKEN_VAULT_API_KEY) issues.push('TOKEN_VAULT_API_KEY required when Token Vault enabled');
  }

  // SMS
  if (process.env.SMS_PROVIDER === 'twilio') {
    if (!process.env.TWILIO_ACCOUNT_SID) issues.push('TWILIO_ACCOUNT_SID required for Twilio SMS');
    if (!process.env.TWILIO_AUTH_TOKEN) issues.push('TWILIO_AUTH_TOKEN required for Twilio SMS');
    if (!process.env.TWILIO_PHONE_NUMBER) issues.push('TWILIO_PHONE_NUMBER required for Twilio SMS');
  }

  if (issues.length > 0) {
    console.warn('⚠️  Feature dependency warnings:');
    issues.forEach((issue) => {
      console.warn(`   - ${issue}`);
    });
  }
}
