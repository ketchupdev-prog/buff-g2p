# Bank of Namibia Engagement: Strategy & Presentation Brief

**Document type:** Strategy and presentation brief for regulator engagement  
**Prepared for:** Ketchup Software Solutions / Buffr Inc.  
**Prepared by:** George Nekwaya, MBA Brandeis University, Open Banking and Platforms Specialist  
**Audience:** Bank of Namibia (NPS Policy, Licensing, Innovation Hub, Legal); BaseCamp  
**Version:** 1.0  
**Sources:** BoN FinTech Regulatory Framework (2022), PSMA 2023, PSDs, Namibia Open Banking Standards v1.0 (2025), BoN IPP kick-off (July 2024), Regulation & Compliance Resources/markdown, Smartpay_Vouchers_Virtual_Assets_Act_Analysis.md (vouchers vs Virtual Assets Act).

---

# Part I — Strategy

## 1. Executive summary

**Situation.** We have requested guidance from the Bank of Namibia on participating in the Instant Payment Pilot (IPP) and on the path to licensing for our G2P-focused digital wallet and our Account Information Services (AIS) platform, Buffr Connect. We are a startup, not yet licensed by the Bank, and have expressed interest in the Bank’s Allow-and-See or Regulatory Sandbox programmes as a stepping stone to IPP evaluation.

**Strategic objective.** Use a single, well-prepared engagement to (1) demonstrate that our products support the Bank’s stated priorities—financial inclusion, NPS safety and efficiency, and interoperability—and (2) obtain clear, actionable guidance on IPP eligibility and onboarding, pilot scope, technical and security expectations, and the licensing/sandbox path for a Third-Party PSP and an e-money issuer.

**Ask.** We are seeking six concrete outcomes: eligibility and onboarding criteria for PSPs and AISPs in the IPP pilot; clarity on pilot scope and use cases (P2P, P2M, G2P, wallet-to-bank, agent cash-out); technical integration, testing, and security requirements; guidance on applying for Allow-and-See or the Regulatory Sandbox and subsequent IPP evaluation; clarity on the licensing/authorisation path for Buffr Connect (AIS/PISP) and Smartpay (e-money) under PSMA 2023 and the Payment System Notice (2025); and the Bank’s position on capital requirement considerations for AIS-only providers that do not hold, intermediate, or process customer funds.

**Why we are positioned to deliver.** Our G2P wallet (Smartpay) and AIS platform (Buffr Connect) are built to align with the Bank’s mandate: consent-based data access (OBS v1.0), no handling of customer funds in the AIS layer, e-money ring-fenced via trust account (PSD-3, PSMA Part 6), and architecture designed for interoperability and auditability. The IPP kick-off (July 2024) emphasised accessibility on any device (including non-smartphones) and inclusion for vendors, pensioners, and small businesses—use cases our wallet and USSD roadmap address directly. This document sets the strategy and narrative for the engagement and provides the presentation brief and slide-level guidance.

---

## 2. Strategic context

**Bank of Namibia mandate and priorities.** The Bank’s FinTech Innovations Regulatory Framework (September 2022) states that the Bank will support and encourage FinTech innovations while managing risks; protect funds, financial stability, and consumers; ensure cyber and data security and safe access to the NPS; and promote interoperability and financial inclusion. The Framework explicitly offers two regulatory tools—Allow-and-See and the Regulatory Sandbox—to test innovations under predetermined conditions before a full regulatory outcome. Our engagement should speak directly to these objectives and tools.

**Instant Payment Programme (IPP).** The Bank has positioned the IPP as a transformative initiative to enhance financial inclusion and accessibility. The July 2024 kick-off stressed that the instant payment solution will be accessible on any device (including non-smartphones) and will serve vendors, taxi drivers, pensioners, and small business owners. The pilot is proceeding with participating institutions (e.g. Bank Windhoek, Letshego Bank Namibia) and is initially focused on G2P and social grants. Our proposition—a G2P wallet and an AIS layer that can support real-time notifications, proxy resolution, and enriched data—aligns with this narrative. We are not asking the Bank to change direction; we are asking how we can fit into a programme the Bank has already committed to.

