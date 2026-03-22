/**
 * Additional Email Templates – Buffr G2P.
 * Extended templates for transactions, KYC, loans, vouchers, groups, and security.
 * Location: backend/src/lib/emailTemplates.ts
 */

// ============================================================================
// Generic Template Generators
// ============================================================================

/**
 * Generic success message template.
 */
export function getGenericSuccessHtml(title: string, message: string, data?: Record<string, string | number>): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin: 0; padding: 0; font-family: sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background: #f5f5f5; padding: 20px;">
    <tr><td align="center">
      <table width="100%" style="max-width: 480px; background: #fff; border-radius: 12px;">
        <tr><td style="background: #10B981; padding: 24px; text-align: center; color: #fff; border-radius: 12px 12px 0 0;">
          <h1 style="margin: 0;">✓ ${title}</h1>
        </td></tr>
        <tr><td style="padding: 24px; text-align: center;">
          <p style="color: #333; font-size: 16px;">${message}</p>
          <p style="color: #666; font-size: 14px; margin-top: 16px;">${data?.footer || 'Thank you for using Buffr!'}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
`.trim();
}

/**
 * Generic info/notification template.
 */
export function getGenericInfoHtml(title: string, message: string, subtext: string, data?: Record<string, string | number>): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin: 0; padding: 0; font-family: sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background: #f5f5f5; padding: 20px;">
    <tr><td align="center">
      <table width="100%" style="max-width: 480px; background: #fff; border-radius: 12px;">
        <tr><td style="background: #3B82F6; padding: 24px; text-align: center; color: #fff; border-radius: 12px 12px 0 0;">
          <h1 style="margin: 0;">ℹ️ ${title}</h1>
        </td></tr>
        <tr><td style="padding: 24px;">
          <p style="color: #333; font-size: 16px;">${message}</p>
          <p style="color: #666; font-size: 14px; margin-top: 8px;">${subtext}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
`.trim();
}

/**
 * Generic alert/warning template.
 */
export function getGenericAlertHtml(title: string, message: string, detail: string, data?: Record<string, string | number>): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin: 0; padding: 0; font-family: sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background: #f5f5f5; padding: 20px;">
    <tr><td align="center">
      <table width="100%" style="max-width: 480px; background: #fff; border-radius: 12px;">
        <tr><td style="background: #F59E0B; padding: 24px; text-align: center; color: #fff; border-radius: 12px 12px 0 0;">
          <h1 style="margin: 0;">⚠️ ${title}</h1>
        </td></tr>
        <tr><td style="padding: 24px;">
          <p style="color: #333; font-size: 16px;">${message}</p>
          <p style="color: #666; font-size: 14px; margin-top: 8px;">${detail}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
`.trim();
}

// ============================================================================
// Transaction Templates
// ============================================================================

/**
 * Money received template.
 */
export function getMoneyReceivedHtml(data?: Record<string, string | number>): string {
  const amount = data?.amount || "0";
  const currency = data?.currency || "N$";
  const sender = data?.sender || "someone";
  const reference = data?.reference || "N/A";
  
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin: 0; padding: 0; font-family: sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background: #f5f5f5; padding: 20px;">
    <tr><td align="center">
      <table width="100%" style="max-width: 480px; background: #fff; border-radius: 12px;">
        <tr><td style="background: #10B981; padding: 24px; text-align: center; color: #fff; border-radius: 12px 12px 0 0;">
          <h1 style="margin: 0;">💰 Money Received!</h1>
        </td></tr>
        <tr><td style="padding: 24px; text-align: center;">
          <p style="color: #666; font-size: 14px;">You received</p>
          <p style="font-size: 36px; font-weight: bold; color: #10B981; margin: 8px 0;">${currency} ${amount}</p>
          <p style="color: #333; font-size: 16px;">from ${sender}</p>
          <p style="color: #999; font-size: 12px; margin-top: 16px;">Reference: ${reference}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
`.trim();
}

/**
 * Money sent confirmation template.
 */
