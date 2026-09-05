# 🎯 Technical Interview Prep — DealFlow360

Mock-interview drills for this exact project. Question → strong answer. Practice saying them out loud.
Companion docs: PITCH.md (pitch), DEEP_DIVE.md (features/files/math), DEMO_GUIDE.md (demo).

---

## A. Architecture & design decisions (the "why" questions)

**Q: Walk me through the architecture.**
> "Three layers. React 18 SPA on the front, Express API in the middle, PostgreSQL at the back. The key decision: **all business logic lives in one engines file** — routes only validate input and call engines like `computeRisk()`, `suggestSplit()`, `generateCommissionsForInvoice()`. That means the discount rule is written once and answers identically whether the change comes from the rep's builder, a manager's approval, or the customer's portal confirm."

**Q: Why PostgreSQL and not MongoDB?**
> "The domain is fundamentally relational — quotations → lines → products → categories, invoices → payments → commissions. We lean on real integrity: CHECK constraints on every status enum, UNIQUE keys on rules, and JSONB for the one genuinely flexible structure, commission margin-tier ladders. So it's relational core with a document corner where it earns its place."

**Q: Why no ORM?**
> "Deliberate. The brief scores business logic, not tooling — raw parameterized SQL keeps every query visible and auditable, integrity sits in the database itself, and we keep dependencies to express + pg. Trade-off: no migration tooling; at this scale the schema is one idempotent block with a deterministic seed."

**Q: Why Express and not Next.js / NestJS?**
> "The frontend is a pure SPA served as static files; there's no SSR need. A thin Express API keeps the server simple and the React app deployable anywhere. With more time I'd look at NestJS for structure or tRPC for end-to-end typing."

**Q: Why a HashRouter instead of BrowserRouter?**
> "The built SPA is served as static files; hash routing works from any static host (and any subpath) without server-side rewrite rules. Cost: URLs carry `#` — fine for this product."

**Q: Monolith — would you split it into microservices?**
> "Not at this scale. The engines are already seam-ready: pricing, risk, billing, commissions are pure functions over SQL — extracting the commission engine into a service later wouldn't require touching business rules."

---

## B. React technical (they WILL probe here)

**Q: What is the virtual DOM and why does it matter?**
> "React keeps an in-memory tree and diffs it against the previous one after state changes — reconciliation — then applies only the minimal DOM mutations. That's why typing a discount re-renders the panel cheaply: React updates just the affected cells."

**Q: Why do lists need keys?**
> "Keys tell the reconciler which item is which across renders, so it moves/reuses nodes instead of re-creating them. We use it deliberately: our Routes are keyed by `user.id` so switching persona remounts every page and role-scoped data refetches."

**Q: useState vs useEffect — in your words.**
> "State is memory — a value plus setter; setting it re-renders. Effects are reactions — code that runs after render for anything impure: fetching, timers, subscriptions. Our pages fetch in `useEffect` with `[]` for once-on-mount, `[id]` to refetch on navigation; the navbar polls alerts on a 30s interval and the cleanup clears it."

**Q: Context vs prop drilling vs Redux?**
> "Context for low-frequency shared state — the session user and toasts. High-frequency state (chart hover, inputs) stays local to the component because context re-renders every consumer. Redux would be overkill: no deeply nested shared updates."

**Q: Controlled vs uncontrolled components?**
> "All our inputs are controlled — value in state, onChange updates it — so validation and the Pay/Confirm buttons can react to live values. Uncontrolled would need form reads on submit; fine for simple forms, but we want instant UI reactions."

**Q: How do you avoid unnecessary re-renders?**
> "Keep state as local as possible, derive during render instead of duplicating in state (totals compute from lines), and `useMemo` for expensive derivations like ListView's filter+sort. Charts isolate hover state inside the chart component so the page doesn't re-render."

**Q: SPA trade-offs?**
> "Great UX (no page reloads, live updates) at the cost of SEO and initial JS payload — ~85 KB gzipped, acceptable for a B2B internal tool."