**Our position in the regulatory landscape.** Buffr Connect provides Account Information Services (AIS) and Payment Initiation (PISP) as a Third-Party Payment Service Provider under the Namibia Open Banking Standards v1.0; it does not issue e-money or operate a designated payment system. Smartpay is an e-money product (PSD-3) with a trust account (PSMA Part 6) and consumer protection and complaints handling (PSMA Part 8). We have cited PSD-1, PSD-3, PSD-6, PSD-12, the Electronic Transactions Act 4 of 2019, and NamQR in our outreach. The strategy is to show that we have read the Bank’s frameworks and are positioning our build and our ask within them—not asking for exceptions before demonstrating compliance.

---

## 3. Engagement objectives and success criteria

| Objective | Success criterion |
|-----------|--------------------|
| Establish credibility | BoN leaves the meeting with a clear, accurate picture of what we build, how it fits the NPS and OBS, and that we take regulation seriously. |
| Align to Bank priorities | Our narrative explicitly ties our products to financial inclusion, NPS efficiency, interoperability, and consumer protection using the Bank’s own language. |
| Obtain actionable guidance | We receive (or are told how to receive) answers on IPP eligibility/onboarding, pilot scope, technical/security requirements, sandbox/Allow-and-See application, licensing path, and AIS capital. |
| Create a clear next step | A defined follow-up (e.g. written submission, formal application, or another meeting) with a named contact or process. |

---

## 4. Stakeholder strategy

The following table summarises who is in the room (or copied), what they care about, and how we tailor our message and anticipate questions. This is strategic audience analysis, not only a contact list.

| Stakeholder | Role | What they care about (and why it matters) | Our strategic response |
|-------------|------|-------------------------------------------|-------------------------|
| **Iyisha Garises** | Principal Analyst, NPS Policy & Data Analytics | Legal and technical soundness of payment systems; NPS modernisation; efficiency and security. | Lead with NPS and OBS alignment: we do not operate a payment system; we participate as a TPP with consent-based APIs and no screen scraping. Emphasise IPP as the cornerstone and our desire to integrate within the Bank’s design. |
| **Ndangi Amunyela** | Senior Analyst, NPS | Operational safety and reliability of retail and inter-bank payments. | Show flows and architecture; stress auditability, PSD-12 alignment, and that we do not introduce unmanaged risk into clearing/settlement. |
| **Geneva Hanstein** | Principal Analyst, Licensing & Regulation | Corporate governance, legislative compliance, and licensing clarity. | Be explicit about which licence(s) we are pursuing (TPP/AISP and e-money), capital planning, and interest in sandbox/Allow-and-See as a structured path. Address AIS capital question with a clear, factual framing (no custody of funds). |
| **Tuna Brock** | Innovation Hub Officer | Youth innovation, Fintech Youth Program, financial inclusion, CBDC/green finance. | Position G2P and USSD as financial-inclusion levers; mention roadmap for interoperability (e.g. future NPS rails/CBDC) without overpromising. |
| **Pepua Karamata** | Senior Analyst, NPS & Virtual Assets | Virtual assets and new payment tech complying with national standards. | State clearly that we do not touch virtual assets or act as a VASP; our scope is fiat-based AIS, PISP, and e-money. **G2P vouchers** (Smartpay) are not virtual assets: they are claims to NAD, use no DLT, and fall under the Act’s closed-loop exclusion; we have a written analysis (Smartpay_Vouchers_Virtual_Assets_Act_Analysis.md) available on request. |
| **Elizabeth Nuugulu** | Legal Practitioner (Trainee) | Banking Institutions Act and related legislation; consumer protection and complaints. | Reference PSMA Part 8 and s31 (complaints); show that we have considered consumer protection and transparency of fees and data use. |
| **Jesaya Hano-Oshike** | BaseCamp Founder | Startup ecosystem and scaling Namibian innovators. | Emphasise sandbox and testing support for other TPPs and startups (e.g. single API, demos); we are part of the same ecosystem. |

