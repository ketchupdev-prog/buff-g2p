/**
 * Zod Validation Middleware for High-Value Financial Endpoints
 * Location: backend/src/middleware/zodValidation.ts
 * 
 * SECURITY: Validates all input data for critical financial operations
 * - Prevents malformed data from reaching business logic
 * - Type-safe validation with clear error messages
 * - Protects against injection, overflow, and malicious inputs
 */
import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';

/**
 * Validation error response formatter
 */
function formatZodError(error: ZodError) {
  const first = error.errors[0];
  const firstMsg = first ? `${first.path.join('.') || 'request'}: ${first.message}` : 'Invalid input';
  return {
    success: false,
    error: {
      code: 'VALIDATION_ERROR',
      message: `Invalid input data (required: ${firstMsg})`,
      details: error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
        code: err.code
      }))
    }
  };
}

/**
 * Generic Zod validation middleware factory
 */
export function validateRequest(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json(formatZodError(error));
        return;
      }
      res.status(500).json({
        success: false,
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Validation failed'
        }
      });
      return;
    }
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 💸 SEND MONEY VALIDATION
// ═══════════════════════════════════════════════════════════════════════════

export const sendMoneySchema = z.object({
  amount: z.number()
    .positive('Amount must be positive')
    .min(1, 'Minimum amount is N$1')
    .max(50000, 'Maximum amount is N$50,000 per transaction')
    .finite('Amount must be a finite number'),
  
  beneficiaryId: z.string()
    .uuid('Invalid beneficiary ID format')
    .optional(),
  
  beneficiaryPhone: z.string()
    .regex(/^\+264\d{9}$/, 'Phone must be in format: +264XXXXXXXXX')
    .optional(),
  
  sourceWalletId: z.string()
    .uuid('Invalid wallet ID format'),
  
  note: z.string()
    .max(500, 'Note cannot exceed 500 characters')
    .optional()
}).refine(
  data => data.beneficiaryId || data.beneficiaryPhone,
  {
    message: 'Either beneficiaryId or beneficiaryPhone is required',
    path: ['beneficiaryId']
  }
);

export const validateSendMoney = validateRequest(sendMoneySchema);

// ═══════════════════════════════════════════════════════════════════════════
// 💰 CASH OUT VALIDATION
// ═══════════════════════════════════════════════════════════════════════════

// Base schema for all cash-out operations
const baseCashOutSchema = z.object({
  amount: z.number()
    .positive('Amount must be positive')
    .min(10, 'Minimum cash-out is N$10')
    .max(10000, 'Maximum cash-out is N$10,000 per transaction')
    .finite('Amount must be a finite number'),
  
  walletId: z.string()
    .uuid('Invalid wallet ID format')
});

// Bank cash-out
export const cashOutBankSchema = baseCashOutSchema.extend({
  bankAccount: z.string()
    .min(10, 'Invalid bank account number')
    .max(30, 'Invalid bank account number')
    .regex(/^[0-9]+$/, 'Bank account must contain only digits'),
  
  bankCode: z.string()
    .length(6, 'Bank code must be 6 characters')
    .regex(/^[A-Z0-9]+$/, 'Bank code must be alphanumeric uppercase')
});

export const validateCashOutBank = validateRequest(cashOutBankSchema);

// Till cash-out
export const cashOutTillSchema = baseCashOutSchema.extend({
  tillNumber: z.string()
    .min(4, 'Invalid till number')
    .max(20, 'Invalid till number')
    .optional()
});

export const validateCashOutTill = validateRequest(cashOutTillSchema);

// Agent cash-out
export const cashOutAgentSchema = baseCashOutSchema.extend({
  agentCode: z.string()
    .min(4, 'Invalid agent code')
    .max(20, 'Invalid agent code')
    .regex(/^[A-Z0-9-]+$/, 'Agent code must be alphanumeric')
    .optional()
});

export const validateCashOutAgent = validateRequest(cashOutAgentSchema);

// Merchant POS cash-out
export const cashOutMerchantSchema = baseCashOutSchema.extend({
  merchantId: z.string()
    .uuid('Invalid merchant ID format')
});

export const validateCashOutMerchant = validateRequest(cashOutMerchantSchema);

// ATM cash-out
export const cashOutATMSchema = baseCashOutSchema.extend({
  atmId: z.string()
    .min(4, 'Invalid ATM ID')
    .max(30, 'Invalid ATM ID')
    .optional()
});

export const validateCashOutATM = validateRequest(cashOutATMSchema);

// ═══════════════════════════════════════════════════════════════════════════
// 💳 LOAN VALIDATION
// ═══════════════════════════════════════════════════════════════════════════

export const loanApplicationSchema = z.object({
  amount: z.number()
    .positive('Loan amount must be positive')
    .min(50, 'Minimum loan is N$50')
    .max(5000, 'Maximum loan is N$5,000')
    .finite('Amount must be a finite number'),
  
  walletId: z.string()
    .uuid('Invalid wallet ID format'),
  
  purpose: z.string()
    .min(5, 'Purpose must be at least 5 characters')
    .max(200, 'Purpose cannot exceed 200 characters')
    .optional()
});