export function getMoneySentHtml(data?: Record<string, string | number>): string {
  const amount = data?.amount || "0";
  const currency = data?.currency || "N$";
  const recipient = data?.recipient || "someone";
  const reference = data?.reference || "N/A";
  
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin: 0; padding: 0; font-family: sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background: #f5f5f5; padding: 20px;">
    <tr><td align="center">
      <table width="100%" style="max-width: 480px; background: #fff; border-radius: 12px;">
        <tr><td style="background: #7C3AED; padding: 24px; text-align: center; color: #fff; border-radius: 12px 12px 0 0;">
          <h1 style="margin: 0;">✅ Money Sent</h1>
        </td></tr>
        <tr><td style="padding: 24px; text-align: center;">
          <p style="color: #666; font-size: 14px;">You sent</p>
          <p style="font-size: 36px; font-weight: bold; color: #7C3AED; margin: 8px 0;">${currency} ${amount}</p>
          <p style="color: #333; font-size: 16px;">to ${recipient}</p>
          <p style="color: #999; font-size: 12px; margin-top: 16px;">Reference: ${reference}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
`.trim();
}

/**
 * Bill payment receipt template.
 */
export function getBillPaymentHtml(data?: Record<string, string | number>): string {
  const amount = data?.amount || "0";
  const currency = data?.currency || "N$";
  const biller = data?.biller || "a biller";
  const reference = data?.reference || "N/A";
  
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin: 0; padding: 0; font-family: sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background: #f5f5f5; padding: 20px;">
    <tr><td align="center">
      <table width="100%" style="max-width: 480px; background: #fff; border-radius: 12px;">
        <tr><td style="background: #3B82F6; padding: 24px; text-align: center; color: #fff; border-radius: 12px 12px 0 0;">
          <h1 style="margin: 0;">💳 Payment Confirmed</h1>
        </td></tr>
        <tr><td style="padding: 24px; text-align: center;">
          <p style="color: #666; font-size: 14px;">Bill payment of</p>
          <p style="font-size: 36px; font-weight: bold; color: #3B82F6; margin: 8px 0;">${currency} ${amount}</p>
          <p style="color: #333; font-size: 16px;">to ${biller}</p>
          <p style="color: #999; font-size: 12px; margin-top: 16px;">Reference: ${reference}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
`.trim();
}

/**
 * Transaction failed template.
 */
export function getTransactionFailedHtml(data?: Record<string, string | number>): string {
  const amount = data?.amount || "0";
  const currency = data?.currency || "N$";
  const reason = data?.reason || "Please try again or contact support.";
  
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin: 0; padding: 0; font-family: sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background: #f5f5f5; padding: 20px;">
    <tr><td align="center">
      <table width="100%" style="max-width: 480px; background: #fff; border-radius: 12px;">
        <tr><td style="background: #EF4444; padding: 24px; text-align: center; color: #fff; border-radius: 12px 12px 0 0;">
          <h1 style="margin: 0;">❌ Transaction Failed</h1>
        </td></tr>
        <tr><td style="padding: 24px; text-align: center;">
          <p style="color: #666; font-size: 14px;">Your transaction of</p>
          <p style="font-size: 36px; font-weight: bold; color: #EF4444; margin: 8px 0;">${currency} ${amount}</p>
          <p style="color: #333; font-size: 16px;">could not be completed.</p>
          <p style="color: #666; font-size: 14px; margin-top: 16px;">${reason}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
`.trim();
}

/**
 * Refund processed template.
 */
export function getRefundHtml(data?: Record<string, string | number>): string {
  const amount = data?.amount || "0";
  const currency = data?.currency || "N$";
  const reference = data?.reference || "N/A";
  
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin: 0; padding: 0; font-family: sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background: #f5f5f5; padding: 20px;">
    <tr><td align="center">
      <table width="100%" style="max-width: 480px; background: #fff; border-radius: 12px;">
        <tr><td style="background: #10B981; padding: 24px; text-align: center; color: #fff; border-radius: 12px 12px 0 0;">
          <h1 style="margin: 0;">↩️ Refund Processed</h1>
        </td></tr>
        <tr><td style="padding: 24px; text-align: center;">
          <p style="color: #666; font-size: 14px;">A refund of</p>
          <p style="font-size: 36px; font-weight: bold; color: #10B981; margin: 8px 0;">${currency} ${amount}</p>
          <p style="color: #333; font-size: 16px;">has been processed to your wallet.</p>
          <p style="color: #999; font-size: 12px; margin-top: 16px;">Reference: ${reference}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
`.trim();
}

// ============================================================================
// Voucher Templates
// ============================================================================

/**
 * Voucher created template.
 */
