# Fineract connection (Buffr G2P backend)

Backend connects to **Apache Fineract** at **dev.ketchup.cc** for core banking (clients, accounts, transactions). This doc covers env vars and how to set up Fineract from scratch on dev.ketchup.cc.

---

## Integration layer and services

- **HTTP / auth:** `src/lib/fineract.ts` – `fineractCall()`, `isFineractEnabled()`, `fineractHealth()`, `getFineractConfig()`.
- **Domain integration:** `src/integrations/fineract/` – clients (`client.ts`), savings (`savings.ts`), loans (`loans.ts`), accounting (`accounting.ts`), shared types (`types.ts`), re-exports (`index.ts`). These modules use the lib layer only; they do not duplicate auth.
- **Orchestration:**
  - **Wallet create:** `src/services/walletService.ts` – wallet create with optional Fineract sync (ensure client, create savings account, update `wallets.fineract_savings_account_id` and `users.fineract_client_id`).
  - **Cash-out:** `src/services/cashoutService.ts` – all wallet debits (Till, Agent, Merchant, ATM) go through `processCashOut()` or `generateAtmCode()`; Neon debit + optional Fineract `withdraw()` + optional `postVoucherCashedOut()` JE. Wired in `server.ts` for `POST /api/v1/mobile/wallets/:id/cashout` and `POST /api/cashout/atm-code`.
  - **Voucher redeem to wallet:** `src/services/voucherService.ts` – `redeemVoucherToWallet()` handles Neon credit + optional Fineract `deposit()` + optional `postVoucherRedeemed()` JE. Wired in `server.ts` for `POST /api/v1/mobile/vouchers/:id/redeem` (method=wallet).
  - **Loan disbursement:** `src/services/loanService.ts` – `disburseLoanInBuffr()` performs Neon disbursement and, when Fineract is enabled, create/approve/disburse loan in Fineract and set `loans.fineract_loan_id`. Wire in the loan apply/approval endpoint when it exists (see “Loan disbursement (deferred)” below).
- **Voucher accounting:** `src/services/voucherAccounting.ts` – optional journal entries for voucher lifecycle (issued, redeemed, cashed out) using configurable GL account IDs. See "Voucher liability vs settled" section.

---

## High-level flow: Buffr → Fineract

- **Buffr user → Fineract client:** When a wallet is created and Fineract is enabled, the backend ensures a Fineract client exists for that user (by `externalId` = Buffr user id). If none is found, it creates one using `POST /clients` (name/phone from Buffr user). The mapping is stored in `users.fineract_client_id`.
- **Buffr wallet → Fineract savings account:** For each new wallet (Neon row), if Fineract is enabled the backend creates a savings account in Fineract for that client (`POST /clients/{clientId}/savingsaccounts`) and stores the Fineract savings account id in `wallets.fineract_savings_account_id`. Optional env: `FINERACT_OFFICE_ID`, `FINERACT_SAVINGS_PRODUCT_ID` (default 1).
- **Voucher redeem to wallet:** The handler calls **`voucherService.redeemVoucherToWallet()`**, which updates Neon, then (if Fineract is enabled) posts a deposit to the wallet’s Fineract savings account and optionally `postVoucherRedeemed()`. Failures are logged; the HTTP response is not failed.
- **ATM cash-out:** The handler calls **`cashoutService.generateAtmCode()`** (or, for `POST /api/v1/mobile/wallets/:id/cashout` with `method=atm`, the same). Other cash-out methods (till, agent, merchant) use **`cashoutService.processCashOut()`**. Neon debit + optional Fineract `withdraw()` + optional `postVoucherCashedOut()` JE; failures are logged.
- **Loan disbursement (deferred):** When a loan apply/disburse API is added, call **`loanService.disburseLoanInBuffr()`** after approval. It credits the wallet in Neon, updates loan status, and (if Fineract is enabled) create/approve/disburse in Fineract and set `loans.fineract_loan_id`. See `src/services/loanService.ts`.

---

## Fineract integration status (canonical)

Use this section as the single source of truth for what is wired vs not wired. External status docs should align with this.

