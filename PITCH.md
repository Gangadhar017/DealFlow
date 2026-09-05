# 🎤 How to explain DealFlow360 — Complete Pitch Guide

Everything you need to say, in order, from 30 seconds to full technical deep-dive.

---

## 1. The 30-second elevator pitch (memorize this)

> "DealFlow360 is a **self-governing B2B sales platform**. Most sales tools stop at quote → invoice — we govern the whole deal. Every discount is checked live against customer-tier and category ceilings; risky quotes **route themselves** to manager and finance; inventory shortfalls split across warehouses automatically; subscriptions and one-time hardware are billed together with daily proration; the customer negotiates in their own portal — and the moment their counter-offer breaches policy, the deal **re-enters approval by itself**. When cash lands, salesperson commissions are calculated and settled automatically. It's built on **React, Node.js and PostgreSQL**, fully tested with 54 automated end-to-end checks."

---

## 2. The story: problem → solution (say it like this, ~90 seconds)

**The problem** — "The hackathon brief describes five real B2B pains: discount approvals happen over WhatsApp, upsell suggestions live in nobody's head, stock is spread across warehouses, subscriptions and hardware get billed in separate systems, and managers discover a stuck deal only after it's dead. And reps' commissions? Spreadsheets, three weeks late."

**Our answer** — "We made the deal itself govern the process. Six engines watch every quotation in real time" (then name them, one line each):

1. **Pricing engine** — tier + currency price lists, variant extras, plan pricing.
2. **Blended-risk engine** — every line's discount is checked against `min(tier ceiling, category ceiling)`; the blended score = worst violation + half of the rest — so spreading small over-discounts across many lines can't sneak through. The score auto-routes the quote: none → manager → manager+finance.
3. **Upsell engine** — co-purchase scoring from history + a boost for promoted products, filtered by a minimum-margin floor — it will never suggest a deal that hurts margin, and shows the live margin impact before you add.
4. **Warehouse-split engine** — greedy allocation that consolidates into warehouses already shipping the order, prefers largest availability, breaks ties on freight cost; remainders become backorders that consolidate on restock.
5. **Hybrid billing engine** — one-time lines invoice at confirm; recurring lines bill the first cycle now and schedule the next 11; mid-cycle quantity changes prorate daily; cancellations issue credit notes per plan policy.
6. **Commission engine** — the moment an invoice is fully paid, the best-matching commission rule (product › category › salesperson › team › everyone) computes the payout — flat %, fixed, or margin-tiered — and it flows through draft → confirm → approve → a finance settlement run.

**The kicker** — "Everything is audited. The customer portal runs on per-quote magic links, customers only ever see their own company's quotes, and their confirmations re-enter governance automatically if negotiated terms breach ceilings. The system is genuinely **self-governing**."

---

## 3. Explaining the stack (when judges ask "what's it built on?")

> "Three layers: a **React 18** single-page app with an Odoo-inspired design system — we wrote every component ourselves, including the SVG charts, zero UI libraries. A **Node.js + Express** API with role-based access control on five roles. And **PostgreSQL** — 21 tables, with the pricing, risk, split, billing and commission logic as a pure engine layer that any route can call."

If asked *why these choices*: "React gives a live, app-like UX (totals, risk and margin recompute as you type); Node shares one language across the stack; PostgreSQL gives real relational integrity — CHECK constraints on every status, UNIQUE keys on rules, JSONB for margin-tier ladders."

One technical flex if wanted: "Timestamps are stored as ISO-8601 UTC text so the API is deterministic, and the data layer keeps a SQLite-era `?` placeholder API via a shim that rewrites to Postgres `$n` — that let us migrate the entire backend in hours without touching SQL everywhere."

---

## 4. Mapping to the official 8-step Quick Test Flow (checklist mode)

| Step | What to say | Where to show |
|---|---|---|
| 1 Configure | "Everything is config-driven: products, pricelists, tier ceilings, approval rules, warehouses, subscription plans, upsell rules, commission rules." | Products / Pricelists / Governance / Warehouses / Plans / Upsell / Commission Rules menus |
| 2 Build quote | "Tier pricing auto-applies; every line shows its ceiling and violation live." | Quotations → New → add lines |
| 3 Discount governance | "Blended risk = worst + ½ rest; it routes itself." | Order Lines tab risk bar + Approvals tab breakdown |
| 4 Approvals | "Role-gated chain: manager always first, finance joins when risk demands." | Approve/Reject dropdown as Manager, then Finance |
| 5 Upsell | "Co-scored, margin-guarded, live margin delta." | Right panel on the builder |
| 6 Fulfillment | "Two warehouses, fewest shipments, backorder handled." | Fulfillment tab → Accept split → Ship |
| 7 Billing | "One-time and recurring invoiced separately, proration, credit notes — and **payment auto-generates the commission**." | Invoicing tab → Pay → Commission tab |
| 8 Monitor | "Stalled, anomaly and slippage alerts; reports export to PDF/XLS/CSV." | Dashboard + Reports |