**Implication for the presentation.** Different slides (or parts of the same slide) will resonate with different stakeholders. The narrative should be coherent for everyone, but we should be ready to deepen on NPS/technical (Iyisha, Ndangi), licensing/capital (Geneva), and inclusion/innovation (Tuna, Jesaya) when questions arise.

---

## 5. Message architecture and narrative arc

**Core narrative (one paragraph).** Namibia’s Instant Payment Programme is a cornerstone of the country’s move toward a modern, inclusive payment ecosystem. Ketchup Software Solutions is building two complementary pieces: an open banking layer (Buffr Connect) that provides secure, consent-based account information and payment initiation aligned to the Namibia Open Banking Standards, and a G2P-focused e-money wallet (Smartpay) that uses that layer to give beneficiaries and underserved users access to digital payments—including via USSD for feature phones. We are not yet licensed but are committed to full compliance with the Bank’s frameworks. We are here to ask how we can participate in the IPP pilot and how we should pursue licensing and, where appropriate, the Bank’s Allow-and-See or Regulatory Sandbox.

**Key messages (to be reinforced across slides).**

1. **Alignment.** Our products are designed to support the Bank’s objectives: financial inclusion, NPS safety and efficiency, interoperability, and consumer protection. We cite PSMA 2023, PSDs, OBS v1.0, and the FinTech Regulatory Framework.
2. **Clarity of role.** Buffr Connect is AIS/PISP only—no e-money, no designated system. Smartpay is e-money with a trust account and complaints process. No virtual assets.
3. **Evidence of readiness.** We have a working sandbox, consent flows aligned to OBS, and architecture that separates data from funds and supports audit and reporting.
4. **Respectful ask.** We are asking for guidance and a path, not for the Bank to change its rules. We want to know how to apply, what to submit, and what the Bank needs to evaluate us.

**Narrative flow for the deck.** (1) **Context:** Why this matters for Namibia and for the Bank (IPP, inclusion, NPS). (2) **Who we are:** Ketchup Software Solutions and our two products in one sentence each. (3) **Where we sit in the regulatory landscape:** TPP/AIS and e-money issuer; which instruments apply. (4) **How it works:** Flows and architecture in plain language and one diagram. (5) **How we manage risk and compliance:** Consent, security, consumer protection, e-money safeguards. (6) **What we are asking:** Six asks, stated clearly. (7) **Next steps and contact:** What we will do next and how the Bank can reach us.

---

## 6. Risk and positioning

**Regulator concerns we must address explicitly.** Central banks typically assess capital/liquidity, viability of the business model, risk management and compliance, and governance. We should be ready to speak to: (a) no custody of customer funds in the AIS layer; (b) trust account separation and capital/limits for e-money (Payment System Notice 2025); (c) consent and data protection (OBS, ETA); (d) operational and cybersecurity (PSD-12); (e) complaints and transparency (PSMA Part 8). We do not assume the Bank will give a capital waiver for AIS; we ask whether there are considerations or precedents for AIS-only providers, given the absence of fund handling, and we accept that the Bank’s answer will guide our planning.

**Vouchers and the Virtual Assets Act.** Smartpay’s G2P/partner vouchers (redeem to wallet, NamPost, or SmartPay agent) do **not** fall under the Virtual Assets Act: they do not use DLT, they are digital representations of/claims to fiat (NAD), and they qualify as closed-loop items (non-transferable, non-exchangeable, no secondary market). A short compliance memo is in Regulation & Compliance Resources/markdown: *Smartpay_Vouchers_Virtual_Assets_Act_Analysis.md*. We can provide it as a leave-behind if the Bank or Legal asks.

**Positioning.** We are a serious, compliant-minded startup that has done its homework. We use the Bank’s terminology (IPP, NPS, OBS, Allow-and-See, Regulatory Sandbox, PSMA, PSDs) and we do not oversell or ask for special treatment. We offer a concise presentation, a clear ask, and a willingness to provide any further documentation the Bank needs.

---

## 7. Implementation: presentation and follow-up

**Format.** Short presentation (e.g. 15–20 minutes) plus time for Q&A. A live or recorded demo (Buffr Connect consent → data; Smartpay link to bank; optional PISP) should be brief and focused on consent and control. Leave-behind: one-to-two-page summary with the ask, key frameworks, and presenter contact.