**Q: What is `children` and where did you use it?**
> "The special prop holding whatever a component wraps. Our `Shell` injects the Navbar around any page, `PrivateRoute` decides whether its children render at all based on auth context, and the context Providers (auth, toasts) wrap the entire router. Container/guard components take children; data flows through named props."

---

## C. Node.js / Express

**Q: Explain your middleware chain.**
> "Order matters: JSON parser → request logger → route modules mounted under /api → static client → SPA fallback → /api 404 → error handler. Auth is guard middleware (`requireRole('admin')`) wrapping handlers; Express 5 also natively catches rejected promises from async handlers into the error middleware."

**Q: Sessions vs JWT — why cookies?**
> "HttpOnly cookie sessions — the token never touches JavaScript, so XSS can't exfiltrate it, and revocation is a DELETE from the sessions table. JWT would suit stateless multi-service auth; we're a single API with a sessions table, so server-side sessions are simpler and revocable."

**Q: How are passwords stored?**
> "scrypt with a per-user random salt, verified with `timingSafeEqual` — constant-time comparison to avoid timing attacks. Chose scrypt over bcrypt for zero dependencies; both are memory-hard."

**Q: How do you handle async errors?**
> "Handlers are async; Express 5 forwards rejections to the error middleware which returns 500 + message and logs. Client side, every fetch goes through one helper that throws on non-2xx, so toasts show errors uniformly."

---

## D. PostgreSQL / SQL

**Q: How do you prevent SQL injection?**
> "Every query is parameterized — the `?` placeholders are rewritten to Postgres `$n` and values travel separately from SQL text, so user input can never change query structure."

**Q: Where do transactions matter in your app?**
> "The seed runs in one transaction — all-or-nothing demo data. Multi-step runtime flows are sequential awaits on a pool; at higher concurrency I'd wrap confirm-and-bill in a transaction with row locks."

**Q: JSONB — where and why?**
> "Commission margin tiers: `[{min_margin:40, rate:6}, ...]` — rule authors can define any ladder shape without schema changes, and Postgres still indexes/validates JSON natively."

**Q: Honest unusual choice — timestamps as TEXT?**
> "Yes, ISO-8601 UTC strings. It keeps API responses deterministic and string-comparable end-to-end (session expiry checks in JS, date filters in SQL via casts). The 'proper' version is timestamptz with a serializer — a refactor I'd do with more time; calling it out because it's a known trade-off, not an accident."

**Q: Design a schema improvement.**
> "Proper FK constraints between child tables (lines→quotations) and ON DELETE CASCADE, timestamptz columns, and an index on quotations(status, rep_id) for the dashboard aggregates."

---

## E. Business-logic deep dives (your differentiator — own these)

**Q: Explain the blended risk score and why not just max?**
> "Allowed per line = min(tier ceiling, category ceiling). Violation = effective discount − allowed. Blended = worst + ½ × sum of the rest. Max-only would let a rep spread ten 2-pt overages across lines and never trigger review — the half-weight tail catches erosion-by-a-thousand-cuts while not double-counting the worst line."

**Q: Why compound line and order discounts?**
> "An order-level 5% on top of a line 12% is not 17% — the customer pays (1−0.12)(1−0.05) of list, so effective = 12 + 5×0.88 = 16.4%. We audit against what the customer actually pays."

**Q: Describe the warehouse split algorithm and its complexity.**
> "Greedy per stocked line: prefer warehouses already shipping this order (consolidation), then largest availability, then cheapest freight weight; a committed-quantity map stops two lines double-booking the same stock; remainders park as backorders at the cheapest warehouse. Sorting per line → O(L·W log W); trivial at real warehouse counts, and it's an advisory suggestion — a human can override line-by-line."

**Q: How does proration work?**
> "Daily, for the remainder of the current cycle: delta = Δqty × net unit price × days_remaining / days_in_cycle. Verified end-to-end: 10 extra users × $26.10 × 30/60 = $130.50 adjustment invoice. Cancellation follows the plan policy (prorated / percentage / none) as a credit note."

