# 🧠 DealFlow360 Deep Dive — every feature, every file, every cross-question

Study this before judging. For each feature: what it does, **where the code lives** (so you can open it live), how the logic works, and the cross-questions judges ask — with answers.

---

## 0. Repo map — one line per file

```
server.js                  Express entry: mounts 7 API routers, serves client/dist, error handler
test-e2e.js                54 HTTP checks covering the official 8-step Quick Test Flow
supervisor.js              Auto-restarts the server if it crashes (demo safety net)
start.bat / start.sh       install → build client → run

src/db.js                  PostgreSQL layer: pg pool, ?→$n shim, RETURNING id, TX, 21-table schema, seed
src/util.js                Sessions & guards: cookies, requireAuth / requireInternal / requireRole / requirePortal
src/engines.js             ★ ALL business logic (pricing, risk, upsell, split, billing, health, commission, audit)
src/exporter.js            CSV / XLS / PDF writers, zero dependencies
src/routes/auth.js         login, signup, logout, me, portal-login, users, customers
src/routes/config.js       categories, products, pricelists, governance, warehouses, stock, plans, upsell rules, settings, audit
src/routes/sales.js        quotations + lines CRUD, order discount, upsell add/dismiss, submit→routing, approve/reject/return, send, negotiation
src/routes/ops.js          split suggest/accept/override, ship, consolidate, invoices, pay→commission, subscription modify/cancel
src/routes/portal.js       demo-quotes, portal quote view, comment, counter, confirm→auto re-approval
src/routes/dash.js         dashboard KPIs, alert actions (nudge/escalate/dismiss), sales report, exports
src/routes/commissions.js  rules CRUD, commission list/detail, confirm/approve, settle, by-salesperson + detail reports, export

client/src/api.js          fetch client, money/date formatters, status colors
client/src/auth.jsx        AuthProvider (session cookie → React state), PrivateRoute
client/src/App.jsx         HashRouter + all 20 routes
client/src/styles.css      Odoo-style design system (purple #714B67, pills, KPI chips, hover polish)
client/src/components/     Navbar (menus, bell dropdown, persona switcher), ui.jsx (Pill/Modal/Toast/RiskBar/DropBtn),
                           ListView (sort/search/pagination), charts.jsx (hoverable SVG bar/line/hbar)
client/src/pages/Sales.jsx Quotations list + kanban + QuoteDetail with 7 tabs + AddLine/Override modals
client/src/pages/…         Dashboard, Login, Customers, Catalog (products/pricelists/governance/plans/upsell),
                           Warehouses, Commissions (list/detail/rules/report), Invoices, Reports, Admin, Portal
```

**The one sentence that matters:** *routes validate input and call engines; engines own every business rule; db.js owns every query.* If a judge asks "where is the discount rule?" — it's `src/engines.js`, one function, one place.

---

## 1. Authentication & RBAC

**Where:** `src/util.js` (sessions, guards) · `src/routes/auth.js` · `client/src/auth.jsx`

**How:** passwords hashed with **scrypt** (salt:hash, no external libs). Login creates a random 32-byte token stored in `sessions` (7-day expiry) and set as an **HttpOnly cookie** (`df_session`). Customers get a **separate cookie** (`df_portal`) — internal and portal sessions are different surfaces by design.

Guards: `requireAuth` (any user) · `requireInternal` (no customers) · `requireRole('admin','manager')` · `requirePortal` (portal cookie OR `?k=` magic token).

**Cross-questions:**
- *"How are passwords stored?"* — scrypt with per-user salt; verification uses `timingSafeEqual`.
- *"Can a customer hit internal APIs?"* — No: `requireInternal` rejects role `customer` with 403; the E2E suite tests this.
- *"Magic link security?"* — 12-byte random token per quotation; grants access to **that one quote only**; customers with login see **only their own company's quotes** (tested: Acme's portal user gets 404 on Delta's quote).

---

## 2. Pricing engine

**Where:** `engines.js → unitPriceFor()` · config UI: Products + Pricelists pages

**How (in order):**
1. start at `base_price`;
2. add variant `extra_price` if chosen;
3. subscription products take the plan's `recurring_price`;
4. tier+currency price-list rule applies to **one-time products only**: discount% off list, or markup% (e.g. INR bronze +4%).

**Cross-questions:**
- *"Gold customer price?"* — Gold Partner Program = **5% off** list; Silver = 2% off; Bronze/INR = +4% markup.
- *"Why don't subscriptions get the tier discount?"* — recurring prices come from the plan contract; tier discounts apply to catalog goods.

---

## 3. ★ Discount governance & blended risk (the core innovation)

**Where:** `engines.js → allowedDiscountFor()`, `effectiveDiscount()`, `computeRisk()`, `requiredApprovalLevel()` · UI: quote header risk bar + **Approvals tab** breakdown · config: Governance page

**The rules:**
- Allowed per line = **min(tier ceiling, category ceiling)** — bronze 5 / silver 10 / gold 15; Hardware 15 / Services 10 / Subscriptions 12 / Accessories 20.
- Effective discount **compounds**: `eff = line% + order% × (1 − line%/100)`.
- Violation per line = `max(0, eff − allowed)`.
- **Blended risk = worst violation + 0.5 × (sum of the rest)**.