Then: "All 8 steps are covered by **54 automated end-to-end checks** in `test-e2e.js` — including security checks like cross-customer portal blocking."

---

## 5. Numbers to have on the tip of your tongue

- **6** business engines (pricing, risk, upsell, split, billing, commission) + deal health
- **21** PostgreSQL tables · **~25** REST endpoints · **19** React pages/screens
- **54** automated E2E checks — all passing
- **67** commits on GitHub
- **0** UI libraries, **0** chart libraries, **0** export libraries — CSV/XLS/PDF writers built in-process
- **5** roles with real RBAC (admin / manager / finance / salesrep / customer)
- **4** commission scopes with 3 rate types, margin-tiered ladders in JSONB

---

## 6. Why this wins (differentiators — say with confidence)

1. **It's actually self-governing** — not "we show a risk score", but the score *routes the work*, and customer confirmations *re-enter approval automatically*. That's the brief's core ask.
2. **Commissions close the loop** — quote → approval → fulfillment → billing → **payment → commission → settlement**, one system of record.
3. **Everything is configurable live** — ceilings, rules, thresholds; change a tier ceiling and the next submit routes differently. No restarts.
4. **Real security model** — separate portal surface, per-quote magic links, tenant isolation, RBAC on every endpoint — and we *test* it.
5. **Engineering quality** — 54 E2E checks, audit trail on every action, dependency-free exports, clean engine/route separation.

---

## 7. Judge Q&A — likely questions and strong answers

**Q: Is the risk score hardcoded?**
A: "No — tier ceilings, category ceilings and the risk-range→approver mapping are all editable in Discount Governance, and routing recomputes on every submit."

**Q: What happens if two warehouses both have partial stock?**
A: "The split engine consolidates: it prefers warehouses already shipping the order, then largest availability, then cheapest freight. Two lines of the same order never double-count stock. Remainders become backorders; when stock arrives, one click consolidates."

**Q: How does proration actually work?**
A: "Daily. When a subscription quantity changes mid-cycle, we charge or credit the per-day price for the remaining days of the current cycle — an adjustment invoice appears instantly. Cancellation follows the plan's policy: prorated refund, percentage refund, or none."

**Q: How are commissions calculated?**
A: "On full invoice payment the engine picks the most specific matching rule — product beats category beats salesperson beats team beats everyone — and computes flat %, fixed amount, or a margin-tier rate: the higher the order margin, the higher the rate. Reps confirm their own commission, managers approve, finance runs the settlement."

**Q: Is the portal secure? Customers see everything?**
A: "It's a separate auth surface. A customer logs in with their own cookie, or opens a per-quote magic link — and either way they can only ever reach their own company's quotes. We test cross-tenant access and it's blocked. The demo-quotes list you see on the portal landing page is a deliberate demo convenience for judges."

**Q: Multi-currency?**
A: "Yes — Gamma Retail quotes in INR through price-list rules and a configurable USD→INR rate."

**Q: How do you know nothing is broken?**
A: "`npm test` runs 54 end-to-end checks over HTTP covering the full quick-test flow — governance routing, both approval levels, upsell re-ranking, stock decrement on ship, proration math, credit notes, portal negotiation, auto re-approval, commission generation, exports and RBAC."

**Q: What was the hardest part?**
A: "Keeping governance consistent when humans negotiate. A counter-offer accepted on the portal changes every line's discount — so the same risk engine has to re-run and re-route mid-conversation. We centralized all routing in one engine so the answer is identical no matter where the change comes from: builder, rep, or customer portal."

**Q: What would you build next?**
A: "Commission forecasting (projected vs earned), ERP-side accounting export, and learning the co-purchase scores from live order history instead of seeded rules."

---

## 8. One-breath summary (if you get 10 seconds at the end)

> "DealFlow360: React + Node + PostgreSQL. Six engines govern every deal — discounts route their own approvals, upsell protects margin, warehouses split themselves, subscriptions prorate daily, customers negotiate in a portal that re-enters governance, and commissions pay out the moment cash lands. 54 automated tests, everything live-configurable."