export const validateLoanApplication = validateRequest(loanApplicationSchema);

// ═══════════════════════════════════════════════════════════════════════════
// 🎟️ VOUCHER VALIDATION
// ═══════════════════════════════════════════════════════════════════════════

// Voucher redemption at NamPost
export const redeemVoucherNamPostSchema = z.object({
  location: z.string()
    .min(2, 'Location must be at least 2 characters')
    .max(100, 'Location cannot exceed 100 characters')
    .optional()
});

export const validateRedeemVoucherNamPost = validateRequest(redeemVoucherNamPostSchema);

// Voucher redemption to wallet by 12-digit voucher code
export const redeemVoucherWalletByCodeSchema = z.object({
  voucherCode: z.string()
    .regex(/^\d{12}$/, 'Voucher code must be exactly 12 digits')
});

export const validateRedeemVoucherWalletByCode = validateRequest(redeemVoucherWalletByCodeSchema);

// Voucher redemption at SmartPay
export const redeemVoucherSmartPaySchema = z.object({
  agentCode: z.string()
    .min(4, 'Invalid agent code')
    .max(20, 'Invalid agent code')
    .regex(/^[A-Z0-9-]+$/, 'Agent code must be alphanumeric')
    .optional()
});

export const validateRedeemVoucherSmartPay = validateRequest(redeemVoucherSmartPaySchema);

// ═══════════════════════════════════════════════════════════════════════════
// 🔐 BUFFR CONNECT VALIDATION
// ═══════════════════════════════════════════════════════════════════════════

export const buffrCashOutSchema = z.object({
  amount: z.number()
    .positive('Amount must be positive')
    .min(10, 'Minimum cash-out is N$10')
    .max(10000, 'Maximum cash-out is N$10,000')
    .finite('Amount must be a finite number'),
  
  agentId: z.string()
    .min(4, 'Agent ID must be at least 4 characters')
    .max(50, 'Agent ID cannot exceed 50 characters'),
  
  customerPhone: z.string()
    .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format'),
  
  voucherCode: z.string()
    .min(6, 'Voucher code must be at least 6 characters')
    .max(50, 'Voucher code cannot exceed 50 characters')
    .optional()
});

export const validateBuffrCashOut = validateRequest(buffrCashOutSchema);

export const buffrVoucherValidationSchema = z.object({
  voucherCode: z.string()
    .min(6, 'Voucher code must be at least 6 characters')
    .max(50, 'Voucher code cannot exceed 50 characters')
    .regex(/^[A-Z0-9-]+$/, 'Voucher code must be alphanumeric uppercase')
});

export const validateBuffrVoucherValidation = validateRequest(buffrVoucherValidationSchema);

export const buffrAgentRegistrationSchema = z.object({
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name cannot exceed 100 characters'),
  
  location: z.object({
    latitude: z.number()
      .min(-90, 'Invalid latitude')
      .max(90, 'Invalid latitude'),
    
    longitude: z.number()
      .min(-180, 'Invalid longitude')
      .max(180, 'Invalid longitude'),
    
    address: z.string()
      .min(5, 'Address must be at least 5 characters')
      .max(200, 'Address cannot exceed 200 characters')
      .optional()
  }),
  
  phone: z.string()
    .regex(/^\+264\d{9}$/, 'Phone must be in format: +264XXXXXXXXX')
    .optional()
});

export const validateBuffrAgentRegistration = validateRequest(buffrAgentRegistrationSchema);

// ═══════════════════════════════════════════════════════════════════════════
// 👥 GROUP OPERATIONS VALIDATION
// ═══════════════════════════════════════════════════════════════════════════

export const groupContributeSchema = z.object({
  amount: z.number()
    .positive('Amount must be positive')
    .min(1, 'Minimum amount is N$1')
    .max(50000, 'Maximum amount is N$50,000 per transaction')
    .finite('Amount must be a finite number'),
  
  sourceWalletId: z.string()
    .uuid('Invalid wallet ID format'),
  
  note: z.string()
    .max(500, 'Note cannot exceed 500 characters')
    .optional()
});

export const validateGroupContribute = validateRequest(groupContributeSchema);

export const groupWithdrawSchema = z.object({
  amount: z.number()
    .positive('Amount must be positive')
    .min(1, 'Minimum amount is N$1')
    .max(50000, 'Maximum amount is N$50,000 per transaction')
    .finite('Amount must be a finite number'),
  
  destinationWalletId: z.string()
    .uuid('Invalid wallet ID format'),
  
  reason: z.string()
    .max(500, 'Reason cannot exceed 500 characters')
    .optional()
});

export const validateGroupWithdraw = validateRequest(groupWithdrawSchema);