**Worked example (memorize):** Gold customer, laptop at 12% (ceiling 15 → OK), Installation at 18% (Services ceiling 10 → violation 8). Blended = 8 + 0.5×0 = **8.0**.

**Routing** (from `approval_rules`, editable): risk ≤ 0 → auto-approve; 0.5–5 → Manager; > 5 (or any single line > 20%) → **Manager then Finance**. On submit, `routeForApproval()` builds the chain: manager = step 1 `pending`, finance = step 2 `waiting`.

**Why "blended"?** — *"One bad line counts fully; many small overages still add up at half weight — you can't smuggle margin erosion by spreading it across lines."*

**Cross-questions:**
- *"Hardcoded?"* — No: tier ceilings, category ceilings, risk ranges, and the any-line hard cap are all DB rows editable in the Governance page; routing recomputes on every submit.
- *"What compounds?"* — Order-level discount applies on top of each line discount multiplicatively, not additively (12% + 5% → **16.4%**, not 17%).

---

## 4. Approval chain & audit

**Where:** `engines.js → routeForApproval()` · `routes/sales.js → /approve` · UI: Approve tab (timeline + risk table), Audit tab

Manager must act first; on manager approve the finance step flips `waiting → pending` and status becomes `pending_finance`. Actions: **approve / reject / return-for-revision** (with reason). Every action → `audit()` → row with user, timestamp, action, details — powers the per-quote timeline and the global Audit Log page.

---

## 5. Upsell / cross-sell engine

**Where:** `engines.js → upsellSuggestions()` · UI: right panel in the builder (Add / **Dismiss** / Undo) · rules: Upsell Rules page

Rank = **co-purchase score** from `upsell_rules` (+0.15 boost if product promoted). **Margin guard:** suggestions whose own margin < `min_margin_pct` setting (30%) never surface. Each card shows price, margin delta if added, and the order margin after.

**Cross-questions:**
- *"Does it learn?"* — Not live; rules are seeded from co-purchase history and editable/creatable in the UI. Learning from live orders is our "what's next".
- *"Dismiss?"* — persisted on the quotation (`dismissed_suggestions`), filtered by the engine, restorable via Undo.

---

## 6. Multi-warehouse split & backorders

**Where:** `engines.js → suggestSplit()`, `canConsolidate()` · `routes/ops.js → /split/accept`, `/split/override`, `/ship`, `/consolidate` · UI: Fulfillment tab (Accept split / **Manual override** / Ship / Consolidate)

**Algorithm (greedy, per stocked one-time line):** prefer warehouses **already shipping this order** (consolidation) → then **largest availability** (fewest splits) → then **lowest freight weight**. Two lines of the same order never double-count stock (a `committed` map). Remainder → **backorder** parked at the cheapest warehouse. Accepting the split **confirms the order** and triggers billing.

**Worked example:** 10 × Laptop Pro, stock Main 8 / East 6 / West 4 → Main 8 + East 2 = **2 shipments**, est. cost 18×1.0 + 18×1.4 = **$43.20**.

**Cross-questions:**
- *"Manual override?"* — a modal prefilled from the suggestion; per-line warehouse/qty/status; validated against stock at ship time.
- *"Backorder lifecycle?"* — ship decrements stock; when restock arrives, **Consolidate** re-allocates and can flip the order to fulfilled.
- *"Multi-line same product?"* — the committed map subtracts quantities already promised by this order.

---

## 7. Hybrid billing, proration & credit notes

**Where:** `engines.js → generateBillingOnConfirm()`, `prorateLineChange()`, `cancelSubscriptionCredit()`, `generateDueInvoices()` · `routes/ops.js → /subscription` · UI: Invoicing tab (separate one-time/recurring, schedule, Pay, Modify/Cancel)

**On confirm:** one-time lines → a single invoice (net + tax); each subscription line → first-cycle invoice **now** + **11 scheduled future cycles** in `billing_schedule`. "Generate due" converts due cycles into invoices.

**Proration (daily):** mid-cycle qty change → delta = Δqty × per-user net price × days-remaining / days-in-cycle → an adjustment invoice (or credit note if negative).

**Worked example (from the E2E):** backup line $29/user, 10% discount → $26.10/user; 20→30 users with 30 of 60 days left → 10 × 26.10 × 30/60 = **$130.50** charge.

**Cancel:** policy from the plan — `refund_prorated` (unused days), `refund_pct` (e.g. 70% × remaining), or none → automatic **credit note** invoice.

---

## 8. Deal health & anomaly alerts

**Where:** `engines.js → refreshAlerts()`, `repBaselineDiscount()` · `routes/dash.js → /alerts/:id/:action` · UI: dashboard alerts + navbar bell dropdown

Three kinds, all configurable via Settings:
- **Stalled** — draft/sent/negotiating with no activity > N days (3).
- **Discount anomaly** — confirmed deal whose avg discount > rep's own historical baseline × multiplier (1.5); needs ≥3 deals of history before flagging (no false positives on new reps).
- **Slippage** — past promised delivery with open planned/backorder lines.