**Q: How are commissions triggered and matched?**
> "On full invoice payment, idempotently (one commission per invoice, credit notes excluded). Rules are matched most-specific-wins: product › category › salesperson › team › everyone; rate is flat %, fixed, or a margin-tier ladder. Lifecycle draft→confirmed→approved→paid with finance settlement runs — full audit."

**Q: The portal re-enters approval — how?**
> "Confirming applies any open counter to every line, recomputes risk through the same `requiredApprovalLevel()` the rep's submit uses, and if over ceilings rebuilds the approval chain. Same function, same answer, regardless of who changed the terms."

---

## F. Security

**Q: How is the portal isolated from internal users?**
> "Separate cookie (`df_portal`) via `requirePortal` — which accepts either a portal login or a per-quote magic token; internal tokens don't work there and portal users get 403 on internal routes. Tenancy: customers can only resolve their own company's quotes — tested cross-tenant → 404."

**Q: RBAC layers?**
> "Three: role guards on routes (admin/finance/manager), ownership on data (only the owning rep or manager can mutate a quotation; reps only see their own commissions — both 403-tested), and tenant isolation on the portal."

**Q: XSS? CSRF?**
> "React escapes by default — no dangerouslySetInnerHTML anywhere. Cookies are SameSite=Lax which blunts CSRF for our JSON-only API (no form-encoded cross-site posts). If we needed stronger: CSRF tokens on mutations."

---

## G. Testing & quality

**Q: How do you know it works?**
> "`test-e2e.js` — 54 HTTP assertions walking the official 8-step flow: governance routing, both approval levels, upsell re-ranking, stock decrement on ship, proration amount, credit notes, portal negotiation, auto re-approval, payment→commission, exports, RBAC and portal isolation. It runs against a fresh seed — the suite is stateful, so re-runs on consumed data fail by design."

**Q: What's NOT tested?**
> "Frontend rendering (no component tests) and concurrency. I'd add Playwright UI tests and wrap confirm-and-bill in a transaction before multi-user hardening."

---

## H. The adversarial traps

**Q: What's the biggest weakness?**
> "Two honest ones: TEXT timestamps instead of timestamptz — a deliberate portability shim that I'd type properly given time; and no write-path concurrency control — sequential awaits on a pool are fine for demo scale, but confirm-and-bill should be a locked transaction under real load."

**Q: Would this scale to 10,000 users?**
> "The bottlenecks are per-request SQL round-trips in the engines (N+1-ish risk lookups per line). First fixes: batch-fetch ceilings per quote, cache settings/tiers in memory with invalidation on write, add the status/rep index, then extract the commission engine behind a queue."

**Q: What would you do differently if you restarted?**
> "TypeScript end-to-end from day one — the engines are pure functions that beg for types — and tRPC or OpenAPI generation instead of a hand-rolled fetch client."

**Q: Did you use AI/tools?**
> "Yes — an AI pair-programmer for velocity, like a compiler: every decision, review and verification pass was deliberate. I can defend any line — pick a file."

---

## I. Build tooling & artifacts (Vite, bundlers, dist, package.json)

**Q: What bundler did you use and why?**
> "Vite 5 — Rollup under the hood for production. Two reasons over webpack/CRA: in dev it serves native ES modules, so the server starts instantly and hot-module replacement updates components in milliseconds; in prod it emits a minified, tree-shaken, content-hashed bundle — ~85 KB gzipped for the whole React app. It also proxies /api to Express during development."

**Q: What does the bundler actually do?**
> "Resolves the import graph of 30+ JSX files plus the three npm packages and emits three files: transformed JSX→JS, tree-shaken and minified code, bundled+minified CSS, with content-hashed filenames like index-Bsb33phZ.js so browsers can cache forever and still get fresh code after a rebuild."

