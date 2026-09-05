# 🎬 DealFlow360 v2 — 5-Minute Demo Script

Two complete end-to-end flows: a governed high-discount deal (quote → approval → multi-warehouse fulfillment → hybrid billing → payment → **commission**), and a portal negotiation that automatically re-enters approval.

**Prep:** server running (`npm start` or `start.bat`), browser at `http://localhost:4300`. If demo data is messy: `npm run reset` + restart — everything below works on the fresh seed.

**Killer feature for demos:** the **avatar menu (top-right) is a persona switcher** — one click switches between Rep / Manager / Finance / Admin. No logging out, no second browser tab.

---

## Flow A — The self-governing deal (≈ 3 min)

### 1. Rep builds a risky quote (40s)
Login as **rep@dealflow.io / Rep@123** (click the quick-fill chip).
→ **＋ New** → customer **Acme Corp (gold)** → Create.
- **＋ Add line** → *Laptop Pro 15"* → qty **10**, discount **12%** ✓ (within 15% ceiling).
- **＋ Add line** → *Installation & Setup* → discount **18%**.
- 🔴 Instantly: the line shows **+8 over** in red — Services ceiling is 10% even for Gold. The header **risk bar jumps to 8.0**.

**Say:** *"Every line is checked live against the stricter of the customer tier and the product category — a Gold customer doesn't get Gold freedom on thin-margin services."*

### 2. Upsell panel (20s)
Right panel: ranked suggestions from co-purchase history (**Wireless Mouse 0.92**, promoted items boosted +0.15), each showing **+margin delta** and the order margin after adding.
→ **Add** the top one → totals, margin and ranking update instantly (no dupes).

**Say:** *"Margin-guarded — suggestions below the configured margin floor never appear, and you see the margin impact before you add."*

### 3. Auto-routing (15s)
→ **Submit for approval ▸** → status flips to **To Approve (Manager)** with toast *"Auto-routed — blended risk 8"*.

**Say:** *"Nobody files approval requests here. The blended risk score decided: worst violation counts fully, the rest at half weight — so spreading small over-discounts across many lines can't slip through either."*

### 4. Manager → Finance chain (30s)
Avatar menu → **Priya Sharma (Manager)**.
→ Open the quote from the list (badge **To Approve**) → **Approvals tab**: chain timeline + line-by-line risk breakdown.
→ **Approve / Reject ▼ → ✅ Approve** → status becomes **To Approve (Finance)** automatically.
Avatar menu → **Rahul Mehta (Finance)** → same quote → **✅ Approve** → **Approved**.

### 5. Multi-warehouse split (25s)
Back as **Asha** (rep) → **Fulfillment tab** → right panel shows the suggested split: e.g. **2 shipments across Main + East, est. $43.20**, remainder **backordered**.
→ **Accept split → confirm order**.

**Say:** *"Greedy consolidation: warehouses already shipping this order win, then largest availability, then cheapest freight — fewest shipments, backorders parked at the cheapest warehouse."*

### 6. Pay → commission generates itself (30s)
→ **Invoicing tab**: one-time invoice + recurring first-cycle invoice generated separately, 11-cycle schedule below.
→ **💰 Pay** on the one-time invoice → PAID → toast mentions the commission.
→ **Commission tab**: a **draft commission** just appeared, rule-matched with the margin-tier rate.

**Say:** *"The moment cash lands, the commission engine picks the most specific rule — product over category over salesperson over team — and computes the payout. The rep confirms it, the manager approves, finance settles."*

*(Optional 15s: Reports → Commissions by Salesperson — leaderboard and status breakdowns; 💸 Settle payout as Finance.)*

---

## Flow B — Customer portal negotiation (≈ 1.5 min)

### 7. Open the portal (15s)
Click **🌐 Customer Portal** in the navbar → landing page lists live quotes.
→ **Open Negotiation Portal →** on **QT-1032** (or any Sent quote) — that's the magic-link surface, zero login.

### 8. Customer negotiates (30s)
→ Type a message → **Send message**.
→ **Counter-offer: discount 22%** → **Send counter-offer** → status **Negotiating**.
→ **✔ Confirm quotation**.

### 9. Automatic re-approval (20s)
Portal now shows **To Approve (Manager)**. Switch persona to Manager → the quote **re-entered the approval chain by itself**; the audit trail logs *"Customer confirmed negotiated terms — automatically re-routed"*.

**Say:** *"The portal is a real restricted surface — magic link or separate login, customers only ever see their own company's quotes. The moment their negotiated terms breach ceilings, governance takes over again. Automatically."*

---

## Flow C — Control room (if time allows, 30s)

Dashboard: **KPI chips** (To Confirm / To Deliver / To Invoice), revenue chart, and **deal-health alerts** — stalled deal, discount anomaly (22% vs rep baseline ×1.5), delivery slippage — each with **Nudge / Escalate / Dismiss**.
Then **Reporting → Sales**: filter by period/rep/approval → **⬇ PDF / XLS / CSV** — generated in-process, no libraries.

---

## Q&A ammo

- **"Is the risk score hardcoded?"** No — ceilings and risk→approver mapping editable in **Discount Governance**; routing recomputes on every submit.
- **"Does the split really check stock?"** Yes — shipping decrements stock live; restock in **Warehouses** and the **Consolidate** button appears on open backorders.
- **"Proration?"** Daily, for the remaining days of the current cycle; cancellations follow the plan policy (prorated / % / none) with a credit note.
- **"Commissions?"** Rule engine: scope (product›category›salesperson›team›all) × rate type (%/fixed/margin-tier), lifecycle draft→confirmed→approved→paid with finance settlement runs + CSV/XLS/PDF statements.
- **"How is it tested?"** `npm test` — 54 automated checks over HTTP covering the official 8-step flow, including security (cross-tenant portal blocked, RBAC enforced).
- **"Stack?"** React 18 (Vite, zero UI libs) · Node.js + Express · PostgreSQL (21 tables) · 67 commits, full audit trail.

Full talking points: see **PITCH.md**.
