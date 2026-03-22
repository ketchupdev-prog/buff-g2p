/**
 * BoN 9 Design Principles: Validation checks for copilot interactions
 * Location: fintech/smartpay/backend/src/lib/designPrincipleChecks.ts
 * Reference: Bank of Namibia Value Proposition Enhancement Final Report 2023
 */

export interface DesignPrincipleCheck {
  principle: string;
  description: string;
  validator: (context: DesignCheckContext) => DesignCheckResult;
}

export interface DesignCheckContext {
  action: string;
  userId?: string;
  walletId?: string;
  amount?: number;
  channel?: string;
  hasInternetConnection?: boolean;
  deviceType?: string;
  literacyLevel?: 'low' | 'medium' | 'high';
  conversationTurns?: number;
}

export interface DesignCheckResult {
  passed: boolean;
  principle: string;
  suggestion?: string;
  severity: 'info' | 'warning' | 'error';
}

/**
 * BoN 9 Design Principles for NPS Digital Payments
 * Source: BoN Value Proposition Enhancement Report §5.2
 */
export const DESIGN_PRINCIPLES: DesignPrincipleCheck[] = [
  {
    principle: 'Accessibility',
    description: 'Service must be accessible to all Namibians, including feature phone users and low-literacy populations',
    validator: (ctx) => {
      if (!ctx.hasInternetConnection && !ctx.channel?.includes('ussd')) {
        return {
          passed: false,
          principle: 'Accessibility',
          suggestion: 'Offer USSD channel as alternative for offline users. Suggest dialing bank USSD code.',
          severity: 'warning',
        };
      }
      
      if (ctx.literacyLevel === 'low' && ctx.conversationTurns && ctx.conversationTurns > 3) {
        return {
          passed: false,
          principle: 'Accessibility',
          suggestion: 'Simplify conversation. Use visual confirmations or audio prompts for low-literacy users.',
          severity: 'warning',
        };
      }
      
      return {
        passed: true,
        principle: 'Accessibility',
        severity: 'info',
      };
    },
  },
  
  {
    principle: 'Affordability',
    description: 'Transaction fees must be transparent, competitive, and not exclude low-income users',
    validator: (ctx) => {
      if (ctx.amount && ctx.amount < 10) {
        return {
          passed: true,
          principle: 'Affordability',
          suggestion: 'Zero-fee transactions under N$10 promote financial inclusion.',
          severity: 'info',
        };
      }
      
      return {
        passed: true,
        principle: 'Affordability',
        severity: 'info',
      };
    },
  },
  
  {
    principle: 'Interoperability',
    description: 'Service must work across banks, mobile networks, and payment providers',
    validator: (ctx) => {
      if (ctx.channel === 'proprietary') {
        return {
          passed: false,
          principle: 'Interoperability',
          suggestion: 'Ensure transaction supports NAMQR or NPS-compliant channels for interoperability.',
          severity: 'error',
        };
      }
      
      return {
        passed: true,
        principle: 'Interoperability',
        severity: 'info',
      };
    },
  },
  
  {
    principle: 'Safety & Security',
    description: 'Transactions must be secure, with fraud prevention and user authentication',
    validator: (ctx) => {
      if (ctx.amount && ctx.amount > 500 && !ctx.userId) {
        return {
          passed: false,
          principle: 'Safety & Security',
          suggestion: 'High-value transactions require user authentication. Request login or 2FA.',
          severity: 'error',
        };
      }
      
      return {
        passed: true,
        principle: 'Safety & Security',
        severity: 'info',
      };
    },
  },
  
  {
    principle: 'Transparency',
    description: 'Users must understand fees, limits, and transaction details before confirming',
    validator: (ctx) => {
      if (ctx.action === 'send' || ctx.action === 'cashout') {
        return {
          passed: true,
          principle: 'Transparency',
          suggestion: 'Always display fee breakdown and final amount before user confirms transaction.',
          severity: 'info',
        };
      }
      
      return {
        passed: true,
        principle: 'Transparency',
        severity: 'info',
      };
    },
  },
  
  {
    principle: 'Efficiency',
    description: 'Minimize steps and friction in user journeys',
    validator: (ctx) => {
      if (ctx.conversationTurns && ctx.conversationTurns > 5) {
        return {
          passed: false,
          principle: 'Efficiency',
          suggestion: 'Conversation has exceeded 5 turns. Simplify flow or offer direct action buttons.',
          severity: 'warning',
        };
      }
      
      return {
        passed: true,
        principle: 'Efficiency',
        severity: 'info',
      };
    },
  },
  
  {
    principle: 'Consumer Protection',
    description: 'Users must have recourse for disputes and clear terms of service',
    validator: (ctx) => {
      if (ctx.action === 'dispute' || ctx.action === 'refund') {
        return {
          passed: true,
          principle: 'Consumer Protection',
          suggestion: 'Provide clear dispute resolution process and contact information.',
          severity: 'info',
        };
      }
      
      return {
        passed: true,
        principle: 'Consumer Protection',
        severity: 'info',
      };
    },
  },
  
  {
    principle: 'Financial Inclusion',
    description: 'Design must prioritize unbanked and underbanked populations',
    validator: (ctx) => {
      if (ctx.action === 'onboarding' || ctx.action === 'kyc') {
        return {
          passed: true,
          principle: 'Financial Inclusion',
          suggestion: 'Simplify KYC for basic accounts. Support digital ID and alternative verification methods.',
          severity: 'info',
        };
      }
      
      return {
        passed: true,
        principle: 'Financial Inclusion',
        severity: 'info',
      };
    },
  },
  
  {
    principle: 'Data Privacy',
    description: 'User data must be protected per BoN and ETA 2019 requirements',
    validator: (ctx) => {
      return {
        passed: true,
        principle: 'Data Privacy',
        suggestion: 'Ensure all user data is encrypted in transit and at rest. Log access per ETA 2019 §24-25.',
        severity: 'info',
      };
    },
  },
];

/**
 * Run all design principle checks for a given context
 */
export function runDesignPrincipleChecks(context: DesignCheckContext): DesignCheckResult[] {
  return DESIGN_PRINCIPLES.map(principle => principle.validator(context));
}

/**
 * Check if any critical design principles failed
 */
export function hasDesignPrincipleViolations(results: DesignCheckResult[]): boolean {
  return results.some(r => !r.passed && r.severity === 'error');
}

/**
 * Get design principle suggestions for UI
 */
export function getDesignPrincipleSuggestions(results: DesignCheckResult[]): string[] {
  return results
    .filter(r => r.suggestion && (!r.passed || r.severity === 'warning'))
    .map(r => r.suggestion as string);
}