**Roles.** Assign in advance who will lead which part of the narrative and who will answer licensing vs. NPS vs. innovation questions. Rehearse the demo and the transition from “what we built” to “what we are asking.”

**After the meeting.** Send a short thank-you and, if agreed, any promised materials (e.g. flow diagrams, API overview, compliance checklist). Address any follow-up questions in writing promptly. Do not add new asks in follow-up that were not signalled in the meeting.

---

# Part II — Presentation brief

The following section is written as talking points for the presenter. Each slide is introduced by the **narrative purpose** and **key line(s)** to deliver, then bullet points that an MBA would use when speaking to regulators—concise, evidence-based, and aligned to the Bank’s mandate. This is not a script; it is the backbone of what to say.

---

### Cover slide

**Narrative purpose:** Set a professional, respectful tone and identify the presenter and the topic.

**Key line:** “Thank you for the opportunity to present. I am George Nekwaya. I am here on behalf of Ketchup Software Solutions to discuss our G2P wallet and open banking platform and to seek your guidance on participating in the Instant Payment Pilot and on the path to licensing.”

**Talking points:** State the title of the presentation and your name, title (MBA Brandeis University, Open Banking and Platforms Specialist), and contact. Indicate that the deck and a one-pager are available as leave-behinds.

---

### Slide 1 — Who we are and what we offer

**Narrative purpose:** Establish who we are and what we build in two clear buckets, and why it matters for Namibia and the Bank.

**Key line:** “We are building two things: an open banking layer that gives secure, consent-based access to account data and payment initiation, and a G2P-focused e-money wallet that uses that layer so beneficiaries and underserved users can receive, store, and transact digital funds—including via USSD for feature phones.”

**Talking points:** Ketchup Software Solutions is a startup; we are not yet licensed by the Bank but are committed to full compliance. Buffr Connect is our AIS and PISP platform (connect.buffr.ai), designed to integrate with the IPP for real-time notifications, proxy resolution, and enriched data for developers and lenders. Smartpay is our e-money wallet (buffr.ai) for government-to-person payments, social grants, P2P, bill pay, and agent cash-out. We see the IPP as central to Namibia’s inclusive payment ecosystem and want to align our products with the Bank’s vision—reducing cash dependency and improving transparency and access for underserved communities.

---

### Slide 2 — Where we sit in the regulatory landscape

**Narrative purpose:** Show that we understand the applicable frameworks and our place within them. No confusion about our role or about virtual assets.

**Key line:** “We have positioned our products within the Bank’s existing framework: Buffr Connect as a Third-Party Payment Service Provider under the Open Banking Standards, and Smartpay as an e-money issuer under PSD-3. We do not operate a designated payment system, and we do not touch virtual assets.”

**Talking points:** Buffr Connect offers Account Information Services and Payment Initiation only; it does not issue e-money. Smartpay is the e-money product, with a trust account under PSMA Part 6 and consumer protection and complaints under Part 8. The relevant instruments are PSMA 2023, PSD-1, PSD-3, PSD-6, PSD-9, PSD-12, the Payment System Notice 2025, and the Namibia Open Banking Standards v1.0. We have deliberately stayed outside virtual asset services so that our scope is clear to the Bank. Smartpay’s G2P vouchers are not virtual assets—they are claims to NAD, use no DLT, and fall under the Virtual Assets Act’s closed-loop exclusion; we have a short written analysis in this folder if the Bank would find it useful.

---

### Slide 3 — How the flows work (with diagram)

**Narrative purpose:** Demonstrate that we have thought through consent, data flow, and fund flow—and that the Bank can see exactly where data and money go.

**Key line:** “Consent is at the centre of our design. Data flows only after the user has explicitly authorised it; we do not use screen scraping; and our e-money flows are ring-fenced in a trust account.”

