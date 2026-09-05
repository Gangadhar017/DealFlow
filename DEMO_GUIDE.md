# 🎬 DealFlow360 — 5-Minute Demo Script

Covers **two complete end-to-end flows** (per deliverable requirements): a governed high-discount deal from quote → approval → multi-warehouse fulfillment → hybrid billing → payment, and a portal negotiation that automatically re-enters approval.

**Prep (before judges arrive):** server running (`npm start`), browser at `http://localhost:4300/#/login`. If demo data got messy, run `npm run reset` and restart — everything below works on the fresh seed.

---

## Flow A — The self-governing deal (≈ 3 min)

### 1. Rep builds a risky quote (30s)
Login as **rep@dealflow.io / Rep@123** (click the quick-fill chip on the login page).
→ **+ New quotation** → customer **Acme Corp** (Gold) → Create.
- Catalog → **Hardware** → add **Laptop Pro 15"** → set qty **10** (click +), line discount **12%** ✓ (within 15%).
- Catalog → **Services** → add **Installation & Setup** → line discount **18%**.
- 🔴 Instantly: line shows **⚠ 8 pts over ceiling** (Services allows only 10% — even for Gold customers). The right panel shows **Blended risk 8**.

**Say:** *"The system checks every line against its own ceiling — the stricter of the customer tier and the product category. A Gold customer doesn't get Gold-level freedom on thin-margin services."*

### 2. Upsell panel (20s)
→ Right panel: ranked suggestions from co-purchase history (**27" Monitor, score 96, PROMOTED**), each with **margin delta**.
→ Click **Add to quote** on the top suggestion → total and live margin update instantly.

### 3. Auto-routing — no manual asking (20s)
→ **✅ Submit for processing**.
🟠 Status flips to **Pending Manager** automatically; toast says it routed to **Manager → Finance**.

**Say:** *"The rep never files an approval request. The blended risk score decided the routing: worst violation counts fully, smaller ones add up at half weight — so spreading small over-discounts across many lines can't slip through either."*

### 4. Manager reviews, escalates to Finance (30s)
Copy the URL, open a **new tab**, login as **manager@dealflow.io / Manager@123** → open **QT-…** from the list (or Deal Health).
→ **Approval tab**: risk dial **8**, line-by-line compliance bars with ceiling marks, approval timeline.
→ **✓ Approve** with reason → status becomes **Pending Finance** (chain escalates automatically).

### 5. Finance approves (20s)
Login as **finance@dealflow.io / Finance@123** (or stay as admin) → same quote → **✓ Approve**.
→ Full audit trail: every action with user, timestamp, reason (show **Audit tab**).

### 6. Multi-warehouse split (30s)
As the rep → **Fulfillment tab** → **⚡ Suggest split**.
→ 10 laptops, stock is 8 (Main) + 6 (East) + 4 (West) → suggested: **2 shipments, est. $43.20** (fewest warehouses, then cheapest).
→ **✓ Accept suggested split** → order confirmed, billing generated.

### 7. Hybrid billing + payment (30s)
→ **Billing tab**: ONE-TIME lines vs RECURRING subscription lines side by side.
→ Show **billing schedule** (12 future cycles) + invoices: one-time and recurring billed **separately**.
→ **💳 Pay** the one-time invoice → status flips **PAID**.

**Optional (15s):** on a subscription line → **± Qty (prorated)** → daily-prorated adjustment invoice appears; **Cancel** → policy-based **credit note**.

---

## Flow B — Customer portal negotiation (≈ 1.5 min)

### 8. Send the quote (10s)
As the rep on any approved quote → **🔗 Send to customer** → magic link copied.
Open it in a **new tab** (or another browser window — it's a separate surface, no login).

### 9. Customer negotiates (30s)
Portal shows the live quote: status **Sent**, line items, totals.
→ 💬 button on a line → ask a question.
→ **Counter discount proposal: 22%** → **📨 Submit** → status becomes **Negotiating**.
→ **✅ Confirm quotation** → modal explains terms above ceilings go back for approval.

### 10. Automatic re-approval (20s)
Portal now shows **Pending Manager**. Switch to the rep/manager tab → the quote re-entered the approval chain by itself; the negotiation thread shows the accepted counter; the audit trail logs *"Customer confirmed negotiated terms (risk 17) — automatically re-routed"*.

**Say:** *"The portal is a real restricted surface — customers authenticate separately or use a per-quote magic link, and can only ever see their own company's quotes. The moment negotiated terms breach ceilings, governance takes over again automatically."*

---

## Flow C — Manager's control room (if time allows, 30s)

Login as manager → **Deal Health**: stalled deal (12 days), discount anomaly (22% vs 9% rep baseline ×1.5), delivery slippage — each with **Open / Nudge / Escalate**. Then **Reports**: filter by period/rep/status/product → **⬇ PDF / XLS / CSV** export (generated in-process).

---

## Q&A ammo

- **"Is the risk score hardcoded?"** No — tiers, category ceilings, and the risk-range→approver mapping are all editable in Backend → Discount Governance, and routing re-computes on every submit.
- **"Does the split really check stock?"** Yes — shipping decrements warehouse stock; restock in Backend → Warehouses → 📥 Restock makes the **Consolidate Remaining Backorder** button appear on open orders.
- **"Multi-currency?"** Gamma Retail quotes in INR via price-list rules + configurable USD→INR rate.
- **"How is it tested?"** `node test-e2e.js` — 54 automated checks covering the official 8-step Quick Test Flow, including security (cross-customer portal access is blocked, RBAC on config endpoints).