export function getVoucherCreatedHtml(data?: Record<string, string | number>): string {
  const amount = data?.amount || "0";
  const currency = data?.currency || "N$";
  const voucherCode = data?.voucherCode || "XXXXXX";
  const expiryDate = data?.expiryDate || "30 days";
  
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin: 0; padding: 0; font-family: sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background: #f5f5f5; padding: 20px;">
    <tr><td align="center">
      <table width="100%" style="max-width: 480px; background: #fff; border-radius: 12px;">
        <tr><td style="background: #7C3AED; padding: 24px; text-align: center; color: #fff; border-radius: 12px 12px 0 0;">
          <h1 style="margin: 0;">🎟️ Voucher Created</h1>
        </td></tr>
        <tr><td style="padding: 24px; text-align: center;">
          <p style="color: #666; font-size: 14px;">Your voucher</p>
          <p style="font-size: 36px; font-weight: bold; color: #7C3AED; margin: 8px 0;">${currency} ${amount}</p>
          <p style="color: #333; font-size: 14px; margin-top: 16px;">Code: <strong>${voucherCode}</strong></p>
          <p style="color: #999; font-size: 12px;">Expires: ${expiryDate}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
`.trim();
}

/**
 * Voucher expiring soon template.
 */
export function getVoucherExpiringHtml(data?: Record<string, string | number>): string {
  const amount = data?.amount || "0";
  const currency = data?.currency || "N$";
  const voucherCode = data?.voucherCode || "XXXXXX";
  const expiryDate = data?.expiryDate || "soon";
  
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin: 0; padding: 0; font-family: sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background: #f5f5f5; padding: 20px;">
    <tr><td align="center">
      <table width="100%" style="max-width: 480px; background: #fff; border-radius: 12px;">
        <tr><td style="background: #F59E0B; padding: 24px; text-align: center; color: #fff; border-radius: 12px 12px 0 0;">
          <h1 style="margin: 0;">⏰ Voucher Expiring Soon</h1>
        </td></tr>
        <tr><td style="padding: 24px; text-align: center;">
          <p style="color: #666; font-size: 14px;">Your voucher of</p>
          <p style="font-size: 36px; font-weight: bold; color: #F59E0B; margin: 8px 0;">${currency} ${amount}</p>
          <p style="color: #333; font-size: 14px; margin-top: 16px;">Code: <strong>${voucherCode}</strong></p>
          <p style="color: #EF4444; font-size: 14px; margin-top: 8px;">Expires: ${expiryDate}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
`.trim();
}

/**
 * Voucher expired template.
 */
export function getVoucherExpiredHtml(data?: Record<string, string | number>): string {
  const amount = data?.amount || "0";
  const currency = data?.currency || "N$";
  
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin: 0; padding: 0; font-family: sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background: #f5f5f5; padding: 20px;">
    <tr><td align="center">
      <table width="100%" style="max-width: 480px; background: #fff; border-radius: 12px;">
        <tr><td style="background: #6B7280; padding: 24px; text-align: center; color: #fff; border-radius: 12px 12px 0 0;">
          <h1 style="margin: 0;">❌ Voucher Expired</h1>
        </td></tr>
        <tr><td style="padding: 24px; text-align: center;">
          <p style="color: #666; font-size: 14px;">Your voucher of</p>
          <p style="font-size: 36px; font-weight: bold; color: #6B7280; margin: 8px 0;">${currency} ${amount}</p>
          <p style="color: #333; font-size: 14px; margin-top: 16px;">has expired and can no longer be redeemed.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
`.trim();
}

// ============================================================================
// Loan Templates
// ============================================================================

/**
 * Loan approved template.
 */
export function getLoanApprovedHtml(data?: Record<string, string | number>): string {
  const amount = data?.amount || "0";
  const currency = data?.currency || "N$";
  const loanId = data?.loanId || "N/A";
  
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin: 0; padding: 0; font-family: sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background: #f5f5f5; padding: 20px;">
    <tr><td align="center">
      <table width="100%" style="max-width: 480px; background: #fff; border-radius: 12px;">
        <tr><td style="background: #10B981; padding: 24px; text-align: center; color: #fff; border-radius: 12px 12px 0 0;">
          <h1 style="margin: 0;">🎉 Loan Approved!</h1>
        </td></tr>
        <tr><td style="padding: 24px; text-align: center;">
          <p style="color: #666; font-size: 14px;">Your loan of</p>
          <p style="font-size: 36px; font-weight: bold; color: #10B981; margin: 8px 0;">${currency} ${amount}</p>
          <p style="color: #333; font-size: 14px; margin-top: 16px;">has been approved!</p>
          <p style="color: #999; font-size: 12px; margin-top: 8px;">Loan ID: ${loanId}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
`.trim();
}

