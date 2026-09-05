# DealFlow360 🌊

**An Intelligent, Self-Governing Sales Operations Platform** — built for the Odoo Hackathon.

**Stack: React 18 (Vite) · Node.js 22 (Express 5) · PostgreSQL** — no UI, chart or export libraries; every business rule is real application logic.

Most sales tools stop at quote → confirm → invoice. Real B2B teams live in messier conditions: multi-level discount approvals, partial stock spread across warehouses, subscriptions mixed with one-time hardware, customers who want to negotiate in a portal instead of over email, and managers who only find out a deal is stuck after it has lost momentum. **DealFlow360 makes the deal govern itself**: every discount is checked live against tier *and* category ceilings, risky quotes route their own approvals, orders split themselves across warehouses on *free* stock, subscriptions and one-time lines bill together with real proration, customers negotiate line-by-line in a restricted portal whose confirmations re-enter approval automatically, and commissions pay out the moment cash lands.

---

## ✨ What it does (mapped to the problem statement)

| Brief | Module | Highlights |
|---|---|---|
| A1 | **Auth** | Staff signup/login (scrypt), 5 roles with RBAC on every endpoint; customer portal login **or** per-quotation secure link — separate cookie surface |
| A2 | **Products & pricelists** | Categories, variants with extra price, tier × currency pricelists (discount or markup), plan pricing for subscriptions |
| A3 | **Discount governance** | Tier ceilings (Bronze 5 / Silver 10 / Gold 15), category ceilings, **blended risk score**, approval chain Manager → Finance with hard caps; every decision audited |
| A4 | **Warehouses** | Stock per warehouse, reorder point + replenishment lot (**one-click replenishment rules**), shipping-cost weighting for the split engine |
| A5 | **Subscription plans** | Monthly / quarterly / yearly, proration rule (daily or none), cancellation policy (prorated / % / none) with notice period |
| A6 | **Upsell rules** | Co-purchase scores, promoted boost, minimum-margin floor |
| A7 | **Reporting** | Period / rep / approval / product / category filters, PDF · XLS · CSV export |
| B1–B3 | **Sales workspace** | Quotations list, Pipeline kanban, Reload Data / Go to Back-end / Close Workspace; builder with +/− quantities, line & order discounts, ceiling badges, **live margin indicator** |
| B4 | **Approval screen** | Blended score, per-line breakdown, chain timeline, approve / return / reject with reasons, full audit trail |
| B5 | **Upsell panel** | Ranked suggestions with margin delta and promotion tag; Add / Dismiss (undo) — totals and margin update instantly |
| B6 | **Fulfillment split** | Suggested split on **free stock** (units promised to other orders are excluded), shipment count + cost, Accept / Manual override, backorders; **restock raises the "Consolidate Remaining Backorder" prompt automatically** |
| B7 | **Billing** | One-time and recurring lines invoiced separately, 12-month schedule, **cycle-anchored daily proration**, cancel → credit note per policy, **one-click recurring billing run** for every due cycle |
| B8 | **Customer portal** | Restricted surface; statuses Sent / Under Negotiation / Confirmed; **line-level questions & change requests**, counter-offer, one-click confirm; rep replies in-thread; auto re-approval when terms breach ceilings |
| B9 | **Deal health** | Stalled, discount anomaly (incl. early warning on live quotes), delivery slippage, backorder-ready alerts; click-through, nudge / escalate |
| + | **Commissions** | Rule engine (product › category › rep › team › all; % / fixed / margin-tiered), auto-generated on full payment, draft → confirmed → approved → paid, statements |

---

## 🚀 Quick start

### Option A — Docker (nothing to install)
```bash
docker compose up --build        # → http://localhost:4300
```

### Option B — local PostgreSQL
```bash
# 1. PostgreSQL 14+ (one-time, in psql as a superuser)
CREATE USER dealflow WITH PASSWORD 'DealFlow@2026';
CREATE DATABASE dealflow360 OWNER dealflow;

# 2. Install, build the client, run
npm run setup                    # npm install (server + client) + vite build
npm start                        # → http://localhost:4300
```
Windows: double-click `start.bat` (does all of the above). Dev mode with hot reload: `npm start` + `npm run client` (Vite on :5173 proxies `/api`).

Connection defaults: `localhost:5432 / dealflow / DealFlow@2026 / dealflow360` — override with `PGHOST PGPORT PGUSER PGPASSWORD PGDATABASE` (see `.env.example`). The schema is created and a "lived-in" demo company is seeded automatically on first start: **10 customers, 4 sales reps and ~270 quotations over 8 months** (≈200 fulfilled with paid invoices, shipments, subscription schedules and commissions), all generated deterministically and priced/risk-scored by the same engines the live app uses.

**Performance under that dataset** (sequential requests, local PostgreSQL): every API endpoint answers in **< 10 ms median** (quotation list 7 ms, dashboard 10 ms, sales report 6 ms, quotation detail 7 ms, PDF export 6 ms); the only >20 ms outlier is the dashboard's throttled deal-health re-scan (≈50 ms, at most once per 15 s). Money KPIs are normalised to a reporting currency (USD) via each quotation's exchange rate, so INR and USD deals never add up naively.

| Command | What it does |
|---|---|
| `npm start` | API + built React app on **http://localhost:4300** |
| `npm run reset` | Drop + reseed the demo database (deterministic seed) |
| `npm test` | 102-check end-to-end suite over HTTP (`DF_PORT=4310 npm test` to target another port) |
| `npm run test:fresh` | reset, then test |

## 👤 Demo accounts