**Talking points:** For AIS: the user consents at Buffr Connect, the TPP receives an access token, and the TPP calls our APIs for accounts, balances, and transactions within the scope and duration allowed by OBS (e.g. max 90 days). For PISP: the user initiates a payment via the TPP, confirms consent, and the payment instruction is sent to the bank via Buffr Connect, with status and confirmation returned. For e-money: the customer onboard and KYC, the wallet is funded (including via linked bank through Buffr Connect), and P2P, bill pay, and cash-out use the trust account with reconciliation under PSD-3 and PSMA Part 6. Use the flow diagrams (AIS, PISP, e-money, system architecture) to walk through once; keep technical detail to what the room needs.

---

### Slide 4 — Architecture (high level)

**Narrative purpose:** Show a simple, auditable system boundary: end user, Smartpay, Buffr Connect, banks/NPS. Reassure that we do not blur roles or hide dependencies.

**Key line:** “Our architecture keeps a clear separation: the wallet talks to Buffr Connect via APIs; Buffr Connect talks to banks. We do not hold banks’ data in our e-money system beyond what is necessary for the linked experience, and we are prepared for the Bank’s oversight and reporting expectations.”

**Talking points:** Buffr Connect runs on a modern stack (e.g. Next.js, Supabase) with REST APIs, OAuth 2.0 and PKCE, and a sandbox for testing. Smartpay integrates with Buffr Connect via API and does not have direct access to Buffr Connect’s database. Banks connect through Buffr Connect; today we use a sandbox, and we will move to live once bank APIs and agreements are in place. Use the system architecture diagram to show the chain: End user ↔ Smartpay ↔ Buffr Connect ↔ Banks/NPS, and note OBS v1.0 and PSD-9 where relevant.

---

### Slide 5 — Compliance and risk posture

**Narrative purpose:** Address head-on how we protect consumers, data, and funds and how we meet the Bank’s expectations on security and governance.

**Key line:** “We have designed for the Bank’s priorities: explicit consent and OBS-aligned UX, PSD-12-aligned security, consumer protection and complaints, and e-money safeguards. We are prepared to report and to provide information as the Bank requires.”

**Talking points:** Consent and UX follow OBS v1.0 (flows, scopes, maximum duration, mandatory text); we use positive friction so that consent is explicit. Security and operations are aligned to PSD-12 (cybersecurity, resilience); we maintain audit trails consistent with the Electronic Transactions Act and use encryption and access controls. Consumer protection includes a complaints process and SLA (PSMA s31), transparency of fees, and data sharing only with consent. For e-money, we have trust account separation, and we plan for capital and limits in line with the Payment System Notice 2025, plus KYC and transaction monitoring. We are prepared for reporting and information access under PSMA Part 9.

---

### Slide 6 — Demonstration (if used)

**Narrative purpose:** Show, don’t just tell: consent, data access, and (optionally) payment initiation in a controlled environment.

**Key line:** “I can walk you through a short demo: linking a bank in our sandbox, granting consent, and showing how data appears only after authorisation—and optionally how a payment is initiated and confirmed.”

**Talking points:** If live: use the sandbox to link a test bank, grant consent, and show accounts/transactions in the dashboard; then show Smartpay linking to the bank via Buffr Connect and a simple use case (e.g. balance or pay from bank). If recorded: play a two-to-three-minute video with the same flow and a voice-over that emphasises consent and control. Emphasise that there is no screen scraping and that every data access is logged and scoped.

---

### Slide 7 — What we are asking (the ask)

**Narrative purpose:** State the six asks clearly and respectfully. Leave no ambiguity about what we want from the Bank.

**Key line:** “We are here to ask for six things: guidance on IPP eligibility and onboarding, clarity on pilot scope, technical and security expectations, how to apply for Allow-and-See or the Regulatory Sandbox and then for IPP evaluation, clarity on the licensing path for our TPP and e-money products, and the Bank’s position on capital considerations for AIS-only providers that do not hold or process customer funds.”