/**
 * Loan repayment due template.
 */
export function getLoanRepaymentDueHtml(data?: Record<string, string | number>): string {
  const amount = data?.amount || "0";
  const currency = data?.currency || "N$";
  const dueDate = data?.dueDate || "soon";
  const loanId = data?.loanId || "N/A";
  
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin: 0; padding: 0; font-family: sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background: #f5f5f5; padding: 20px;">
    <tr><td align="center">
      <table width="100%" style="max-width: 480px; background: #fff; border-radius: 12px;">
        <tr><td style="background: #3B82F6; padding: 24px; text-align: center; color: #fff; border-radius: 12px 12px 0 0;">
          <h1 style="margin: 0;">📅 Repayment Due</h1>
        </td></tr>
        <tr><td style="padding: 24px; text-align: center;">
          <p style="color: #666; font-size: 14px;">Your loan repayment of</p>
          <p style="font-size: 36px; font-weight: bold; color: #3B82F6; margin: 8px 0;">${currency} ${amount}</p>
          <p style="color: #333; font-size: 14px;">is due on <strong>${dueDate}</strong></p>
          <p style="color: #999; font-size: 12px; margin-top: 8px;">Loan ID: ${loanId}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
`.trim();
}

/**
 * Loan overdue template.
 */
export function getLoanOverdueHtml(data?: Record<string, string | number>): string {
  const amount = data?.amount || "0";
  const currency = data?.currency || "N$";
  const daysOverdue = data?.daysOverdue || "1";
  const loanId = data?.loanId || "N/A";
  
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin: 0; padding: 0; font-family: sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background: #f5f5f5; padding: 20px;">
    <tr><td align="center">
      <table width="100%" style="max-width: 480px; background: #fff; border-radius: 12px;">
        <tr><td style="background: #EF4444; padding: 24px; text-align: center; color: #fff; border-radius: 12px 12px 0 0;">
          <h1 style="margin: 0;">⚠️ Repayment Overdue</h1>
        </td></tr>
        <tr><td style="padding: 24px; text-align: center;">
          <p style="color: #666; font-size: 14px;">Your loan repayment of</p>
          <p style="font-size: 36px; font-weight: bold; color: #EF4444; margin: 8px 0;">${currency} ${amount}</p>
          <p style="color: #333; font-size: 14px;">is <strong>${daysOverdue} day(s) overdue</strong></p>
          <p style="color: #666; font-size: 14px; margin-top: 16px;">Please make payment immediately to avoid additional fees.</p>
          <p style="color: #999; font-size: 12px; margin-top: 8px;">Loan ID: ${loanId}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
`.trim();
}

// ============================================================================
// Wallet Templates
// ============================================================================

/**
 * Low balance warning template.
 */
export function getLowBalanceHtml(data?: Record<string, string | number>): string {
  const balance = data?.balance || "0";
  const currency = data?.currency || "N$";
  const threshold = data?.threshold || "100";
  
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin: 0; padding: 0; font-family: sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background: #f5f5f5; padding: 20px;">
    <tr><td align="center">
      <table width="100%" style="max-width: 480px; background: #fff; border-radius: 12px;">
        <tr><td style="background: #F59E0B; padding: 24px; text-align: center; color: #fff; border-radius: 12px 12px 0 0;">
          <h1 style="margin: 0;">💸 Low Balance Alert</h1>
        </td></tr>
        <tr><td style="padding: 24px; text-align: center;">
          <p style="color: #666; font-size: 14px;">Your wallet balance is low.</p>
          <p style="font-size: 36px; font-weight: bold; color: #F59E0B; margin: 8px 0;">${currency} ${balance}</p>
          <p style="color: #999; font-size: 14px;">Below threshold: ${currency} ${threshold}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
`.trim();
}

// ============================================================================
// Group Templates
// ============================================================================

/**
 * Group payment received template.
 */
export function getGroupPaymentReceivedHtml(data?: Record<string, string | number>): string {
  const amount = data?.amount || "0";
  const currency = data?.currency || "N$";
  const groupName = data?.groupName || "a group";
  const payer = data?.payer || "someone";
  
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin: 0; padding: 0; font-family: sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background: #f5f5f5; padding: 20px;">
    <tr><td align="center">
      <table width="100%" style="max-width: 480px; background: #fff; border-radius: 12px;">
        <tr><td style="background: #10B981; padding: 24px; text-align: center; color: #fff; border-radius: 12px 12px 0 0;">
          <h1 style="margin: 0;">👥 Group Payment</h1>
        </td></tr>
        <tr><td style="padding: 24px; text-align: center;">
          <p style="color: #666; font-size: 14px;">You received in ${groupName}</p>
          <p style="font-size: 36px; font-weight: bold; color: #10B981; margin: 8px 0;">${currency} ${amount}</p>
          <p style="color: #333; font-size: 14px;">from ${payer}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
`.trim();
}