**Q: What is `dist`?**
> "The distribution folder — the generated, production-ready output (index.html + hashed js/css). Express serves it statically. It's gitignored like node_modules: the repo carries source, not product; `npm run client:build` (or start.bat) regenerates it."

**Q: Why does the repo have TWO package.json files?**
> "Two packages in one repo: the root is the backend (express + pg), `client/` is the frontend (react + react-router-dom + vite). They install and build independently — clean separation of concerns, and each manifest documents exactly what each side needs."

**Q: package.json — what is it?**
> "The project manifest: name/version, the dependency list npm installs from, and the run scripts (`dev`, `build`, `start`). Ours declares just 3 runtime deps for the client — everything else is hand-built."

**Q: Source maps? Code splitting?**
> "Vite can emit source maps for debugging — off in our prod build for size. Code splitting (lazy routes) is the natural next optimization; at 85 KB gzipped total it isn't needed yet."

---

## J. Rapid-fire cheat sheet (36 one-liners)

1. Stack: React 18 + Vite · Express 5 · PostgreSQL — 3 runtime frontend deps
2. Logic home: `src/engines.js` — routes validate, engines decide, db queries
3. Risk = worst violation + ½ of the rest; 12%+5% compounds to 16.4%
4. Ceilings = min(tier, category); gold 15 / silver 10 / bronze 5
5. Routing: risk≤0 auto-approve · 0.5–5 manager · >5 or any line >20% → manager+finance
6. Upsell = co-score + 0.15 promo, margin floor 30%, top 6, persisted dismissals
7. Split: consolidation → largest stock → cheapest freight; committed map; backorder at cheapest
8. 10 laptops @ 8/6/4 stock → Main 8 + East 2 = 2 shipments, $43.20
9. Billing: one-time at confirm; recurring = cycle 1 now + 11 scheduled
10. Proration daily: 10 × 26.10 × 30/60 = $130.50
11. Cancel → policy credit note (prorated / % / none)
12. Pay in full → commission: product›category›rep›team›all; %/fixed/margin-tier
13. $10k @35% margin → 4.5% tier → $450
14. Commission lifecycle: draft → confirmed → approved → paid (finance settles)
15. Portal: magic link or portal login; own-company quotes only; cross-tenant 404
16. Confirm re-applies open counter → same risk engine → auto re-approval
17. Health alerts: stalled / anomaly vs rep baseline ×1.5 (needs 3-deal history) / slippage
18. Exports CSV(BOM)/XLS(SpreadsheetML)/PDF(hand-built) — zero libs
19. Invoice PDFs downloadable internally + from the portal (tenant-checked)
20. Auth: scrypt + salt, timingSafeEqual, HttpOnly cookies, 7-day sessions
21. RBAC = route guards + ownership (403-tested) + portal tenancy
22. SQL injection: parameterized $n everywhere
23. 21 tables, CHECK-constrained statuses, JSONB tiers, UNIQUE rules
24. Tests: 54 E2E HTTP checks over the official 8-step flow
25. React keys: Routes keyed by user.id → persona switch remounts
26. Charts hand-built SVG + HTML tooltips; zero chart libs
27. Design system: one styles.css, CSS variables, Odoo purple #714B67
28. Portal responsive: 800px stack, 640px tables→labeled cards
29. 74 commits, supervisor auto-restart, `npm run reset` reseeds pristine
30. Next: learned upsell scores, commission forecasting, ERP export, approval SLAs
31. Bundler: Vite 5 (Rollup inside) — native-ESM dev + HMR, minified/hashed prod bundle
32. Bundle: 304 KB → 85 KB gzipped; 3 runtime deps (react, react-dom, react-router-dom)
33. dist = generated build output, gitignored; Express serves it statically
34. Two package.json: root = backend (express, pg) · client/ = frontend (react)
35. Charts hover: highlight + guide line + HTML tooltip; hbar rows highlight
36. Nav bell = live alerts dropdown → click-through to the quotation