| Status | Flows |
|--------|--------|
| **Wired** | **Wallet create:** `walletService.ts`. **Voucher redeem to wallet:** `voucherService.redeemVoucherToWallet()`. **Cash-out (all methods):** `cashoutService.processCashOut()` (till, agent, merchant) and `cashoutService.generateAtmCode()` (ATM). All wired in `server.ts`; `POST /api/v1/mobile/wallets/:id/cashout` and `POST /api/cashout/atm-code`. |
| **Not wired** | **Loan disbursement:** When the loan apply/approval endpoint exists, call `loanService.disburseLoanInBuffr()`. **Voucher issued:** call `postVoucherIssued()` where vouchers are created. **Fee journal entries:** optional. **Bank transfer cash-out:** returns 501. |

Orchestration lives in `cashoutService.ts`, `voucherService.ts`, and `loanService.ts`; `server.ts` calls these services.

---

## Voucher liability vs settled (accounting)

For reporting and regulatory (e.g. PSD-3 e-money liability) it is useful to distinguish:

| Category | Meaning | Accounting treatment |
|----------|---------|------------------------|
| **Vouchers due to beneficiaries** | Vouchers that have been **issued** but not yet **redeemed**, or redeemed to wallet but not yet **cashed out**. The issuer still owes the beneficiary that value. | **Liability** on the books (e.g. “Vouchers due to beneficiaries” or “Outstanding voucher liability”). |
| **Vouchers settled / issued in advance** | Beneficiaries who have already **redeemed and cashed out** their vouchers (at one or more separate points). Value has been delivered; no outstanding obligation for those vouchers. | No liability for those amounts; voucher liability is **discharged** when they redeem and cash out. |

**Implementation in accounting (Fineract):**

- **Optional GL journal entries** can reflect this:
  - **Voucher issued:** Debit programme/expense (or funding), Credit **Vouchers due to beneficiaries** (liability).
  - **Redeem to wallet:** Debit **Vouchers due**, Credit **E-money liability** (or equivalent) for the same amount (movement from “voucher due” to “wallet balance”).
  - **Cash-out (ATM/agent/till/etc.):** Debit **E-money liability**, Credit **Cash / Bank** (discharge of e-money liability).
- The backend **wires** voucher accounting in `server.ts`: **redeem to wallet** and **ATM cash-out** call `postVoucherRedeemed()` and `postVoucherCashedOut()` from `services/voucherAccounting.ts` when Fineract is enabled. **Voucher issued:** call `postVoucherIssued()` from the same service wherever vouchers are created (e.g. G2P sync or admin API that inserts into `vouchers`).
- **Reporting only:** Alternatively, “vouchers due” can be computed for reports from existing data: sum of `vouchers.amount` where `status` not in (redeemed/settled), plus any definition of “redeemed but not yet cashed” if tracked (e.g. wallet balance backed by voucher-origin transactions). That does not require Fineract journal entries.

So **yes** — the distinction (vouchers due vs already redeemed/cashed out) is something to implement in **accounting** if you want the core ledger to reflect liability; the building block (`postJournalEntry`) is already in place. See the table below for what is wired and what remains.

---

## What else to wire to accounting (PRD alignment)

Per the PRD (§2.2, §2.3, §9.4, §16–17) and current backend, the following are **not yet** wired to Fineract accounting. Wire them when the corresponding APIs or flows exist.

| Flow | PRD / backend | Accounting treatment | Status |
|------|----------------|----------------------|--------|
| **Voucher issued** | Vouchers created by G2P engine or admin | Dr Programme/funding, Cr Vouchers due (liability) | Call `postVoucherIssued()` where vouchers are created (no voucher-creation endpoint in backend yet). |
| **Redeem to wallet** | `POST /api/v1/mobile/vouchers/:id/redeem` (method=wallet) | Dr Vouchers due, Cr E-money liability | ✅ Wired |
| **ATM cash-out** | `POST /api/cashout/atm-code` | Dr E-money liability, Cr Cash | ✅ Wired |
| **Till / Agent / Merchant cash-out** | PRD §2.2: user scans payee NAMQR → wallet debited | Same as ATM: Dr E-money, Cr Cash | ✅ Wired via `POST /api/v1/mobile/wallets/:id/cashout` with `method=till|agent|merchant`; uses `cashoutService.processCashOut()`. |
| **Bank transfer cash-out** | PRD §2.2: wallet → bank (Open Banking PIS) | Dr E-money liability, Cr Bank (or trust account) | When bank transfer endpoint exists: post journal entry (and optionally sync to Fineract/ISO 20022). |
| **Add money to wallet** | `POST /api/v1/mobile/wallets/:id/add-money` | Dr Bank/Trust (or funding), Cr E-money liability | Optional: journal entry when user tops up (bank/card/agent); optionally Fineract deposit to savings. |
| **Send money (P2P)** | `POST /api/v1/mobile/send` | Internal transfer: no change in total e-money liability | No journal entry needed for liability; optionally sync to Fineract savings (withdraw sender account, deposit recipient account). |
| **Loan disbursement** | PRD §2.3; no `POST /loans/apply` in backend yet | Dr Loan receivable (or expense), Cr E-money liability; plus Fineract loan create/disburse | When loan apply/disburse API exists: create loan in Fineract, post JE, store `loans.fineract_loan_id`. |
| **Loan repayment** (on redeem) | PRD §2.3: deduct from next voucher-to-wallet | Dr E-money liability, Cr Loan receivable (or income) | When redeem flow deducts repayment: post a separate journal entry for the repayment amount. |
| **Bill payment** | PRD §2.2 wallet payments; no bill-pay endpoint in backend yet | Dr E-money liability, Cr Payable/Biller (or bank) | When bill payment endpoint exists: post journal entry on debit. |