| Role | Email | Password | What to show |
|---|---|---|---|
| Sales Rep (Gangadhar, Enterprise) | `rep@dealflow.io` | `Rep@123` | Builder, upsell panel, portal replies, commissions |
| Sales Rep (Vikram, SMB) | `rep2@dealflow.io` | `Rep@123` | Second rep for team reports |
| Sales Reps (Neha Iyer, Karan Mehta) | `rep3@dealflow.io`, `rep4@dealflow.io` | `Rep@123` | Volume history owners — leaderboard, commission statements |
| Sales Manager (Achintya) | `manager@dealflow.io` | `Manager@123` | Approval inbox, deal health, commission approval |
| Finance (Arpit) | `finance@dealflow.io` | `Finance@123` | 2nd-level approvals, restock / replenishment, invoices, settlement |
| Admin | `admin@dealflow.io` | `Admin@123` | All backend configuration |
| Customer — Acme Corp (gold) | `buyer@acmecorp.com` | `Customer@123` | Portal: own quotations only |
| Customer — Gamma Retail (bronze, INR) | `buyer@gammaretail.in` | `Customer@123` | Portal, INR quotes |
| Customer — Delta Logistics (gold) | `buyer@deltalog.com` | `Customer@123` | Portal negotiation on **QT-1032** |

The **avatar menu (top right) switches persona** in one click. The **🌐 Customer Portal** button opens the separate portal surface in a new tab (`/#/portal`). Every quotation also has a per-quotation **secure link** (`/#/portal/q/QT-1032?k=…`, copy it from the quotation's *Customer* tab) that opens that one quotation without any login.

## 🧪 The official 8-step Quick Test Flow

1. **Configure** — Products / Pricelists / Discount Governance / Warehouses / Subscription plans / Upsell rules (all live; no restart).
2. **Build a quotation** with a discount above the ceiling — the line shows `+N over` instantly and the blended risk bar moves.
3. **Submit** — the quote routes itself to Manager (or Manager → Finance); nobody files a request.
4. **Accept an upsell** — total and margin update immediately; the suggestion is re-ranked away.
5. **Approve** as Manager, then Finance — the *Fulfillment* tab suggests a split across warehouses on free stock; accept or override.
6. **Billing** — one-time invoice and recurring cycle-1 invoice are separate; change a subscription quantity → prorated charge for the remaining days of the current cycle.
7. **Portal** — as the customer, counter at a bigger discount and confirm → the quote re-enters approval automatically; the rep sees the banner and the audit entry.
8. **Pay** — record a payment → invoice PAID → the salesperson's commission is drafted automatically.

`npm test` automates all eight steps plus tenant isolation, reserved stock, automatic backorder prompts, replenishment rules, proration rules and cancellation credits (102 checks).

## 🏗 Architecture

**One-page diagram (data model + module connections): [docs/architecture.svg](docs/architecture.svg)** · narrative + Mermaid: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

```
client/               React 18 + Vite SPA (Odoo-inspired design system, zero UI libraries)
  src/pages/          Sales (workspace, builder, approvals, fulfillment, billing, customer thread), Portal (separate surface),
                      Dashboard, Reports, Catalog, Warehouses, Invoices, Commissions, Admin
server.js             Express 5 — serves /api + client/dist
src/db.js             PostgreSQL layer (pg pool, ?→$n shim, schema, idempotent migrations, deterministic demo seed)
src/engines.js        pricing · blended risk & routing · upsell · warehouse split (free stock) · billing/proration ·
                      deal health · replenishment · commission · audit
src/routes/           auth · config · sales · ops · portal · dash · commissions  (RBAC middleware in src/util.js)
src/exporter.js       dependency-free CSV / XLS (SpreadsheetML) / PDF writers · src/invoiceDoc.js invoice PDFs
test-e2e.js           102-check end-to-end suite (the full quick-test flow + edge cases, over HTTP)
```

**Blended risk** — `allowed = min(tier ceiling, category ceiling)`, `violation = max(0, effective − allowed)`, `risk = worst + ½·Σ(others)`; `approval_rules` map the score to *none / manager / manager + finance* (plus a hard cap for any single line). The same engine runs on submit, on rep-accepted counters and on portal confirmations.

**Inventory reality** — split suggestions and consolidation only promise *free* stock (on hand − planned by other confirmed orders); stock decrements when a shipment leaves; a restock or replenishment run re-evaluates every open backorder and raises the consolidate prompt.

**Hybrid billing** — recurring cycles are anchored on the last invoiced date; proration = Δqty × unit × days remaining / days in cycle (or none, per plan); cancellation credit = policy × unused days after the notice period.

## 🔮 What we'd build next (with more time)

1. **Learned upsell scoring** — derive co-purchase scores from live order history nightly (with confidence intervals and per-segment ranking) instead of seeded rules.
2. **Approval SLAs & delegation** — timers that auto-escalate stale approvals, out-of-office delegation, and Slack/email notifications for approvers and customers.
3. **Stock reservations with expiry & ATP** — reserve at approval with a time-to-live, available-to-promise dates from replenishment lead times, carrier rate cards for the shipping-cost model.
4. **Accounting integration** — journal export of invoices, credit notes, payments and commission settlements; GST/VAT by region; multi-company books.
5. **Commission forecasting** — projected vs earned payouts from the open pipeline weighted by stage.

## 📜 Repository

- `DEMO_GUIDE.md` — 5-minute demo script (two full flows)
- `docs/ARCHITECTURE.md`, `docs/architecture.svg` — architecture one-pager
- `docker-compose.yml`, `Dockerfile` — one-command environment
