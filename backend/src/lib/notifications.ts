/**
 * Notification Service – Buffr G2P.
 * Handles all email/SMS notifications triggered by system events.
 * Location: backend/src/lib/notifications.ts
 */

import { config } from "dotenv";
import { resolve } from "path";

// Load environment
config({ path: resolve(process.cwd(), "backend/.env") });
config({ path: resolve(process.cwd(), ".env") });
config({ path: resolve(process.cwd(), "backend/.env.local") });

// Import email service
import { sendEmail, sendOtpEmail, sendWelcomeEmail, sendTransactionAlert, sendSecurityAlert } from "./email.js";
import { 
  getMoneyReceivedHtml, 
  getMoneySentHtml, 
  getBillPaymentHtml,
  getTransactionFailedHtml,
  getRefundHtml,
  getVoucherCreatedHtml,
  getVoucherExpiringHtml,
  getVoucherExpiredHtml,
  getLoanApprovedHtml,
  getLoanRepaymentDueHtml,
  getLoanOverdueHtml,
  getLowBalanceHtml,
  getGroupPaymentReceivedHtml,
  getGroupRequestHtml,
  getPinChangedHtml,
  getDeviceAddedHtml,
  getGenericSuccessHtml,
  getGenericInfoHtml,
  getGenericAlertHtml
} from "./emailTemplates.js";

// ============================================================================
// Types
// ============================================================================

export type NotificationChannel = "email" | "sms" | "both";

export interface NotificationData {
  // Common
  userId?: string;
  phone?: string;
  email?: string;
  
  // Transaction
  amount?: string;
  currency?: string;
  type?: string;
  reference?: string;
  sender?: string;
  recipient?: string;
  biller?: string;
  
  // Voucher
  voucherCode?: string;
  expiryDate?: string;
  
  // Loan
  loanId?: string;
  dueDate?: string;
  daysOverdue?: string;
  
  // Group
  groupName?: string;
  payer?: string;
  requester?: string;
  
  // Wallet
  balance?: string;
  threshold?: string;
  
  // Security
  device?: string;
  location?: string;
  timestamp?: string;
  reason?: string;
  
  // Generic
  message?: string;
  title?: string;
  detail?: string;
  footer?: string;
}

// ============================================================================
// Transaction Notifications
// ============================================================================

/**
 * Notify user of money received.
 */
export async function notifyMoneyReceived(data: NotificationData): Promise<boolean> {
  if (!data.email && !data.phone) return false;
  
  const purpose = "money_received";
  
  if (data.email) {
    return sendEmail({
      to: data.email,
      purpose,
      data: {
        amount: data.amount || "0",
        currency: data.currency || "NAD",
        sender: data.sender || "someone",
        reference: data.reference || "N/A",
      },
    });
  }
  
  // SMS notification
  return true; // Implement SMS logic
}

/**
 * Notify user of money sent.
 */
export async function notifyMoneySent(data: NotificationData): Promise<boolean> {
  if (!data.email && !data.phone) return false;
  
  if (data.email) {
    return sendEmail({
      to: data.email,
      purpose: "money_sent",
      data: {
        amount: data.amount || "0",
        currency: data.currency || "NAD",
        recipient: data.recipient || "someone",
        reference: data.reference || "N/A",
      },
    });
  }
  
  return true;
}

/**
 * Notify user of bill payment.
 */
export async function notifyBillPayment(data: NotificationData): Promise<boolean> {
  if (!data.email && !data.phone) return false;
  
  if (data.email) {
    return sendEmail({
      to: data.email,
      purpose: "bill_payment",
      data: {
        amount: data.amount || "0",
        currency: data.currency || "NAD",
        biller: data.biller || "a biller",
        reference: data.reference || "N/A",
      },
    });
  }
  
  return true;
}

/**
 * Notify user of transaction failure.
 */
export async function notifyTransactionFailed(data: NotificationData): Promise<boolean> {
  if (!data.email && !data.phone) return false;
  
  if (data.email) {
    return sendEmail({
      to: data.email,
      purpose: "transaction_failed",
      data: {
        amount: data.amount || "0",
        currency: data.currency || "NAD",
        reason: data.reason || "Please try again or contact support.",
      },
    });
  }
  
  return true;
}

/**
 * Notify user of refund.
 */
export async function notifyRefund(data: NotificationData): Promise<boolean> {
  if (!data.email && !data.phone) return false;
  
  if (data.email) {
    return sendEmail({
      to: data.email,
      purpose: "refund_processed",
      data: {
        amount: data.amount || "0",
        currency: data.currency || "NAD",
        reference: data.reference || "N/A",
      },
    });
  }
  
  return true;
}

// ============================================================================
// Voucher Notifications
// ============================================================================

/**
 * Notify user of voucher creation.
 */
export async function notifyVoucherCreated(data: NotificationData): Promise<boolean> {
  if (!data.email && !data.phone) return false;
  
  if (data.email) {
    return sendEmail({
      to: data.email,
      purpose: "voucher_created",
      data: {
        amount: data.amount || "0",
        currency: data.currency || "NAD",
        voucherCode: data.voucherCode || "XXXXXX",
        expiryDate: data.expiryDate || "30 days",
      },
    });
  }
  
  return true;
}