**Summary:** **Already wired:** voucher redeem to wallet, ATM cash-out. **Next:** voucher issued (at source of voucher creation); other cash-out methods if they use a different debit path; add money and loan/bill flows when those APIs exist.

In `backend/.env`:

| Variable | Value | Purpose |
|----------|--------|---------|
| `FINERACT_ENABLED` | `true` | Enable Fineract API calls |
| `FINERACT_BASE_URL` | `https://dev.ketchup.cc` | Fineract host (no trailing slash) |
| `FINERACT_USERNAME` | `mifos` | Default Fineract API user |
| `FINERACT_PASSWORD` | `password` | Default Fineract API password |
| `FINERACT_TENANT_ID` | `default` | Default tenant identifier |
| `FINERACT_API_VERSION` | `v1` | API version path segment |
| `FINERACT_TIMEOUT_SECONDS` | `30` | Request timeout |
| `FINERACT_USE_HTTPS` | `true` | Use HTTPS for dev.ketchup.cc |
| `FINERACT_OFFICE_ID` | (optional) | Default office id; if unset, first office from `GET /offices` is used |
| `FINERACT_SAVINGS_PRODUCT_ID` | `1` | Savings product id used when creating Buffr wallets in Fineract |
| `FINERACT_LOAN_PRODUCT_ID` | `1` | Loan product id used when creating Fineract loans (for `loanService.disburseLoanInBuffr`) |
| `FINERACT_VOUCHER_LIABILITY_ACCOUNT_ID` | `1` | GL account id for voucher liability (for journal entries) |
| `FINERACT_VOUCHER_REVENUE_ACCOUNT_ID` | `2` | GL account id for voucher revenue (for journal entries) |
| `FINERACT_EMONEY_LIABILITY_ACCOUNT_ID` | `3` | GL account id for e-money / wallet liability (for journal entries) |
| `FINERACT_VOUCHER_CASH_ACCOUNT_ID` | `4` | GL account id for cash (for journal entries) |

**Resolved API base:**  
`https://dev.ketchup.cc/fineract-provider/api/v1`

If Fineract is deployed under a different path on dev.ketchup.cc, set `FINERACT_BASE_URL` to the full base, e.g.  
`https://dev.ketchup.cc/your-context/fineract-provider/api/v1`.

---

## Fineract API references (optional)

- **Swagger / API reference:** https://demo.fineract.dev/fineract-provider/swagger-ui/index.html (or your instance’s `/fineract-provider/swagger-ui/index.html`).
- **Integration doc:** See `ketchup-smartpay/fineract/FINERACT_BUFFR_INTEGRATION.md` (if present in the Fineract repo) for endpoint summaries and request bodies used by the Buffr integration.

---

## 2. Set up Fineract on dev.ketchup.cc from scratch

### Official documentation

- **Apache Fineract docs (current):** https://fineract.apache.org/docs/current/  
- **Fineract Academy – Docker setup:** https://fineract-academy.com/how-to-setup-fineract-with-docker/  
- **Docker image:** https://hub.docker.com/r/apache/fineract  
- **API reference / Swagger:** https://demo.fineract.dev/fineract-provider/swagger-ui/index.html  

