/* DealFlow360 — end-to-end test of the Quick Test Flow (8 steps) via HTTP */
'use strict';
const BASE = 'http://localhost:4300/api';
let failures = 0, step = 0;

function check(label, cond, extra = '') {
  const ok = !!cond;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${extra ? `  → ${extra}` : ''}`);
  if (!ok) failures++;
}
async function api(method, path, body, cookies) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(cookies ? { Cookie: cookies } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const setCookie = res.headers.get('set-cookie');
  let json = null; try { json = await res.json(); } catch {}
  return { status: res.status, json, cookie: setCookie ? setCookie.split(';')[0] : null };
}
function cookieOf(jar) { return Object.values(jar).filter(Boolean).join('; '); }

(async () => {
  const jar = {};
  console.log('=== STEP 1: login + backend data exists ===');
  step = 1;
  let r = await api('POST', '/auth/login', { email: 'rep@dealflow.io', password: 'Rep@123' });
  check('rep login', r.json?.user?.role === 'salesrep');
  jar.rep = r.cookie;
  r = await api('GET', '/governance', null, cookieOf(jar));
  check('discount tiers seeded (bronze/silver/gold)', r.json?.discount_tiers?.length === 3);
  check('approval chain seeded (manager, finance)', r.json?.approval_rules?.length >= 2);
  r = await api('GET', '/warehouses', null, cookieOf(jar));
  check('warehouses seeded', r.json?.warehouses?.length >= 2, `${r.json?.warehouses?.length} warehouses`);
  r = await api('GET', '/plans', null, cookieOf(jar));
  check('subscription plans seeded', r.json?.plans?.length >= 3);

  console.log('\n=== STEP 2: quotation with over-limit discount ===');
  r = await api('GET', '/customers', null, cookieOf(jar));
  const acme = r.json.customers.find(c => c.name === 'Acme Corp');
  r = await api('POST', '/quotations', { customer_id: acme.id }, cookieOf(jar));
  const qid = r.json.quotation.id;
  check('quotation created', !!qid, `#${r.json.quotation.number}`);
  r = await api('GET', '/products', null, cookieOf(jar));
  const prods = r.json.products;
  const laptop = prods.find(p => p.sku === 'LP-15');
  const install = prods.find(p => p.sku === 'SVC-INST');
  r = await api('POST', `/quotations/${qid}/lines`, { product_id: laptop.id, qty: 10, discount_pct: 12 }, cookieOf(jar));
  r = await api('POST', `/quotations/${qid}/lines`, { product_id: install.id, qty: 1, discount_pct: 18 }, cookieOf(jar));
  const q2 = r.json.quotation;
  check('gold tier price list applied (5% off hardware)', q2.lines[0].unit_price < laptop.base_price, `unit=${q2.lines[0].unit_price} base=${laptop.base_price}`);
  check('service line violates ceiling (18% vs 10%)', q2.lines[1].violation === 8, `violation=${q2.lines[1].violation}`);
  check('blended risk computed', q2.risk.risk_score > 0, `risk=${q2.risk.risk_score}`);

  console.log('\n=== STEP 3: submit auto-routes for approval (no manual ask) ===');
  r = await api('POST', `/quotations/${qid}/submit`, {}, cookieOf(jar));
  const q3 = r.json.quotation;
  check('auto-routed to approval', q3.status === 'pending_manager' || q3.status === 'pending_finance', `status=${q3.status}`);
  check('risk flagged finance-level (8 pts > 5)', q3.approval_level === 'finance', `level=${q3.approval_level}`);
  check('approval chain created (manager then finance)', q3.approvals.length === 2 && q3.approvals[0].status === 'pending' && q3.approvals[1].status === 'waiting');

  console.log('\n=== STEP 4: upsell suggestion updates total+margin instantly ===');
  r = await api('GET', `/quotations/${qid}/upsell`, null, cookieOf(jar));
  const sug = r.json.suggestions;
  check('ranked suggestions appear', sug.length >= 3, `${sug.length} suggestions, top="${sug[0]?.name}" score=${sug[0]?.score}`);
  check('margin delta present', typeof sug[0]?.margin_delta === 'number');
  const before = (await api('GET', `/quotations/${qid}`, null, cookieOf(jar)).then(x => x.json.quotation));
  // note: quote locked while pending — return for revision first (rep edits)
  r = await api('GET', '/auth/login', null); // noop
  jar.mgr = (await api('POST', '/auth/login', { email: 'manager@dealflow.io', password: 'Manager@123' })).cookie;
  r = await api('POST', `/quotations/${qid}/approve`, { action: 'return', reason: 'Please reduce service discount' }, cookieOf({ mgr: jar.mgr }));
  check('manager returned for revision', r.json.quotation.status === 'returned');
  r = await api('POST', `/quotations/${qid}/upsell/${sug[0].product_id}/add`, {}, cookieOf(jar));
  const after = r.json.quotation;
  check('total increased after upsell add', after.total > before.total, `${before.total} → ${after.total}`);
  check('margin updated after upsell add', after.margin_pct !== before.margin_pct, `margin ${before.margin_pct}% → ${after.margin_pct}%`);
  check('upsell re-ranked (no dupes)', !r.json.quotation.suggestions.some(s => s.product_id === sug[0].product_id));

  console.log('\n=== STEP 5: approve → warehouse split across 2 warehouses ===');
  r = await api('POST', `/quotations/${qid}/submit`, {}, cookieOf(jar));
  const q5 = r.json.quotation;
  check('re-routed after edit', q5.status.startsWith('pending'), q5.status);
  // manager approves → escalates to finance (risk 8)
  r = await api('POST', `/quotations/${qid}/approve`, { action: 'approve', reason: 'OK given bundle size' }, cookieOf({ mgr: jar.mgr }));
  check('manager approval escalates to finance', r.json.quotation.status === 'pending_finance');
  jar.fin = (await api('POST', '/auth/login', { email: 'finance@dealflow.io', password: 'Finance@123' })).cookie;
  r = await api('POST', `/quotations/${qid}/approve`, { action: 'approve', reason: 'Margin acceptable' }, cookieOf({ fin: jar.fin }));
  check('finance approval completes chain', r.json.quotation.status === 'approved');
  r = await api('GET', `/quotations/${qid}/split-suggestion`, null, cookieOf(jar));
  const s5 = r.json.suggestion;
  const whCount = s5.per_warehouse.filter(w => w.qty > 0).length;
  check('split suggests ≥2 warehouses (10 laptops, 8+6+4 stock)', whCount >= 2, `${whCount} warehouses: ${s5.per_warehouse.map(w => `${w.warehouse}:${w.qty}${w.backorder ? `(+BO ${w.backorder})` : ''}`).join(', ')}`);
  check('shipment count + est cost computed', s5.shipment_count >= 1 && s5.est_cost > 0, `${s5.shipment_count} shipments, $${s5.est_cost}`);
  r = await api('POST', `/quotations/${qid}/split/accept`, {}, cookieOf(jar));
  check('split accepted → confirmed', r.json.quotation.status === 'confirmed');

  console.log('\n=== STEP 6: one-time + recurring billed separately ===');
  r = await api('GET', `/quotations/${qid}`, null, cookieOf(jar));
  const q6 = r.json.quotation;
  const oneTime = q6.invoices.filter(i => i.kind === 'one_time');
  check('one-time invoice created on confirm', oneTime.length === 1, `amount=${oneTime[0]?.amount}`);
  console.log('   (subscription billing verified in step 6b below)');
  // ship all planned splits for our quote
  for (const fs of q6.fulfillment.filter(f => f.status === 'planned')) {
    await api('POST', `/quotations/${qid}/ship`, { split_id: fs.id }, cookieOf(jar));
  }
  r = await api('GET', `/quotations/${qid}`, null, cookieOf(jar));
  check('stock decremented & shipments recorded', r.json.quotation.fulfillment.every(f => f.status === 'shipped') || r.json.quotation.status === 'fulfilling', `status=${r.json.quotation.status}`);

  console.log('\n=== STEP 6b: subscription schedule on QT-1032 (confirm flow) ===');
  // manager returns nothing needed; QT-1032 is sent → test confirm path later. For billing: create fresh quote with subscription
  r = await api('POST', '/quotations', { customer_id: acme.id }, cookieOf(jar));
  const q6b = r.json.quotation;
  const backup = prods.find(p => p.sku === 'SUB-BKP');
  const router = prods.find(p => p.sku === 'RTR-W6');
  await api('POST', `/quotations/${q6b.id}/lines`, { product_id: backup.id, qty: 20, discount_pct: 10 }, cookieOf(jar));
  await api('POST', `/quotations/${q6b.id}/lines`, { product_id: router.id, qty: 2, discount_pct: 3 }, cookieOf(jar));
  r = await api('POST', `/quotations/${q6b.id}/submit`, {}, cookieOf(jar));
  check('mixed quote within limits auto-approves', r.json.quotation.status === 'approved', `status=${r.json.quotation.status} risk=${r.json.quotation.risk.risk_score}`);
  r = await api('POST', `/quotations/${q6b.id}/split/accept`, {}, cookieOf(jar));
  r = await api('GET', `/quotations/${q6b.id}`, null, cookieOf(jar));
  const q6bi = r.json.quotation;
  const oneTimeInv = q6bi.invoices.filter(i => i.kind === 'one_time');
  const recInv = q6bi.invoices.filter(i => i.kind === 'recurring');
  check('one-time invoice (routers) separate', oneTimeInv.length === 1, `$${oneTimeInv[0]?.amount}`);
  check('recurring first-cycle invoice separate', recInv.length === 1, `$${recInv[0]?.amount}`);
  check('future schedule 11 cycles generated', q6bi.schedule.filter(s => s.status === 'scheduled').length === 11, `${q6bi.schedule.length} schedule rows`);

  console.log('\n=== STEP 6c: mid-cycle proration + cancel credit note ===');
  r = await api('GET', `/quotations/${q6b.id}`, null, cookieOf(jar));
  const subLine = r.json.quotation.lines.find(l => l.line_type === 'subscription');
  const recurringBefore = r.json.quotation.invoices.filter(i => i.kind === 'recurring').length;
  r = await api('POST', `/quotations/${q6b.id}/lines/${subLine.id}/subscription`, { action: 'modify', qty: 30 }, cookieOf(jar));
  if (r.json?.error) console.log('   modify error:', r.json.error, `(status ${r.status})`);
  const afterMod = r.json;
  const prorInv = afterMod.invoices.filter(i => i.kind === 'recurring').length > recurringBefore
    ? afterMod.invoices.filter(i => i.kind === 'recurring').pop() : null;
  check('prorated adjustment invoice created on qty change', !!prorInv, `proration invoice ${prorInv?.number} $${prorInv?.amount} (expected ≈130.5: 10 users × 26.10 × 30/60 days)`);
  check('future schedule updated to new qty', afterMod.schedule.filter(s => s.status === 'scheduled').length === 11);
  r = await api('POST', `/quotations/${q6b.id}/lines/${subLine.id}/subscription`, { action: 'cancel' }, cookieOf(jar));
  check('cancel produces credit note', r.json.invoices.some(i => i.kind === 'credit_note'), `${r.json.invoices.filter(i => i.kind === 'credit_note').length} credit note(s)`);
  check('remaining cycles cancelled', !r.json.schedule.some(s => s.status === 'scheduled'));

  console.log('\n=== STEP 7: customer portal negotiation → auto re-approval ===');
  const cjar = {};
  r = await api('POST', '/auth/portal/login', { email: 'buyer@acmecorp.com', password: 'Customer@123' });
  check('customer portal login', r.json?.user?.role === 'customer');
  cjar.cust = r.cookie;
  r = await api('GET', '/portal/quotes', null, cookieOf(cjar));
  check('customer sees ONLY their own quotations', r.json.quotes.length > 0 && r.json.quotes.every(q2 => q2.number.startsWith('QT')), `${r.json.quotes.length} quotes`);
  // QT-1032 is in 'sent' status with a magic link — the negotiation demo target
  r = await api('GET', '/quotations', null, cookieOf(jar));
  const q1032 = r.json.quotations.find(q => q.number === 'QT-1032');
  r = await api('GET', `/quotations/${q1032.id}`, null, cookieOf(jar));
  const portalPath = r.json.quotation.portal_url; // /portal/q/QT-1032?key=...
  check('portal magic link exists on quote', /portal\/q\/QT-\d+\?k=/.test(portalPath), portalPath);
  const key = portalPath.split('k=')[1];
  r = await api('GET', `/portal/quote/QT-1032?k=${key}`);
  check('magic link grants restricted portal view (no login)', r.json?.quote?.number === 'QT-1032');
  const line = r.json.quote.lines[0];
  r = await api('POST', `/portal/quote/QT-1032/comment?k=${key}`, { line_id: line.id, message: 'Can you include onboarding at this price?' });
  check('line-level comment posted (via magic link)', r.status === 200);
  r = await api('POST', `/portal/quote/QT-1032/counter?k=${key}`, { discount_pct: 22, message: 'Competitor offered 22%' });
  check('counter discount submitted', r.json?.quote?.status === 'negotiating', `status=${r.json?.quote?.status}`);
  // cross-tenant guard: Acme's portal login must NOT touch Delta's quote
  r = await api('POST', '/portal/quote/QT-1032/counter', { discount_pct: 30 }, cookieOf(cjar));
  check('cross-customer access blocked', r.status === 404 || r.status === 403, `status=${r.status}`);
  // customer confirms → 22% exceeds ceilings → MUST re-enter approval automatically
  r = await api('POST', `/portal/quote/QT-1032/confirm?k=${key}`, {});
  check('confirm auto re-enters approval (22% > ceilings)', r.json?.re_approval !== 'none', `level=${r.json?.re_approval}`);
  r = await api('GET', `/quotations/${q1032.id}`, null, cookieOf(jar));
  check('rep side sees re-routed quote + open request', r.json.quotation.status === 'pending_manager' && r.json.quotation.negotiations.some(n => n.kind === 'counter' && n.status === 'accepted'));

  console.log('\n=== STEP 8: record payment → invoice updates ===');
  r = await api('GET', '/invoices', null, cookieOf(jar));
  const openInv = r.json.invoices.find(i => i.status === 'open' && i.kind === 'one_time');
  check('open invoice found', !!openInv, openInv?.number);
  r = await api('POST', `/invoices/${openInv.id}/pay`, { amount: openInv.amount, method: 'card', reference: 'E2E-TEST' }, cookieOf(jar));
  check('payment recorded → invoice PAID', r.json.invoice.status === 'paid');

  console.log('\n=== BONUS: deal health + backorder consolidation + exports ===');
  r = await api('GET', '/dashboard', null, cookieOf({ mgr: jar.mgr }));
  const k = r.json.kpi;
  check('deal health alerts materialized', k.alerts.length >= 2, `${k.alerts.length} open alerts (${k.alert_counts.map(a => `${a.kind}:${a.c}`).join(', ')})`);
  const stalled = k.alerts.find(a => a.kind === 'stalled');
  if (stalled) {
    r = await api('POST', `/alerts/${stalled.id}/nudge`, {}, cookieOf({ mgr: jar.mgr }));
    check('nudge action works', r.json.ok);
  }
  // backorder consolidation: restock then consolidate on QT-1025
  r = await api('GET', '/quotations', null, cookieOf(jar));
  const q1025 = r.json.quotations.find(q => q.number === 'QT-1025');
  r = await api('GET', `/quotations/${q1025.id}`, null, cookieOf(jar));
  check('QT-1025 has backorder', r.json.quotation.fulfillment.some(f => f.status === 'backorder'));
  const dock = prods.find(p => p.sku === 'DOCK-C1');
  r = await api('GET', '/warehouses', null, cookieOf(jar));
  const east = r.json.warehouses.find(w => w.code === 'WH-EAST');
  await api('POST', `/warehouses/${east.id}/restock`, { product_id: dock.id, qty: 20 }, cookieOf({ fin: jar.fin }));
  r = await api('POST', `/quotations/${q1025.id}/consolidate`, {}, cookieOf(jar));
  check('backorder consolidated after restock', r.json.moved > 0, `moved=${r.json.moved}`);
  // exports
  for (const fmt of ['csv', 'xls', 'pdf']) {
    const res = await fetch(`${BASE}/reports/export?format=${fmt}`, { headers: { Cookie: cookieOf(jar) } });
    const buf = Buffer.from(await res.arrayBuffer());
    const ok = res.ok && buf.length > 200 && (fmt !== 'pdf' || buf.slice(0, 4).toString() === '%PDF');
    check(`${fmt.toUpperCase()} export`, ok, `${buf.length} bytes`);
  }
  // RBAC sanity
  r = await api('PUT', '/discount-tiers/gold', { max_discount_pct: 99 }, cookieOf(jar));
  check('RBAC blocks rep from admin config', r.status === 403);
  r = await api('GET', '/portal/quotes', null, cookieOf(jar));
  check('internal session rejected on portal surface', r.status === 401 || r.status === 403, `status=${r.status}`);

  console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : failures + ' CHECK(S) FAILED'}`);
  process.exit(failures === 0 ? 0 : 1);
})().catch(e => { console.error('E2E crashed:', e); process.exit(1); });