**Talking points:** (1) Eligibility and onboarding for PSPs and AISPs wishing to join the IPP pilot. (2) Scope and use cases of the pilot (e.g. P2P, P2M, G2P, wallet-to-bank, agent cash-out). (3) Technical integration requirements, testing environments, and security standards for the IPP. (4) How to apply for Allow-and-See or the Regulatory Sandbox and how evaluation for the IPP pilot works. (5) The licensing/authorisation path for Buffr Connect as a Third-Party PSP (and any system participant role under PSD-6) and for Smartpay as an e-money issuer under PSD-3, under PSMA 2023 and the Payment System Notice 2025. (6) Whether there are capital requirement considerations or precedents for AIS-only providers, given that we do not hold, intermediate, or process customer funds. Conclude by saying that we will provide any further documentation the Bank needs and that we are committed to following the Bank’s process.

---

### Slide 8 — Why this matters now (optional)

**Narrative purpose:** Reinforce that our ask supports the Bank’s own stated priorities and timing.

**Key line:** “The IPP and the Open Banking Standards give Namibia a clear direction. We have built to that direction and are asking how we can participate in a safe and compliant way.”

**Talking points:** The IPP is a cornerstone of Namibia’s modern, inclusive payment ecosystem; the Bank has said the solution will be accessible on any device and will serve pensioners, vendors, and small businesses. Our G2P wallet and USSD roadmap speak directly to that. OBS v1.0 is now in place; the market needs a compliant AIS/PISP layer. We offer a single infrastructure that can serve multiple banks and TPPs, which supports the Bank’s goals for interoperability and oversight. We are not asking the Bank to change course—we are asking how to join it.

---

### Slide 9 — Who benefits (optional)

**Narrative purpose:** Show that our model creates value for the Bank, banks, TPPs, and end-users—not only for us.

**Key line:** “This is not only about us. Government and beneficiaries get a G2P and inclusion story; banks get a single, OBS-compliant integration point; TPPs and startups get one API and a sandbox; and the Bank gets visibility and an auditable ecosystem.”

**Talking points:** Government and G2P: wallet for social grants and person-to-person flows; USSD for feature phones; less cash dependency and leakage. Banks: one integration for many TPPs; real-time or near-real-time notifications and proxy resolution via AIS. TPPs and startups: one API for multi-bank data and payments; sandbox for testing. Consumers and beneficiaries: consent-based data sharing and a complaints path. The Bank: clear visibility over AIS/PISP and e-money flows and alignment with PSMA, PSDs, OBS, and the FinTech Regulatory Programme.

---

### Slide 10 — Roadmap (optional)

**Narrative purpose:** Show that we have a realistic sequence: sandbox today, then sandbox/Allow-and-See and IPP evaluation, then licensing and live operation.

**Key line:** “We are in the sandbox today. Our next step is to follow the Bank’s guidance on Allow-and-See or the Regulatory Sandbox, then to seek evaluation for the IPP pilot and to formalise our licensing applications.”

**Talking points:** Phase 1 (current): sandbox live; Buffr Connect and Smartpay integrated; OBS-aligned consent and APIs; we are not yet licensed. Phase 2: apply for Allow-and-See or Regulatory Sandbox per Bank guidance; seek evaluation for the IPP pilot; prepare and submit licensing/authorisation applications as required. Phase 3: participate in the IPP pilot within the eligibility and scope the Bank defines; complete technical integration and testing. Phase 4: go live with AIS/PISP and e-money in production; maintain compliance, reporting, and ongoing engagement with the Bank. Later: we remain open to interoperability with future NPS rails (e.g. CBDC, instant payments) as the Bank and market evolve.

---

### Slide 11 — Risks we mitigate (optional)

**Narrative purpose:** Pre-empt concerns by stating clearly how we address common regulator worries.

**Key line:** “We have designed to address the risks the Bank cares about: no screen scraping, no custody of funds in AIS, security and resilience, consumer protection, and a clear perimeter that excludes virtual assets and designated system operation. Our G2P vouchers are not virtual assets—we have a short analysis available if helpful.”