### Default credentials (fresh install)

- **Tenant:** `default`  
- **Username:** `mifos`  
- **Password:** `password`  
- **API base path:** `/fineract-provider/api/v1` (or `/fineract-provider/api/v1/`)

### Option A: Docker on the dev.ketchup.cc server

**1. Database (choose one)**

**PostgreSQL (recommended for production):**
```bash
docker run --name fineract-postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres
```

**MariaDB 11.5.2+ (per Fineract docs):**
```bash
docker run --name mariadb-11.5 -p 3306:3306 -e MARIADB_ROOT_PASSWORD=mysql -d mariadb:11.5.2
```

**2. Fineract backend**

Configure tenant DB via environment variables (see [Fineract docs](https://fineract.apache.org/docs/current/) and [Fineract Academy](https://fineract-academy.com/how-to-setup-fineract-with-docker/)). Example with PostgreSQL:

```bash
docker run -d -p 8443:8443 \
  -e FINERACT_HIKARI_DRIVER_SOURCE_CLASS_NAME=org.postgresql.Driver \
  -e FINERACT_HIKARI_JDBC_URL=jdbc:postgresql://host.docker.internal:5432/fineract_tenants \
  -e FINERACT_HIKARI_USERNAME=postgres \
  -e FINERACT_HIKARI_PASSWORD=postgres \
  -e FINERACT_DEFAULT_TENANTDB_IDENTIFIER=default \
  apache/fineract:latest
```

Create DBs (e.g. `fineract_tenants`, `fineract_default`) and run Fineract migrations as per official docs.

**3. Reverse proxy (Nginx / Caddy) on dev.ketchup.cc**

Expose Fineract on HTTPS so the backend can use `https://dev.ketchup.cc/fineract-provider/api/v1`:

- Host: `dev.ketchup.cc` (or a subdomain, e.g. `fineract.dev.ketchup.cc`).
- Proxy `/fineract-provider` to `http://localhost:8443/fineract-provider` (or the container’s host/port).
- Use TLS (e.g. Let’s Encrypt) so `FINERACT_USE_HTTPS=true` works.

**4. Verify**

- Health: `https://dev.ketchup.cc/fineract-provider/actuator/health` → `{"status":"UP"}`.
- API: `curl -u "mifos:password" -H "Fineract-Platform-TenantId: default" "https://dev.ketchup.cc/fineract-provider/api/v1/offices"` → 200 and JSON.

Then run from the backend repo:

```bash
cd backend && npm run fineract:check
```

### Option B: Docker Compose (local or server)

Use the Compose file from the [Apache Fineract repo](https://github.com/apache/fineract) (e.g. `docker-compose-postgresql.yml` or `docker-compose-development.yml`). Point the proxy on dev.ketchup.cc at the Fineract container port (e.g. 8443) and set `FINERACT_BASE_URL=https://dev.ketchup.cc` in `backend/.env`.

### Requirements (from Fineract docs)

- **Java:** 21+ (Azul Zulu is used in CI).  
- **DB:** PostgreSQL or MariaDB 11.5.2+; timezone UTC recommended.  
- **Context path:** Default is `/fineract-provider`; API under `/api/v1`.

---

## 3. Backend API routes

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/mobile/fineract/health` | Connectivity status |
| GET | `/api/v1/fineract/offices` | Proxies Fineract `GET /offices` |

---

## 4. Verify connectivity

From repo root or `backend/`:

```bash
npm run fineract:check
```

Or curl directly:

```bash
curl -u "mifos:password" \
  -H "Fineract-Platform-TenantId: default" \
  -H "Content-Type: application/json" \
  "https://dev.ketchup.cc/fineract-provider/api/v1/offices"
```

---

## 5. Web UI (optional)

To log in via the browser:

- **Community App (if deployed):** Often at `https://dev.ketchup.cc:9090` or a path you configure; login with `mifos` / `password`, tenant `default`.  
- **Swagger UI:** `https://dev.ketchup.cc/fineract-provider/swagger-ui/index.html` (after accepting the cert if self-signed).

---

## 6. Changing credentials or tenant

After creating a dedicated API user or tenant in Fineract, update `backend/.env`:

- `FINERACT_USERNAME` / `FINERACT_PASSWORD`  
- `FINERACT_TENANT_ID` if not using `default`  

Restart the backend and run `npm run fineract:check` again.
