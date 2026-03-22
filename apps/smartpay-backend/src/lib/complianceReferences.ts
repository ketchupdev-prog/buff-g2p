/**
 * Compliance documentation references for Smartpay.
 * Aligns with PRD §2.3 and §10.3: Namibia KYC/AML and BON Payment System Directives.
 * Location: backend/src/lib/complianceReferences.ts
 */

export interface ComplianceDocRef {
  id: string;
  title: string;
  description: string;
  /** Path relative to project root (e.g. docs/NAMIBIA_KYC_REQUIREMENTS.md) */
  path: string;
  /** Optional external URL for official source */
  url?: string;
}

/**
 * List of compliance reference documents. Served by GET /api/v1/compliance/docs.
 * Used by copilot/app to show "For more information see …" and for developer reference.
 */
export const COMPLIANCE_DOCS: ComplianceDocRef[] = [
  {
    id: 'namibia-kyc',
    title: 'Namibia KYC Requirements',
    description: 'FIA, FIC, NAMFISA; CDD, record-keeping, STR/CTR reporting, PEPs, beneficial ownership, sanctions; official links.',
    path: 'docs/NAMIBIA_KYC_REQUIREMENTS.md',
    url: 'https://www.kycnamibia.com/legislation',
  },
  {
    id: 'bon-psd',
    title: 'BON Payment System Directives (PSD)',
    description: 'PSDIR-4–PSDIR-11 index; e-money interoperability (PSDIR-11), cross-border CMA EFT (PSDIR-10), CMA fees (PSDIR-9), NISS STP (PSDIR-8).',
    path: 'docs/BON_PSD_REFERENCE.md',
    url: 'https://www.bon.com.na/Regulations/Payment-System-Management-Act-2003/Directives.aspx',
  },
];