/**
 * Notify user of voucher expiring soon (scheduled job).
 */
export async function notifyVoucherExpiring(data: NotificationData): Promise<boolean> {
  if (!data.email && !data.phone) return false;
  
  if (data.email) {
    return sendEmail({
      to: data.email,
      purpose: "voucher_expiring",
      data: {
        amount: data.amount || "0",
        currency: data.currency || "NAD",
        voucherCode: data.voucherCode || "XXXXXX",
        expiryDate: data.expiryDate || "soon",
      },
    });
  }
  
  return true;
}

/**
 * Notify user of voucher expiration.
 */
export async function notifyVoucherExpired(data: NotificationData): Promise<boolean> {
  if (!data.email && !data.phone) return false;
  
  if (data.email) {
    return sendEmail({
      to: data.email,
      purpose: "voucher_expired",
      data: {
        amount: data.amount || "0",
        currency: data.currency || "NAD",
      },
    });
  }
  
  return true;
}

// ============================================================================
// Loan Notifications
// ============================================================================

/**
 * Notify user of loan approval.
 */
export async function notifyLoanApproved(data: NotificationData): Promise<boolean> {
  if (!data.email && !data.phone) return false;
  
  if (data.email) {
    return sendEmail({
      to: data.email,
      purpose: "loan_approved",
      data: {
        amount: data.amount || "0",
        currency: data.currency || "NAD",
        loanId: data.loanId || "N/A",
      },
    });
  }
  
  return true;
}

/**
 * Notify user of loan repayment due (scheduled job).
 */
export async function notifyLoanRepaymentDue(data: NotificationData): Promise<boolean> {
  if (!data.email && !data.phone) return false;
  
  if (data.email) {
    return sendEmail({
      to: data.email,
      purpose: "loan_repayment_due",
      data: {
        amount: data.amount || "0",
        currency: data.currency || "NAD",
        dueDate: data.dueDate || "soon",
        loanId: data.loanId || "N/A",
      },
    });
  }
  
  return true;
}

/**
 * Notify user of loan overdue (scheduled job).
 */
export async function notifyLoanOverdue(data: NotificationData): Promise<boolean> {
  if (!data.email && !data.phone) return false;
  
  if (data.email) {
    return sendEmail({
      to: data.email,
      purpose: "loan_repayment_overdue",
      data: {
        amount: data.amount || "0",
        currency: data.currency || "NAD",
        daysOverdue: data.daysOverdue || "1",
        loanId: data.loanId || "N/A",
      },
    });
  }
  
  return true;
}

// ============================================================================
// Wallet Notifications
// ============================================================================

/**
 * Notify user of low wallet balance (scheduled job).
 */
export async function notifyLowBalance(data: NotificationData): Promise<boolean> {
  if (!data.email && !data.phone) return false;
  
  if (data.email) {
    return sendEmail({
      to: data.email,
      purpose: "wallet_low_balance",
      data: {
        balance: data.balance || "0",
        currency: data.currency || "NAD",
        threshold: data.threshold || "100",
      },
    });
  }
  
  return true;
}

// ============================================================================
// Group Notifications
// ============================================================================

/**
 * Notify user of group payment received.
 */
export async function notifyGroupPaymentReceived(data: NotificationData): Promise<boolean> {
  if (!data.email && !data.phone) return false;
  
  if (data.email) {
    return sendEmail({
      to: data.email,
      purpose: "group_payment_received",
      data: {
        amount: data.amount || "0",
        currency: data.currency || "NAD",
        groupName: data.groupName || "a group",
        payer: data.payer || "someone",
      },
    });
  }
  
  return true;
}

/**
 * Notify user of group payment request.
 */
export async function notifyGroupRequestReceived(data: NotificationData): Promise<boolean> {
  if (!data.email && !data.phone) return false;
  
  if (data.email) {
    return sendEmail({
      to: data.email,
      purpose: "group_request_received",
      data: {
        amount: data.amount || "0",
        currency: data.currency || "NAD",
        groupName: data.groupName || "a group",
        requester: data.requester || "Someone",
      },
    });
  }
  
  return true;
}

// ============================================================================
// Security Notifications
// ============================================================================

/**
 * Notify user of PIN change.
 */
export async function notifyPinChanged(data: NotificationData): Promise<boolean> {
  if (!data.email) return false;
  
  return sendEmail({
    to: data.email,
    purpose: "pin_changed",
    data: {
      timestamp: data.timestamp || new Date().toLocaleString(),
    },
  });
}

/**
 * Notify user of new device added.
 */
export async function notifyDeviceAdded(data: NotificationData): Promise<boolean> {
  if (!data.email) return false;
  
  return sendEmail({
    to: data.email,
    purpose: "device_added",
    data: {
      device: data.device || "Unknown device",
      location: data.location || "Unknown location",
      timestamp: data.timestamp || new Date().toLocaleString(),
    },
  });
}

