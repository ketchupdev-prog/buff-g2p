/**
 * Standard legal disclaimers and consent text – Buffr G2P.
 * Aligned with Payment System Management Act 2003 (as amended), PSD-1, PSD-3, ETA 4 of 2019, Bank of Namibia.
 * Full documents: constants/legalDocuments.ts. Referenced in PRD §12.4.3, §12.6.
 * Location: constants/legalTerms.ts
 */
import { LEGAL_DOCUMENTS_VERSION_DATE } from './legalDocuments';

export const LEGAL_TERMS = {
  /** Version date for display in app */
  versionDate: LEGAL_DOCUMENTS_VERSION_DATE,

  userAgreementIntro:
    'By using Buffr G2P you agree to our Terms of Service and Privacy Policy. Fees and charges apply as displayed in the app.',

  /** PSD-1 §10.4.2(b), PSD-3 §14 – redemption conditions and fees */
  redemptionRights:
    'You have the right to redeem your e-money balance for cash. Redemption to your Buffr wallet is free and instant. Cash-out at Till is free; at Agent N$5, at Merchant N$3, at ATM N$8, Bank transfer N$5. Conditions and fees may change with notice; current fees are always shown in the app before you confirm.',

  /** PSD-1 §10.4.1(c), PSD-3 §14.3 – fees and charges disclosure */
  feesAndCharges:
    'Cash-out: Till free; Agent N$5; Merchant N$3; ATM N$8; Bank transfer N$5. Voucher redemption to wallet, NamPost and SmartPay cash collection: free. Send money, bill pay and merchant payments: no fee. Other fees may apply as shown in-app. Rates are subject to change; we will display any changes before they take effect.',

  /** PSD-1 §16.6–16.13 – complaints process */
  complaintsProcess:
    'We will acknowledge every complaint upon receipt. We will provide a substantive response within 15 working days of receipt. Complaints must be lodged in writing within 90 days of the date of the incident. If you are not satisfied with our response, you may request escalation to a suitably qualified person within our organisation.',

  /** PSD-1 §16.10 – escalation and regulator */
  complaintsEscalation:
    'If you are not satisfied with our decision, you may request that your complaint be examined by a qualified person within our organisation. For payment system matters you may also contact the Bank of Namibia.',

  /** ETA – consent for payment (advanced electronic signature) */
  consentPayment:
    'I authorise this payment from my Buffr wallet. I understand that this action is legally binding as an advanced electronic signature under the Electronic Transactions Act 4 of 2019.',

  /** Short notice for Contact us / Help centre */
  complaintsNotice:
    'All complaints are acknowledged on receipt. We respond within 15 working days. Complaints must be lodged in writing within 90 days of the incident. You may request escalation if you are not satisfied. For payment system matters you may also contact the Bank of Namibia.',
} as const;