/**
 * Group payment request template.
 */
export function getGroupRequestHtml(data?: Record<string, string | number>): string {
  const amount = data?.amount || "0";
  const currency = data?.currency || "N$";
  const groupName = data?.groupName || "a group";
  const requester = data?.requester || "Someone";
  
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin: 0; padding: 0; font-family: sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background: #f5f5f5; padding: 20px;">
    <tr><td align="center">
      <table width="100%" style="max-width: 480px; background: #fff; border-radius: 12px;">
        <tr><td style="background: #3B82F6; padding: 24px; text-align: center; color: #fff; border-radius: 12px 12px 0 0;">
          <h1 style="margin: 0;">💰 Payment Request</h1>
        </td></tr>
        <tr><td style="padding: 24px; text-align: center;">
          <p style="color: #666; font-size: 14px;">${requester} requested in ${groupName}</p>
          <p style="font-size: 36px; font-weight: bold; color: #3B82F6; margin: 8px 0;">${currency} ${amount}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
`.trim();
}

// ============================================================================
// Security Templates
// ============================================================================

/**
 * PIN changed template.
 */
export function getPinChangedHtml(data?: Record<string, string | number>): string {
  const timestamp = data?.timestamp || new Date().toLocaleString();
  
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin: 0; padding: 0; font-family: sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background: #f5f5f5; padding: 20px;">
    <tr><td align="center">
      <table width="100%" style="max-width: 480px; background: #fff; border-radius: 12px;">
        <tr><td style="background: #10B981; padding: 24px; text-align: center; color: #fff; border-radius: 12px 12px 0 0;">
          <h1 style="margin: 0;">🔐 PIN Changed</h1>
        </td></tr>
        <tr><td style="padding: 24px; text-align: center;">
          <p style="color: #333; font-size: 16px;">Your Buffr PIN was changed successfully.</p>
          <p style="color: #999; font-size: 14px; margin-top: 16px;">Time: ${timestamp}</p>
          <p style="color: #666; font-size: 14px; margin-top: 16px;">If you didn't change your PIN, please contact support immediately.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
`.trim();
}

/**
 * New device added template.
 */
export function getDeviceAddedHtml(data?: Record<string, string | number>): string {
  const device = data?.device || "Unknown device";
  const location = data?.location || "Unknown location";
  const timestamp = data?.timestamp || new Date().toLocaleString();
  
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin: 0; padding: 0; font-family: sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background: #f5f5f5; padding: 20px;">
    <tr><td align="center">
      <table width="100%" style="max-width: 480px; background: #fff; border-radius: 12px;">
        <tr><td style="background: #F59E0B; padding: 24px; text-align: center; color: #fff; border-radius: 12px 12px 0 0;">
          <h1 style="margin: 0;">📱 New Device Added</h1>
        </td></tr>
        <tr><td style="padding: 24px;">
          <p style="color: #333; font-size: 16px;">A new device was added to your Buffr account:</p>
          <ul style="color: #666; font-size: 14px; margin-top: 8px;">
            <li><strong>Device:</strong> ${device}</li>
            <li><strong>Location:</strong> ${location}</li>
            <li><strong>Time:</strong> ${timestamp}</li>
          </ul>
          <p style="color: #666; font-size: 14px; margin-top: 16px;">If this wasn't you, please contact support immediately.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
`.trim();
}
