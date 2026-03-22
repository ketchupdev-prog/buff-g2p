/**
 * PII Protection Middleware - PSD-12 §11 Compliance
 * 
 * Automatically encrypts PII in requests and decrypts in responses.
 * 
 * Features:
 * - Request PII encryption before database operations
 * - Response PII decryption before sending to client
 * - Configurable field list
 * - Error handling for missing encryption keys
 * - Audit logging for PII access
 * 
 * Usage:
 * 
 * ```typescript
 * import { encryptRequestPII, decryptResponsePII } from './middleware/pii-protection';
 * 
 * // Apply to routes that handle PII
 * router.post('/users', encryptRequestPII(['phone', 'email']), createUserHandler);
 * router.get('/users/:id', getUserHandler, decryptResponsePII(['phone', 'email']));
 * ```
 * 
 * Location: fintech/apps/smartpay-backend/src/middleware/pii-protection.ts
 */

import { Request, Response, NextFunction } from 'express';
import {
  encryptPhone,
  hashPhone,
  encryptEmail,
  hashEmail,
  decryptPhone,
  decryptEmail,
  maskPII,
} from '../security/encryption-service';

/**
 * PII field configuration
 */
interface PIIFieldConfig {
  field: string;
  type: 'phone' | 'email';
  required?: boolean;
}

/**
 * Middleware to encrypt PII fields in request body
 * Use before database operations
 * 
 * @param fields - Array of field names or configurations
 * 
 * @example
 * router.post('/users', encryptRequestPII(['phone', 'email']), handler);
 * 
 * @example With configuration
 * router.post('/users', encryptRequestPII([
 *   { field: 'phone', type: 'phone', required: true },
 *   { field: 'email', type: 'email', required: false }
 * ]), handler);
 */
export function encryptRequestPII(
  fields: (string | PIIFieldConfig)[]
): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.body || typeof req.body !== 'object') {
        return next();
      }

      for (const fieldConfig of fields) {
        const config: PIIFieldConfig = typeof fieldConfig === 'string'
          ? { field: fieldConfig, type: inferFieldType(fieldConfig) }
          : fieldConfig;

        const value = req.body[config.field];

        // Skip if field doesn't exist
        if (value === undefined || value === null) {
          if (config.required) {
            return res.status(400).json({
              error: 'Bad Request',
              message: `Required field missing: ${config.field}`,
            });
          }
          continue;
        }

        // Encrypt based on type
        try {
          switch (config.type) {
            case 'phone':
              req.body[`${config.field}_encrypted`] = encryptPhone(value);
              req.body[`${config.field}_hash`] = hashPhone(value);
              break;

            case 'email':
              req.body[`${config.field}_encrypted`] = encryptEmail(value);
              req.body[`${config.field}_hash`] = hashEmail(value);
              break;

            default:
              console.warn(`Unknown PII type for field ${config.field}: ${config.type}`);
          }

          // Keep plaintext for backward compatibility during migration
          // Will be removed in future migration after verification
        } catch (error) {
          console.error(`Failed to encrypt ${config.field}:`, error);
          return res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to encrypt sensitive data',
          });
        }
      }

      next();
    } catch (error) {
      console.error('PII encryption middleware error:', error);
      next(error);
    }
  };
}

/**
 * Middleware to decrypt PII fields in response
 * Use after database read operations
 * 
 * @param fields - Array of field names to decrypt
 * 
 * @example
 * router.get('/users/:id', handler, decryptResponsePII(['phone', 'email']));
 */
export function decryptResponsePII(
  fields: string[]
): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction) => {
    const originalJson = res.json.bind(res);

    res.json = function (body: any) {
      try {
        if (body && typeof body === 'object') {
          decryptPIIInObject(body, fields);
        }
        return originalJson(body);
      } catch (error) {
        console.error('PII decryption middleware error:', error);
        return originalJson(body);
      }
    };

    next();
  };
}

/**
 * Middleware to mask PII fields in logs/responses
 * Use for audit logs or external API responses
 * 
 * @param fields - Array of fields to mask
 * 
 * @example
 * router.get('/users/:id/audit', handler, maskResponsePII(['phone', 'email']));
 */
export function maskResponsePII(
  fields: string[]
): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction) => {
    const originalJson = res.json.bind(res);

    res.json = function (body: any) {
      try {
        if (body && typeof body === 'object') {
          maskPIIInObject(body, fields);
        }
        return originalJson(body);
      } catch (error) {
        console.error('PII masking middleware error:', error);
        return originalJson(body);
      }
    };

    next();
  };
}

/**
 * Recursively decrypt PII fields in an object
 */
