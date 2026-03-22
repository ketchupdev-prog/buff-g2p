# Smartpay Vouchers vs Virtual Assets Act, 2023 (Act No. 10 of 2023)

**Question:** Do Smartpay’s vouchers (G2P / partner-issued entitlements) fall under the Virtual Assets Act?  
**Conclusion:** **No.** Smartpay vouchers are not virtual assets and are not virtual asset services. They are outside the Act’s scope on three independent grounds: (1) they do not use DLT; (2) they are digital representations of/claims to fiat (NAD), which the Act excludes; (3) they qualify as closed-loop items under Part 2 of Schedule 2.

---

## 1. Virtual Assets Act – relevant definitions

**Virtual asset** (s 1) means a digital representation of value that:
- (a) can be digitally transferred, stored or traded;
- (b) **uses a distribution ledger technology or similar technology**; and
- (c) can be used for payment or investment purposes;

**and** does **not** include:
- digital representations of **fiat currencies**, and
- securities or other financial assets regulated under the securities or financial assets law of Namibia.

**Virtual asset services** (Part 1 of Schedule 2) include: initial token offering; exchanging virtual asset for virtual asset or for fiat; transfer of virtual assets; operating a virtual asset exchange; safekeeping/administration of virtual assets; participation in/provision of financial services related to a token issuer’s offer/sale of virtual assets.

**Excluded (Part 2 of Schedule 2)** – the following are **not** virtual asset services:
- **(a) Closed-loop items** which are **non-transferable**, **non-exchangeable**, and **cannot be used for payment or investment purposes**, and which a person **cannot sell onward on a secondary market** outside of the closed-loop system.

---

## 2. What Smartpay vouchers are (from PRD and codebase)

- **Purpose:** Government-to-person (G2P) and partner-issued entitlements (e.g. social grants). Issuer (government/partner) credits a beneficiary with a voucher; beneficiary redeems for NAD (cash or e-money).
- **Data model:** Stored in PostgreSQL (`vouchers` table): `id`, `user_id`, `amount`, `currency` (NAD), `status` (e.g. available, redeemed, expired), `type`, `programme`, `expires_at`, `external_id`. No blockchain or DLT.
- **Redemption:** One-time use; assigned to a single user (`user_id`). Redemption methods:
  - **To wallet:** credit e-money (NAD) to the user’s Smartpay wallet.
  - **NamPost:** generate collection code for cash at NamPost.
  - **SmartPay agent:** generate code for cash at SmartPay agent.
- **Transferability:** No P2P transfer of the voucher itself; no trading or secondary market. Beneficiary either redeems (and voucher is consumed) or it expires.
- **Technology:** Central database (Neon/PostgreSQL), REST APIs, mobile app. No distributed ledger, no blockchain, no “similar technology” to DLT.

---

## 3. Analysis against the Act

### 3.1 Virtual asset definition – DLT requirement (s 1(b))

The Act requires that a virtual asset use **“a distribution ledger technology or similar technology.”**

Smartpay vouchers are records in a **centralised relational database**. They are not recorded on a blockchain or any distributed ledger. They therefore **do not satisfy** limb (b) of the definition of “virtual asset” and **are not virtual assets** under the Act for that reason alone.

### 3.2 Exclusion: digital representations of fiat (s 1)

The Act **excludes** “digital representations of fiat currencies.”

Smartpay vouchers represent a **claim to Namibia Dollar (NAD)**. On redemption they are converted into either (i) e-money (NAD) in a wallet, or (ii) cash (NAD) via NamPost/agent. E-money issued under PSD-3 is a digital representation of fiat. Vouchers are entitlements to receive that fiat (or e-money). As such they fall within the exclusion for digital representations of fiat and are **not** virtual assets.

### 3.3 Excluded services: closed-loop items (Part 2 of Schedule 2)

Part 2 of Schedule 2 states that “closed-loop items” that are **non-transferable**, **non-exchangeable**, cannot be used for **payment or investment purposes**, and cannot be **sold onward on a secondary market** outside the closed-loop system are **not** virtual asset services.

Smartpay vouchers:
- **Non-transferable:** Tied to one beneficiary (`user_id`); no feature to assign or transfer the voucher to another person.
- **Non-exchangeable** (in the VASP sense): They are not exchanged for virtual assets or on a virtual asset exchange; they are redeemed for NAD (cash or e-money) within the G2P/partner programme.
- **Use for payment/investment:** They function as a **claim to fiat** within a closed programme, not as a general payment or investment asset in the crypto/virtual-asset sense.
- **No secondary market:** There is no onward sale or trading of vouchers outside the Smartpay/G2P closed-loop system; single-use, single-beneficiary.

They therefore fall within the **closed-loop exclusion** in Part 2 of Schedule 2. Activities around issuing and redeeming these vouchers are **not** virtual asset services.

---

## 4. Summary table

| Criterion | Virtual Assets Act | Smartpay vouchers |
|-----------|--------------------|-------------------|
| DLT or similar tech (s 1(b)) | Required | Not used (central DB only) |
| Digital representation of fiat (s 1 exclusion) | Excluded from “virtual asset” | Claim to NAD / e-money (NAD) |
| Closed-loop (Part 2 Schedule 2) | Excluded from “virtual asset services” | Non-transferable, non-exchangeable, no secondary market; single-beneficiary redemption for NAD |

---

## 5. Conclusion and recommendation

**Conclusion:** Smartpay’s G2P/partner vouchers **do not fall under the Virtual Assets Act**. They are not virtual assets, and voucher issuance/redemption is not a virtual asset service. Regulatory focus for vouchers remains **PSMA 2023**, **PSD-3** (e-money on redemption to wallet), **FIA** (AML/CFT where relevant), and any BoN guidance on G2P or payment instruments.

**Recommendation:** Keep this analysis on file for compliance and for any regulator (e.g. BoN, NAMFISA) or legal question. If product design changes (e.g. transferable vouchers, voucher trading, or use of DLT), reassess against the Act and Part 2 of Schedule 2.

---

**Sources:**  
- Virtal Assets Act.md (Virtual Assets Act 2023, Act No. 10 of 2023)  
- PRD_AGENTIC_COPILOT_CONSOLIDATED.md  
- fintech/smartpay/database/migrations (001_initial_schema.sql, 027_emoney_issuance_log.sql)  
- fintech/smartpay/mobile/services/vouchers.ts, types/api.ts  
- fintech/smartpay/backend/src/routes/mobile/vouchers.ts (redemption flows)
