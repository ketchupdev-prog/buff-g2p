# Buffr AI Companion – Curated Knowledge Base

This document is the **manifest of everything ingested** into the Buffr AI knowledge base. The companion retrieves only from this curated set. Content is **user-isolated**: global articles are available to all users; any future user-specific articles are restricted to the owning user. No internal paths, code, or implementation details are listed here to protect IP.

---

## What we ingest (single source)

All beneficiary-facing knowledge is ingested from **one consolidated document**:

| Document | Description |
|----------|-------------|
| **Buffr Knowledge Base (Complete)** | Single markdown document with 17 sections: Getting Started (including USSD *123#), Wallets, Vouchers, Cash-Out, Sending/Receiving, Groups, Loans, Bills, Cards, Profile/Settings, Fees, Complaints (including NAMFISA), Security, Regulatory Info (tax/NamRA, NAMFISA, FIMA, NamClear, Instant Payment Project), Financial Literacy, Troubleshooting, Contact (including NAMFISA). Filename: `buffr_knowledge_base.md` (in project docs). |

Everything the companion needs to answer user questions comes from that document. No other internal files or codebases are ingested.

---

## 1. Getting Started with Buffr

- What is Buffr; create account (download, OTP, name, photo, biometric); lost phone / changed number; is Buffr safe (encryption, funds safeguarded and separate from Buffr, 2FA, BoN regulation). **1.5 USSD (*123#):** feature-phone access – balance, redeem voucher (SMS cash-out code), cash-out code, pay bills, airtime, proof-of-life; all actions confirmed by SMS.

---

## 2. Wallets and Balances

- What is a wallet; how many wallets (Main + create more, icon, name, Auto-Pay); add money (bank transfer, card, redeem voucher); transfer between own wallets; Auto-Pay (frequency, amount, payment method).

---

## 3. Vouchers (Government Grants)

- Types (old-age, disability, child support, veterans, foster care); how to receive (SMS, in-app); redeem (A: to wallet, B: cash at NamPost, C: cash at SmartPay) with step-by-step; expiry and reminders; cannot share voucher.

---

## 4. Cash-Out Methods

- Overview table (Till free, Agent N$5, Merchant N$3, ATM N$8, Bank N$5); Cash at Till (scan till QR, amount, confirm); Cash at Agent (map, scan agent QR); Cash at Merchant; Cash at ATM (cardless/QR cash); Bank transfer (linked account, 1–2 days).

---

## 5. Sending and Receiving Money

- Send to Buffr user (Send FAB, recipient, amount, wallet, PIN/biometric); receive (notification, add to wallet or cash out); My QR Code; payment request (pay now / decline).

---

## 6. Groups

- What are groups (shared balance, send, request, track); create group (name, members); add/remove members (admin); send to group; request from group (progress).

---

## 7. Loans (Voucher-Backed Advances)

- What is voucher-backed loan; who can apply (grant history); max 1/3 of last voucher; repayment automatic on next voucher (15% interest); cannot “miss” – automatic deduction.

---

## 8. Bill Payments

- What bills (electricity, water, TV, rates, school, airtime); how to pay (category, biller, account number, amount, confirm); payment fails = money not deducted, retry or contact support.

---

## 9. Cards

- Buffr Card (virtual, display only); add bank card (scan or manual, number, expiry, CVV); safe storage (encrypted, PCI-DSS).

---

## 10. Profile and Settings

- Update personal info (name, photo; phone may need support); change PIN (Security); enable Face ID / fingerprint (Biometric login); proof-of-life (90 days, in-app or agent/NamPost, frozen if missed – see §16.5).

---

## 11. Fees and Charges

- Detailed fee table (top-up, cash-out by method, send, bills, wallets, groups, loan interest, card linking); no hidden fees.

---

## 12. Complaints and Disputes

- How to complain (in-app Help, email george@buffr.ai, phone, in person); acknowledge 24h, response 15 business days; escalate to senior officer; escalate to Bank of Namibia (after 3 months, complaints@bon.com.na, online form, address, phone). **12.5 NAMFISA:** NAMFISA supervises non-banking institutions (insurance, pension, medical aid); Buffr is under BoN (payment/e-money). For Buffr complaints → BoN; for insurance/pension/medical aid → NAMFISA (toll-free 0800 290 500, complaintsdept@namfisa.com.na, address; first contact institution then escalate; report malpractices).

---

## 13. Security and Safety

- How Buffr protects money (funds safeguarded under BoN rules, 2FA, encryption); suspect fraud (change PIN, call support, report); avoid scams (never share PIN/OTP, trusted QRs only); 2FA explained (something you know + something you have).

---

## 14. Regulatory Information

- Buffr licence and oversight (BoN, payment service provider, e-money issuer); ETA (binding records, electronic signature, 5-year retention); PSD-1, PSD-3, PSD-12; NAMQR (unique QR, signed merchant QRs, checksum); Open Banking (OAuth, no bank login to Buffr). **14.6 Tax and NamRA:** VAT in fees; grants/voucher redemptions generally not taxable; NamRA (Namibia Revenue Agency) for tax; ITAS (itas.namra.org.na) for filing and taxpayer education; tax amnesty programmes – check NamRA; Buffr does not give tax advice. **14.7 NAMFISA and consumer protection:** NAMFISA supervises non-banking institutions (insurance, pension, medical aid) under FIMA; consumer protection; Buffr regulated by BoN, not NAMFISA; when to contact BoN vs NAMFISA. **14.8 FIMA:** Financial Institutions and Markets Act governs non-banking institutions (pension, insurance, medical aid); NAMFISA supervises under FIMA; Buffr under BoN (Payment System Management Act), not FIMA. **14.9 NamClear:** Namibia's Automated Clearing House; clears/settles interbank and card payments via NISS; NamPay, NamSwitch; users don't interact with NamClear directly – banks and Buffr connect to it. **14.10 Instant Payment Project (IPP):** BoN-led national instant payment system (kick-off 2024, planned launch in coming years); any device including feature phones; interoperable for banks and licensed providers (e.g. Buffr); financial inclusion, rural/informal; check BoN for latest status.

---

## 15. Financial Literacy

- Budgeting (track, limits, 50/30/20); saving (pay yourself first, Auto-Pay, goals); credit (financial health score, interest, borrow responsibly); managing grants (schedule, reminders). **External resources (15.5):** FLI Namibia, BoN Consumer Education, **NamRA/ITAS** (itas.namra.org.na – tax education and filing), **NAMFISA** (consumer protection for insurance/pension/medical aid), Ministry of Gender Equality for grant eligibility.

---

## 16. Troubleshooting Common Issues

- Forgot PIN (Forgot PIN?, OTP, new PIN); transaction failed (connection, balance, QR expiry, contact support); network error (Wi-Fi/data, restart app); QR won’t scan (camera, manual code); wallet frozen (proof-of-life, NamPost/SmartPay biometric unfreeze; or unusual activity – contact support); voucher “already redeemed” (contact support); error codes E001–E010 (PIN, expired, insufficient balance, voucher expired, QR invalid, timeout, locked, 2FA, daily limit, service unavailable).

---

## 17. Contact and Support

- In-app Help and Contact Us (FAQs, chat, request); email george@buffr.ai; phone +264 814376206 (24/7); office Buffr Financial Services, Windhoek; Bank of Namibia (complaints@bon.com.na, website, address, phone). **17.6 NAMFISA:** For insurance/pension/medical aid complaints – toll-free 0800 290 500, +264 61 290 5134/5000, complaintsdept@namfisa.com.na, website, P.O. Box 21250, 51–55 Werner List Street, Gutenberg Plaza, Windhoek.

---

## Isolation rules

- **Global content** – The ingested document is stored with `scope = 'global'`. All users can retrieve from it.
- **User-specific content** – Not yet used. If added later, such content will have `scope = 'user'` and `user_id`. Retrieval will only return global articles or articles for the current user. No cross-user leakage.

---

## Technical ingest notes (for operators only)

- **Script:** The ingestion script reads the consolidated document and upserts it into the knowledge base store. Run from the backend directory with the project’s Python environment and env loaded.

```bash
cd backend && PYTHONPATH=. python scripts/ingest_knowledge_base.py
```

- **Re-run:** After any change to the consolidated document, re-run ingestion so the companion has the latest text.

---

*Manifest maintained by the Buffr product team. Last updated: 2026‑03.*