function decryptPIIInObject(obj: any, fields: string[]): void {
  if (!obj || typeof obj !== 'object') {
    return;
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    for (const item of obj) {
      decryptPIIInObject(item, fields);
    }
    return;
  }

  // Handle objects
  for (const field of fields) {
    const encryptedField = `${field}_encrypted`;
    
    if (obj[encryptedField]) {
      try {
        // Determine field type and decrypt
        const type = inferFieldType(field);
        
        switch (type) {
          case 'phone':
            obj[field] = decryptPhone(obj[encryptedField]);
            break;
          
          case 'email':
            obj[field] = decryptEmail(obj[encryptedField]);
            break;
          
          default:
            console.warn(`Unknown field type for decryption: ${field}`);
        }

        // Remove encrypted field from response
        delete obj[encryptedField];
        delete obj[`${field}_hash`];
      } catch (error) {
        console.error(`Failed to decrypt ${field}:`, error);
        // Keep encrypted field, mask it for security
        obj[field] = maskPII(obj[field] || '', type);
      }
    }
  }

  // Recurse into nested objects
  for (const key of Object.keys(obj)) {
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      decryptPIIInObject(obj[key], fields);
    }
  }
}

/**
 * Recursively mask PII fields in an object
 */
function maskPIIInObject(obj: any, fields: string[]): void {
  if (!obj || typeof obj !== 'object') {
    return;
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    for (const item of obj) {
      maskPIIInObject(item, fields);
    }
    return;
  }

  // Handle objects
  for (const field of fields) {
    if (obj[field]) {
      try {
        const type = inferFieldType(field);
        obj[field] = maskPII(obj[field], type);
      } catch (error) {
        console.error(`Failed to mask ${field}:`, error);
      }
    }
  }

  // Recurse into nested objects
  for (const key of Object.keys(obj)) {
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      maskPIIInObject(obj[key], fields);
    }
  }
}

/**
 * Infer field type from field name
 */
function inferFieldType(fieldName: string): 'phone' | 'email' | 'card' {
  const lower = fieldName.toLowerCase();
  
  if (lower.includes('phone') || lower.includes('mobile') || lower.includes('tel')) {
    return 'phone';
  }
  
  if (lower.includes('email') || lower.includes('mail')) {
    return 'email';
  }
  
  if (lower.includes('card') || lower.includes('pan')) {
    return 'card';
  }
  
  // Default to phone
  return 'phone';
}

/**
 * Audit PII access for compliance
 * Logs when PII is accessed by users/services
 * 
 * @param action - Action being performed (read, write, update, delete)
 * 
 * @example
 * router.get('/users/:id', auditPIIAccess('read'), handler);
 */
export function auditPIIAccess(
  action: 'read' | 'write' | 'update' | 'delete'
): (req: Request, res: Response, next: NextFunction) => void {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).userId || (req as any).user?.id;
      const ip = req.ip || req.socket.remoteAddress;
      const userAgent = req.get('user-agent');

      // Log PII access (implement your audit logging here)
      console.log('[PII ACCESS AUDIT]', {
        action,
        userId,
        ip,
        userAgent,
        path: req.path,
        method: req.method,
        timestamp: new Date().toISOString(),
      });

      // In production, write to audit log table
      // await sql`
      //   INSERT INTO audit_logs (user_id, action, resource_type, ip_address, user_agent)
      //   VALUES (${userId}, ${'PII_' + action.toUpperCase()}, 'PII', ${ip}, ${userAgent})
      // `;

      next();
    } catch (error) {
      console.error('PII audit middleware error:', error);
      next();
    }
  };
}

/**
 * Validate encryption keys are configured
 * Use at application startup
 * 
 * @example
 * app.use(requireEncryptionKeys());
 */
export function requireEncryptionKeys(): (
  req: Request,
  res: Response,
  next: NextFunction
) => void {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Check that required encryption keys are set
      const requiredKeys = [
        'PII_ENCRYPTION_KEY',
        'PII_PHONE_KEY',
        'PII_EMAIL_KEY',
      ];

      const missingKeys = requiredKeys.filter((key) => !process.env[key]);

      if (missingKeys.length > 0) {
        console.error('Missing required encryption keys:', missingKeys);
        return res.status(503).json({
          error: 'Service Unavailable',
          message: 'Encryption keys not configured',
        });
      }

      next();
    } catch (error) {
      console.error('Encryption key validation error:', error);
      next(error);
    }
  };
}

// Export all middleware
export default {
  encryptRequestPII,
  decryptResponsePII,
  maskResponsePII,
  auditPIIAccess,
  requireEncryptionKeys,
};
