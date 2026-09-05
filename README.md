# DealFlow360 🌊

**An Intelligent, Self-Governing Sales Operations Platform** — built for the Odoo Hackathon.

Most sales tools stop at quote → confirm → invoice. Real B2B teams operate in messier conditions: multi-level discount approvals, partial stock spread across warehouses, subscriptions mixed with one-time hardware, customers who want to negotiate in a portal instead of over email, and managers who discover a deal is stuck only after it has lost momentum. **DealFlow360 is a self-governing deal engine** — it enforces pricing discipline, reacts to inventory reality in real time, keeps recurring and one-time revenue reconciled on a single order, and gives reps *and* customers a living, negotiable document.

---

## 🚀 Run it (zero setup)

```bash
npm install        # only dependency: express
npm start          # → http://localhost:4300
```

- **Stack**: Node.js 22+ (built-in `node:sqlite` — a real SQL database, no external DB server), Express, vanilla JS/CSS frontend. No CDNs, works fully offline on the demo machine.
- **Database**: auto-created and auto-seeded with a "lived-in" company on first start (`data/dealflow360.db`). Reset anytime with `npm run reset` + restart.

## 👤 Demo accounts

| Role | Email | Password | What to show |
|---|---|---|---|
| Sales Rep (Asha) | `rep@dealflow.io` | `Rep@123` | Workspace, builder, upsell panel |
| Sales Manager (Priya) | `manager@dealflow.io` | `Manager@123` | Approval inbox, deal health |
| Finance (Rahul) | `finance@dealflow.io` | `Finance@123` | 2nd-level approvals, restock, invoices |
| Admin | `admin@dealflow.io` | `Admin@123` | All backend configuration |
| Customer — Acme Corp | `buyer@acmecorp.com` | `Customer@123` | Portal negotiation |
| Customer — Gamma Retail | `buyer@gammaretail.in` | `Customer@123` | Portal (INR quotes) |

Every quotation also gets a **magic portal link** (`/portal/q/QT-1032?k=…`) — the customer can view and negotiate with zero login.

## ✅ The 8-step Quick Test Flow (all automated in `test-e2e.js` — 54 checks)

1. **Login + backend pre-configured** — discount tiers (Bronze 5% / Silver 10% / Gold 15%), 3 warehouses, 3 subscription plans seeded.
2. **Over-limit discount flagged while building** — a Services line at 18% on a Gold customer breaches the 10% category ceiling → line shows ⚠ violation points.
3. **Auto-routing on submit** — blended risk 8 → routed **Manager → Finance** with zero manual asking.
4. **Upsell panel** — ranked by co-purchase history + promotion boost, filtered by minimum margin; one click updates total & live margin instantly.
5. **Approval → warehouse split** — 10 laptops across stock of 8+6+4 → suggested split over 2 warehouses, minimizing shipments then cost; accept or manually override.
6. **Hybrid billing** — one-time invoice + separate recurring first-cycle invoice + 11 future scheduled cycles; mid-cycle qty change issues a **daily-prorated** adjustment; cancellation issues a **credit note** per plan policy.
7. **Portal negotiation** — customer counters 22% via magic link → confirms → **automatically re-enters the approval flow** because terms now breach ceilings.
8. **Payment** — record payment on the invoice → status flips to **PAID**.

Bonus verified: deal-health alerts (stalled / discount-anomaly / delivery-slippage) with nudge & escalate actions, backorder consolidation when new stock arrives, CSV/XLS/PDF exports, cross-tenant portal security, RBAC on every endpoint.

```bash
node test-e2e.js   # requires the server running; resets nothing, mutates demo data
```

## 🧠 The blended discount risk score (the core idea)

Every line is checked against **its own** ceiling = `min(customer-tier ceiling, product-category ceiling)`.

```
violation(line)   = max(0, effectiveDiscount − allowed)
blendedRisk       = worstViolation + 0.5 × (Σ other violations)
```

- A single bad line flags the whole quote (Services 18% vs ≤10% → risk 8 → Manager **+ Finance**).
- Many small violations also add up — a rep can't quietly give away margin one "technically fine" line at a time.
- Routing thresholds are **configurable** in the backend (Discount Governance): Manager reviews risk 0.5–5, Manager→Finance for >5 or any single line over the 20% hard cap.

## 🏗️ Architecture

See **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** for the one-page diagram + data model.

```
server.js                 Express app, static SPA, API mount
src/db.js                 SQLite schema + seed (17 tables)
src/engines.js            THE BUSINESS LOGIC:
  ├─ pricing.js-logic     tier/currency price lists, variant pricing
  ├─ risk engine          blended discount risk + approval routing
  ├─ upsell engine        co-purchase scoring + promo boost + margin floor
  ├─ split engine         multi-warehouse allocation (min shipments → min cost)
  ├─ billing engine       schedules, daily proration, credit notes
  └─ health engine        stalled / anomaly / slippage alert materialization
src/routes/*.js           auth · config · sales · ops (fulfillment+billing) · portal · dash
src/exporter.js           dependency-free PDF / XLS / CSV writers
public/                   SPA: app.js (backend+dashboard), workspace.js (rep),
                          portal.js (customer), design system CSS
```

**Security model**: scrypt password hashing, HttpOnly session cookies, role middleware (admin / manager / finance / salesrep / customer), and a **strictly separate portal surface** — customers authenticate against their own cookie or a per-quote magic token, and can only ever read/negotiate their own company's quotations (verified by test).

## 🎬 5-minute demo script

See **[DEMO_GUIDE.md](DEMO_GUIDE.md)** — a beat-by-beat script covering two full end-to-end flows (governed deal + portal negotiation) using the seeded data.

## 🔮 What we'd build next

1. **Real-time channel** (WebSocket/SSE) so approvals and portal negotiations push live instead of refresh.
2. **ML-trained upsell scoring** replacing the historical co-purchase matrix (factorized co-occurrence → conversion-weighted ranking per customer segment).
3. **Carrier integration** for actual shipment cost + tracking, feeding the split optimizer real rates.
4. **Dunning & payment rails** (Stripe/razorpay webhooks) so recurring cycles collect themselves.
5. **Multi-company consolidation** — the schema is already multi-currency; entity-level isolation + consolidated reporting is the next step.
6. **Audit-grade immutability** — hash-chained audit log entries for SOC2-style evidence.

---
*Team submission — Odoo Hackathon. Built from scratch: business rules implemented in application logic, nothing hardcoded for the demo.*