**Talking points:** No screen scraping: API-only access; consent and scope limits; OBS consent model and mandatory text. Security and resilience: PSD-12 alignment; encryption, access controls, audit logs; ETA considerations; incident and reporting readiness. Consumer protection: complaints process (PSMA s31); transparent fees; data only with consent. E-money safety: trust account separation (PSMA Part 6); capital and limits per Payment System Notice 2025; KYC and monitoring. Clear perimeter: no virtual assets; we do not operate a designated payment system; TPP and e-money roles are clearly separated. **Vouchers:** Smartpay’s G2P vouchers are claims to NAD, use central database only (no DLT), and fall under the Virtual Assets Act’s closed-loop exclusion; we have a one-page analysis (Smartpay_Vouchers_Virtual_Assets_Act_Analysis.md) in this folder and can share it if the Bank or Legal would find it useful.

---

### Closing slide — Contact and next steps

**Narrative purpose:** Leave the Bank with one person to contact and a clear understanding of what we will do next.

**Key line:** “Thank you again. I am George Nekwaya. We will send any materials you request and would welcome the opportunity to follow up in whatever format the Bank prefers—whether that is a written submission, a formal application, or another meeting.”

**Talking points:** Provide your full contact details: George Nekwaya, MBA Brandeis University, Open Banking and Platforms Specialist; Ketchup Software Solutions; george@buffr.ai; george.n.p.nekwaya@gmail.com; +1 206-530-8433; +264 81 437 6206; linkedin.com/in/george-nekwaya. Reference the product URLs (buffr.ai, connect.buffr.ai). State that the preferred next step is guidance on IPP pilot eligibility and onboarding and on the sandbox/Allow-and-See application process, and that you are ready to provide a one-pager, flow diagrams, and any other documentation the Bank needs.

---

# Appendices

## A. Original outreach context

**Addressee:** Ms. Iyisha Garises (Principal Analyst, NPS Policy & Data Analytics); others copied.  
**From:** George Nekwaya, on behalf of Ketchup Software Solutions.  
**Company status:** Startup; not yet licensed by BoN; committed to compliance.

**What we said we are building:** (1) G2P (and other use cases) digital wallet: mobile-first, government-to-person payments, social grants, financial access; beneficiaries receive, store, transact; USSD for feature phones; reduce cash dependency, improve transparency, lower cost (ref: buffr.ai). (2) AIS platform (Buffr Connect): secure, consent-based aggregation and analytics; integration with the IPP for real-time/near-real-time payment notifications, proxy resolution (phone/ID to account), and enriched transaction data for developers, lenders, and FSPs (ref: connect.buffr.ai).

**Asks in the email:** IPP eligibility and onboarding for PSPs and AISPs; pilot scope and use cases; technical integration, testing, and security standards; Allow-and-See or Regulatory Sandbox followed by IPP evaluation; capital requirement considerations for AIS-only (no holding/intermediating/processing of customer funds). Compliance cited: PSD-1, PSD-3, PSD-6, PSD-12, ETA 4 of 2019, NamQR.

---

## B. Presenter (for cover and leave-behind)

**George Nekwaya**  
MBA, Brandeis University | Open Banking and Platforms Specialist  

Contact: george@buffr.ai | george.n.p.nekwaya@gmail.com | +1 206-530-8433 | +264 81 437 6206 | linkedin.com/in/george-nekwaya  
On behalf of: Ketchup Software Solutions / Buffr Inc.

**Short bio (for deck or hand-out):** Fintech entrepreneur and MBA (Brandeis International Business School, Data Analytics & Strategy). Founder building G2P wallet and open banking infrastructure (Buffr Connect) for Namibia and SADC; focused on consent-based AIS/PISP, NPS alignment, and the Instant Payment Pilot. Committed to PSMA, PSDs, OBS v1.0, and the Bank’s FinTech Regulatory Programme.

---

## C. Slide content reference (for deck production)