export const groupSendSchema = z.object({
  amount: z.number()
    .positive('Amount must be positive')
    .min(1, 'Minimum amount is N$1')
    .max(50000, 'Maximum amount is N$50,000 per transaction')
    .finite('Amount must be a finite number'),
  
  beneficiaryId: z.string()
    .uuid('Invalid beneficiary ID format')
    .optional(),
  
  beneficiaryPhone: z.string()
    .regex(/^\+264\d{9}$/, 'Phone must be in format: +264XXXXXXXXX')
    .optional(),
  
  note: z.string()
    .max(500, 'Note cannot exceed 500 characters')
    .optional()
}).refine(
  data => data.beneficiaryId || data.beneficiaryPhone,
  {
    message: 'Either beneficiaryId or beneficiaryPhone is required',
    path: ['beneficiaryId']
  }
);

export const validateGroupSend = validateRequest(groupSendSchema);

// ═══════════════════════════════════════════════════════════════════════════
// 🏢 AGENT OPERATIONS VALIDATION
// ═══════════════════════════════════════════════════════════════════════════

export const agentRegistrationSchema = z.object({
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name cannot exceed 100 characters'),
  
  phone: z.string()
    .regex(/^\+264\d{9}$/, 'Phone must be in format: +264XXXXXXXXX'),
  
  location: z.object({
    latitude: z.number()
      .min(-90, 'Invalid latitude')
      .max(90, 'Invalid latitude'),
    
    longitude: z.number()
      .min(-180, 'Invalid longitude')
      .max(180, 'Invalid longitude')
  }),
  
  agentCode: z.string()
    .length(6, 'Agent code must be exactly 6 characters')
});

export const validateAgentRegistration = validateRequest(agentRegistrationSchema);

// ═══════════════════════════════════════════════════════════════════════════
// 🚨 INCIDENT REPORTING VALIDATION
// ═══════════════════════════════════════════════════════════════════════════

export const incidentCreationSchema = z.object({
  category: z.enum([
    'security_breach',
    'fraud_suspicion',
    'system_error',
    'transaction_dispute',
    'service_outage',
    'data_privacy',
    'other'
  ], {
    errorMap: () => ({ message: 'Invalid incident category' })
  }),
  
  severity: z.enum(['low', 'medium', 'high', 'critical'], {
    errorMap: () => ({ message: 'Severity must be: low, medium, high, or critical' })
  }),
  
  title: z.string()
    .min(5, 'Title must be at least 5 characters')
    .max(200, 'Title cannot exceed 200 characters'),
  
  description: z.string()
    .min(10, 'Description must be at least 10 characters')
    .max(2000, 'Description cannot exceed 2000 characters'),
  
  transactionId: z.string()
    .uuid('Invalid transaction ID format')
    .optional(),
  
  affectedServices: z.array(z.string())
    .optional(),
  
  attachments: z.array(z.string().url('Attachment must be a valid URL'))
    .optional()
});

export const validateIncidentCreation = validateRequest(incidentCreationSchema);

// ═══════════════════════════════════════════════════════════════════════════
// 🔐 KYC SUBMISSION VALIDATION
// ═══════════════════════════════════════════════════════════════════════════

export const kycSubmissionSchema = z.object({
  fullName: z.string()
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Full name cannot exceed 100 characters')
    .refine(val => val.trim().length > 0, 'Full name is required'),
  
  idNumber: z.string()
    .min(5, 'ID number must be at least 5 characters')
    .max(20, 'ID number cannot exceed 20 characters')
    .refine(val => val.trim().length > 0, 'ID number is required'),
  
  idType: z.enum(['national_id', 'passport'], {
    errorMap: () => ({ message: 'ID type must be: national_id or passport' })
  }),
  
  dateOfBirth: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date of birth must be in format: YYYY-MM-DD')
    .refine(val => val.trim().length > 0, 'Date of birth is required'),
  
  address: z.string()
    .min(10, 'Address must be at least 10 characters')
    .max(500, 'Address cannot exceed 500 characters')
    .optional()
});

export const validateKycSubmission = validateRequest(kycSubmissionSchema);

// ═══════════════════════════════════════════════════════════════════════════
// 🔄 EXPORT ALL VALIDATORS
// ═══════════════════════════════════════════════════════════════════════════

export const validators = {
  // Send Money
  sendMoney: validateSendMoney,
  
  // Cash Out
  cashOutBank: validateCashOutBank,
  cashOutTill: validateCashOutTill,
  cashOutAgent: validateCashOutAgent,
  cashOutMerchant: validateCashOutMerchant,
  cashOutATM: validateCashOutATM,
  
  // Loans
  loanApplication: validateLoanApplication,
  
  // Vouchers
  redeemVoucherWalletByCode: validateRedeemVoucherWalletByCode,
  redeemVoucherNamPost: validateRedeemVoucherNamPost,
  redeemVoucherSmartPay: validateRedeemVoucherSmartPay,
  
  // Buffr Connect
  buffrCashOut: validateBuffrCashOut,
  buffrVoucherValidation: validateBuffrVoucherValidation,
  buffrAgentRegistration: validateBuffrAgentRegistration,
  
  // Group Operations
  groupContribute: validateGroupContribute,
  groupWithdraw: validateGroupWithdraw,
  groupSend: validateGroupSend,
  
  // Agent Operations
  agentRegistration: validateAgentRegistration,
  
  // Incident Reporting
  incidentCreation: validateIncidentCreation,
  
  // KYC
  kycSubmission: validateKycSubmission
};