Actions: **Nudge** (rep), **Escalate** (manager), **Dismiss**. Alert rows and bell items click straight into the quotation.

---

## 9. Customer portal & automatic re-approval

**Where:** `routes/portal.js` · UI: `pages/Portal.jsx` (magic-link quote view, landing page) + Customer tab (link, negotiation thread)

Two access paths: portal login (own company's quotes) or **per-quote magic link** (`/#/portal/q/QT-…?k=token`). Customer can: comment per line, **counter a discount %**, and **one-click confirm**.

**The self-governing moment:** confirming accepts any open counter → discounts applied to all lines → risk recomputed → if over ceilings the quote **re-enters the approval chain automatically** (audit: *"Customer confirmed negotiated terms — automatically re-routed"*).

---

## 10. Commissions

**Where:** `engines.js → generateCommissionsForInvoice()` · `routes/commissions.js` · UI: Commissions list/detail, Rules, By-Salesperson report (+Detail), settle

**Trigger:** invoice fully paid (in `routes/ops.js /pay`). Idempotent (one commission per invoice). Credit notes never commission.

**Rule matching — most specific wins:** product › category › salesperson › team › everyone.
**Rate types:** flat % · fixed $ · **margin-tier ladder** (JSONB: e.g. ≥40% → 6%, ≥30% → 4.5%, ≥20% → 3%, else 1.5%).

**Lifecycle:** draft → **confirmed** (owning rep or manager) → **approved** (manager) → **paid** (finance **Settle payout** run, per period optional). Reports: per-rep totals by status, leaderboard, period chart; CSV/XLS/PDF statements.

**Worked example:** $10,000 invoice, order margin 35% → tier ≥30% → 4.5% → **$450** commission.

---

## 11. Reporting & exports

**Where:** `routes/dash.js → reportRows()` + `/reports/export` · `src/exporter.js` · UI: Reports page

Filters: **period (from/to) · rep · approval status · category · product**. Exports: **CSV (BOM), XLS (SpreadsheetML 2003 — opens in Excel), PDF (hand-built: Helvetica + xref table)** — all generated in-process, zero libraries. Commission statements export the same way.

---

## 12. Data model (21 tables — the relationships that matter)

```
customers 1─N quotations N─1 users(rep)
quotations 1─N quotation_lines N─1 products N─1 categories
quotations 1─N approvals · negotiations · fulfillment_splits · billing_schedule · invoices
invoices 1─N payments ; invoice paid → commissions (N─1 users, N─1 commission_rules)
config: discount_tiers · approval_rules · price_lists · warehouses · stock_levels
        subscription_plans · product_plans · upsell_rules · commission_rules
ops:    audit_log · alerts · settings · sessions
```

Timestamps are TEXT ISO-8601 UTC (deterministic API + frontend formatting). Statuses are **CHECK-constrained** in PostgreSQL; rule tables have UNIQUE keys; margin tiers are JSONB.

---

## 13. "Where is X?" — instant code index

| If they ask about… | Open | Function |
|---|---|---|
| Discount ceilings / risk score | src/engines.js | `allowedDiscountFor`, `computeRisk` |
| Approval routing | src/engines.js | `requiredApprovalLevel`, `routeForApproval` |
| Tier pricing | src/engines.js | `unitPriceFor` |
| Upsell ranking / margin guard | src/engines.js | `upsellSuggestions` |
| Warehouse split algorithm | src/engines.js | `suggestSplit` |
| Billing on confirm / schedule | src/engines.js | `generateBillingOnConfirm` |
| Proration math | src/engines.js | `prorateLineChange` |
| Credit notes on cancel | src/engines.js | `cancelSubscriptionCredit` |
| Stalled/anomaly/slippage | src/engines.js | `refreshAlerts` |
| Commission calculation | src/engines.js | `generateCommissionsForInvoice` |
| Portal re-approval | src/routes/portal.js | `/portal/quote/:number/confirm` |
| Payment → commission hook | src/routes/ops.js | `/invoices/:id/pay` |
| PDF/XLS/CSV generation | src/exporter.js | `buildPDF/buildXLS/buildCSV` |
| RBAC guards | src/util.js | `requireRole`, `requirePortal` |
| The 54 tests | test-e2e.js | `node test-e2e.js` |

---

## 14. The numbers to say without blinking

- **8/8** quick-test flow steps working, covered by **54** automated checks — all passing
- Risk formula: **worst + ½ rest** · compounding: 12% + 5% → **16.4%**
- Split example: 10 laptops → Main 8 + East 2 = **2 shipments / $43.20**
- Proration example: 10 × $26.10 × 30/60 = **$130.50**
- Commission example: $10k @ 35% margin → 4.5% → **$450**
- Stack: React 18 + Vite · Express 5 · **PostgreSQL, 21 tables** · **70 commits**
- 5 roles, separate portal surface, per-quote magic links, cross-tenant blocking **tested**