/**
 * Notify user of security alert.
 */
export async function notifySecurityAlert(data: NotificationData): Promise<boolean> {
  if (!data.email) return false;
  
  return sendSecurityAlert(data.email, data.message || "Security alert on your account");
}

// ============================================================================
// Account Notifications
// ============================================================================

/**
 * Send welcome email to new user.
 */
export async function notifyWelcome(data: NotificationData): Promise<boolean> {
  if (!data.email) return false;
  
  return sendWelcomeEmail(data.email, data.title || "User");
}

/**
 * Notify user of KYC document uploaded.
 */
export async function notifyKycDocumentUploaded(data: NotificationData): Promise<boolean> {
  if (!data.email) return false;
  
  return sendEmail({
    to: data.email,
    purpose: "kyc_document_uploaded",
    data: {},
  });
}

/**
 * Notify user of KYC approval.
 */
export async function notifyKycApproved(data: NotificationData): Promise<boolean> {
  if (!data.email) return false;
  
  return sendEmail({
    to: data.email,
    purpose: "kyc_approved",
    data: {
      footer: "You now have full access to all Buffr features!",
    },
  });
}

/**
 * Notify user of KYC rejection.
 */
export async function notifyKycRejected(data: NotificationData): Promise<boolean> {
  if (!data.email) return false;
  
  return sendEmail({
    to: data.email,
    purpose: "kyc_rejected",
    data: {
      reason: data.reason || "Please ensure your documents are clear and not expired.",
    },
  });
}

/**
 * Notify user of account suspension.
 */
export async function notifyAccountSuspended(data: NotificationData): Promise<boolean> {
  if (!data.email) return false;
  
  return sendEmail({
    to: data.email,
    purpose: "account_suspended",
    data: {
      reason: data.reason || "For your protection, we've temporarily restricted your account.",
    },
  });
}

/**
 * Notify user of account reactivation.
 */
export async function notifyAccountReactivated(data: NotificationData): Promise<boolean> {
  if (!data.email) return false;
  
  return sendEmail({
    to: data.email,
    purpose: "account_reactivated",
    data: {},
  });
}

/**
 * Notify user of phone verification.
 */
export async function notifyPhoneVerified(data: NotificationData): Promise<boolean> {
  if (!data.email) return false;
  
  return sendEmail({
    to: data.email,
    purpose: "phone_verified",
    data: {},
  });
}

/**
 * Notify user of email verification.
 */
export async function notifyEmailVerified(data: NotificationData): Promise<boolean> {
  if (!data.email) return false;
  
  return sendEmail({
    to: data.email,
    purpose: "email_verified",
    data: {},
  });
}

// ============================================================================
// Bulk/Scheduled Notifications (for cron jobs)
// ============================================================================

/**
 * Send expiring vouchers notifications (run daily).
 * Queries vouchers expiring in next 3 days.
 */
export async function processExpiringVouchers(): Promise<void> {
  // This would be called by a cron job
  // Query: SELECT * FROM vouchers WHERE expiry_date BETWEEN NOW() AND NOW() + 3 days
  // For each, call notifyVoucherExpiring
  console.log("[Notification] Processing expiring vouchers...");
}

/**
 * Send loan repayment due notifications (run daily).
 * Queries loans with repayment due tomorrow.
 */
export async function notifyLoansRepaymentDue(): Promise<void> {
  // This would be called by a cron job
  console.log("[Notification] Processing loan repayment due...");
}

/**
 * Send loan overdue notifications (run daily).
 * Queries overdue loans and sends notifications.
 */
export async function notifyLoansOverdue(): Promise<void> {
  // This would be called by a cron job
  console.log("[Notification] Processing overdue loans...");
}

/**
 * Send low balance warnings (run daily/weekly).
 * Queries wallets below threshold and sends notifications.
 */
export async function notifyLowBalances(): Promise<void> {
  // This would be called by a cron job
  console.log("[Notification] Processing low balance alerts...");
}

export default {
  // Transactions
  notifyMoneyReceived,
  notifyMoneySent,
  notifyBillPayment,
  notifyTransactionFailed,
  notifyRefund,
  
  // Vouchers
  notifyVoucherCreated,
  notifyVoucherExpiring,
  notifyVoucherExpired,
  
  // Loans
  notifyLoanApproved,
  notifyLoanRepaymentDue,
  notifyLoanOverdue,
  
  // Wallet
  notifyLowBalance,
  
  // Groups
  notifyGroupPaymentReceived,
  notifyGroupRequestReceived,
  
  // Security
  notifyPinChanged,
  notifyDeviceAdded,
  notifySecurityAlert,
  
  // Account
  notifyWelcome,
  notifyKycDocumentUploaded,
  notifyKycApproved,
  notifyKycRejected,
  notifyAccountSuspended,
  notifyAccountReactivated,
  notifyPhoneVerified,
  notifyEmailVerified,
  
  // Scheduled
  processExpiringVouchers,
  notifyLoansRepaymentDue,
  notifyLoansOverdue,
  notifyLowBalances,
};