| Slide | Title / content anchor | Flow image (if used) |
|-------|------------------------|------------------------|
| Cover | Ketchup Software Solutions – G2P Wallet, Open Banking & the Instant Payment Pilot; George Nekwaya, MBA Brandeis University, Open Banking and Platforms Specialist; contact | — |
| 1 | Who we are / Business offering (Ketchup, Buffr Connect, Smartpay, value proposition) | — |
| 2 | Regulatory context (Buffr Connect = TPP/AIS/PISP; Smartpay = e-money; applicable instruments; no VASP) | — |
| 3 | Transactional flows (AIS, PISP, e-money; one diagram) | flow-ais.png, flow-pisp.png, flow-emoney-smartpay.png |
| 4 | Architecture (End user ↔ Smartpay ↔ Buffr Connect ↔ Banks/NPS) | flow-system-architecture.png |
| 5 | Compliance posture (consent, security, consumer protection, e-money, reporting) | — |
| 6 | Demonstration (live or recorded) | — |
| 7 | Our ask (six asks) and next steps | — |
| 8–11 | Optional: Why now; Who benefits; Roadmap; Risks we mitigate | — |
| 12 | Contact and follow-up | — |

Flow images are in `flow-images/` (flow-ais.png, flow-pisp.png, flow-emoney-smartpay.png, flow-system-architecture.png).

### Flow diagrams (preview)

Use these in slides 3 and 4. Paths below are from the **workspace root** so preview can find them. If images still don’t show, open the PNGs directly from `fintech/Regulation & Compliance Resources/markdown/flow-images/`.

**AIS flow (Slide 3)**

![AIS flow](fintech/Regulation%20%26%20Compliance%20Resources/markdown/flow-images/flow-ais.png)

**PISP flow (Slide 3)**

![PISP flow](fintech/Regulation%20%26%20Compliance%20Resources/markdown/flow-images/flow-pisp.png)

**E-money / Smartpay flow (Slide 3)**

![E-money Smartpay flow](fintech/Regulation%20%26%20Compliance%20Resources/markdown/flow-images/flow-emoney-smartpay.png)

**System architecture (Slide 4)**

![System architecture](fintech/Regulation%20%26%20Compliance%20Resources/markdown/flow-images/flow-system-architecture.png)

---

## D. Pre-presentation checklist

- [ ] Finalise one-page “business offering + flows” diagram and ensure flow images are in the deck.
- [ ] Confirm demo environment (sandbox, test user); rehearse consent → accounts → (optional) payment.
- [ ] Print or share slide deck and leave-behind (1–2 pages) with ask, frameworks, and presenter byline.
- [ ] Prepare one-page “Our ask” and “Relevant frameworks” for hand-out.
- [ ] Assign who leads which section and who answers licensing vs. NPS vs. innovation vs. legal questions.
- [ ] Revisit key messages and narrative arc; ensure tone is respectful, evidence-based, and aligned to the Bank’s mandate.

---

## E. Document references (Regulation & Compliance Resources / markdown)

| Document | Use in strategy / presentation |
|----------|-------------------------------|
| PAYMENT SYSTEM MANAGEMENT ACT 14 OF 2023.md | Licensing, e-money, trust account, consumer protection, complaints. |
| Determination for Authorisation (PSD-6).md | System operators/participants; our position as TPP. |
| Determination on Issuing of Electronic Money (PSD-3).md | Smartpay e-money scope. |
| Determination on Conduct of EFT (PSD-9).md | How AIS/PISP sit alongside EFT and NPS. |
| Determination on Cybersecurity (PSD-12).md | Security and operational standards. |
| Namibia Open Banking Standards.md | Consent, APIs, participant roles, UX. |
| FinTech regulatory Framework - BoN.md | Bank’s treatment of innovations; Allow-and-See and Regulatory Sandbox. |
| National Payment System Legal Framework.md | PSD summary and NPS structure. |
| Payment System Notice - 2025.md | Capital, fees, e-money limits. |
| Electronic Transactions Act 4 of 2019.md | Audit trails, electronic records. |
| Namibia QR Code Standards.md | NamQR. |
| **Smartpay_Vouchers_Virtual_Assets_Act_Analysis.md** | **Vouchers vs Virtual Assets Act:** conclusion that G2P vouchers do not fall under the Act (no DLT; fiat exclusion; closed-loop). Use for Pepua/Legal if asked; optional leave-behind. |
| Virtal Assets Act.md | Virtual Assets Act 2023; definitions and exclusions (closed-loop). |

---

*This strategy and presentation brief should be revisited with legal/compliance before the meeting and updated after any new guidance from the Bank.*
