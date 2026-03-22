/**
 * PSD-9: Balance of Payments (BoP) code mapping for NPS transactions
 * Location: fintech/smartpay/backend/src/lib/bopMapper.ts
 * Reference: PSD-9, NPS Legal Framework
 */

export interface BoPMappingInput {
  transactionType: string;
  paymentStream: string;
  recipientCountry?: string;
  purpose?: string;
}

export interface BoPMappingResult {
  bopCode: string;
  bopDescription: string;
  category: string;
  requiresDeclaration: boolean;
}

/**
 * BoP code categories per NPS PSD-9 requirements
 */
const BOP_CODE_REGISTRY: Record<string, BoPMappingResult> = {
  // Current Account - Goods
  'G001': {
    bopCode: 'G001',
    bopDescription: 'General merchandise exports',
    category: 'goods',
    requiresDeclaration: true,
  },
  'G002': {
    bopCode: 'G002',
    bopDescription: 'General merchandise imports',
    category: 'goods',
    requiresDeclaration: true,
  },
  
  // Current Account - Services
  'S001': {
    bopCode: 'S001',
    bopDescription: 'Transportation services',
    category: 'services',
    requiresDeclaration: false,
  },
  'S002': {
    bopCode: 'S002',
    bopDescription: 'Travel services',
    category: 'services',
    requiresDeclaration: false,
  },
  'S003': {
    bopCode: 'S003',
    bopDescription: 'Communication services',
    category: 'services',
    requiresDeclaration: false,
  },
  'S004': {
    bopCode: 'S004',
    bopDescription: 'Financial services',
    category: 'services',
    requiresDeclaration: false,
  },
  
  // Current Account - Primary Income
  'I001': {
    bopCode: 'I001',
    bopDescription: 'Compensation of employees',
    category: 'primary_income',
    requiresDeclaration: false,
  },
  'I002': {
    bopCode: 'I002',
    bopDescription: 'Investment income - dividends',
    category: 'primary_income',
    requiresDeclaration: true,
  },
  'I003': {
    bopCode: 'I003',
    bopDescription: 'Investment income - interest',
    category: 'primary_income',
    requiresDeclaration: true,
  },
  
  // Current Account - Secondary Income (Transfers)
  'T001': {
    bopCode: 'T001',
    bopDescription: 'Personal remittances',
    category: 'secondary_income',
    requiresDeclaration: false,
  },
  'T002': {
    bopCode: 'T002',
    bopDescription: 'Government grants and aid',
    category: 'secondary_income',
    requiresDeclaration: true,
  },
  'T003': {
    bopCode: 'T003',
    bopDescription: 'Social benefits and pensions',
    category: 'secondary_income',
    requiresDeclaration: false,
  },
  
  // Smartpay-specific domestic codes
  'D001': {
    bopCode: 'D001',
    bopDescription: 'Domestic P2P transfer',
    category: 'domestic',
    requiresDeclaration: false,
  },
  'D002': {
    bopCode: 'D002',
    bopDescription: 'Domestic bill payment',
    category: 'domestic',
    requiresDeclaration: false,
  },
  'D003': {
    bopCode: 'D003',
    bopDescription: 'Domestic cash-out',
    category: 'domestic',
    requiresDeclaration: false,
  },
  'D004': {
    bopCode: 'D004',
    bopDescription: 'Domestic voucher redemption',
    category: 'domestic',
    requiresDeclaration: false,
  },
  'D005': {
    bopCode: 'D005',
    bopDescription: 'Government-to-person disbursement',
    category: 'domestic',
    requiresDeclaration: false,
  },
};

/**
 * Map transaction to BoP code (PSD-9 compliance)
 */
export function mapTransactionToBoPCode(input: BoPMappingInput): BoPMappingResult {
  const { transactionType, paymentStream, recipientCountry, purpose } = input;
  
  // Domestic transactions (within Namibia)
  // Helper function to safely get code with fallback
  const getCode = (code: string, fallback: string = 'D001'): BoPMappingResult => {
    return BOP_CODE_REGISTRY[code] || BOP_CODE_REGISTRY[fallback]!;
  };
  
  if (!recipientCountry || recipientCountry === 'NA') {
    switch (transactionType) {
      case 'send':
      case 'p2p':
        return getCode('D001');
      case 'billpay':
        return getCode('D002');
      case 'cashout':
        return getCode('D003');
      case 'voucher_redeem':
        return getCode('D004');
      case 'g2p_disbursement':
        return getCode('D005');
      default:
        return getCode('D001');
    }
  }
  
  // Cross-border transactions
  if (purpose) {
    switch (purpose.toLowerCase()) {
      case 'remittance':
      case 'family_support':
        return getCode('T001');
      case 'salary':
      case 'wages':
        return getCode('I001');
      case 'goods_payment':
      case 'merchandise':
        return getCode(paymentStream === 'export' ? 'G001' : 'G002');
      case 'services':
        return getCode('S004');
      case 'investment':
      case 'dividend':
        return getCode('I002');
      default:
        return getCode('T001');
    }
  }
  
  // Default: personal remittance for cross-border
  return getCode('T001');
}

/**
 * Validate BoP code exists
 */
export function validateBoPCode(bopCode: string): boolean {
  return bopCode in BOP_CODE_REGISTRY;
}

/**
 * Get BoP code details
 */
export function getBoPCodeDetails(bopCode: string): BoPMappingResult | null {
  return BOP_CODE_REGISTRY[bopCode] ?? null;
}

/**
 * Get all BoP codes for a category
 */
export function getBoPCodesByCategory(category: string): BoPMappingResult[] {
  return Object.values(BOP_CODE_REGISTRY).filter(c => c.category === category);
}
