/* DealFlow360 — Sales Rep Workspace: pipeline, builder, approvals, fulfillment, billing, negotiation */
'use strict';

const PIPELINE_COLS = [
  { key: 'draft', label: 'Draft' },
  { key: 'pending_manager', label: 'Pending Manager' },
  { key: 'pending_finance', label: 'Pending Finance' },
  { key: 'sent|negotiating', label: 'With Customer' },
  { key: 'approved|confirmed|fulfilling', label: 'Won / Fulfilling' },
  { key: 'fulfilled', label: 'Fulfilled' },
];

function wsShell(active, contentHTML, quote) {
  const u = S.user;
  document.getElementById('app').innerHTML = `
  <div>
    <div class="ws-topbar">
      <div class="brand"><div class="logo-mark" style="width:30px;height:30px;font-size:.85rem;border-radius:9px">D</div>DealFlow360 <span class="small" style="color:#8a92ab;font-weight:500">Workspace</span></div>
      <div class="ws-nav">
        <a href="#/workspace/quotes"><button class="${active === 'quotes' ? 'active' : ''}">📄 Quotations</button></a>
        <a href="#/workspace/pipeline"><button class="${active === 'pipeline' ? 'active' : ''}">🗂️ Pipeline</button></a>
      </div>
      <div class="ws-actions">
        <button class="btn btn-ghost" onclick="render()" style="background:rgba(255,255,255,.1);color:#fff;border-color:transparent">🔄 Reload data</button>
        <a href="#/app/dashboard"><button class="btn btn-ghost" style="background:rgba(255,255,255,.1);color:#fff;border-color:transparent">⚙ Go to Back-end</button></a>
        <a href="#/login"><button class="btn btn-ghost" style="background:rgba(255,255,255,.06);color:#b9bfe0;border-color:transparent">✕ Close workspace</button></a>
        <div class="avatar" title="${esc(u.name)}">${initials(u.name)}</div>
      </div>
    </div>
    <div class="ws-body">${contentHTML}</div>
  </div>`;
}

/* ---------- quotations list ---------- */
route(/^\/workspace\/quotes$/, async () => {
  await boot(); const u = requireUser(); if (!u) return;
  const { quotations } = await api('GET', '/quotations' + (u.role === 'salesrep' ? '?mine=1' : ''));
  const open = quotations.filter(q => !['fulfilled', 'cancelled', 'rejected'].includes(q.status));
  wsShell('quotes', `
    <div class="page-head">
      <div><h1>Quotations</h1><div class="sub">${open.length} active · ${quotations.length} total</div></div>
      <button class="btn btn-primary" id="newQ">+ New quotation</button>
    </div>
    <div class="card" style="padding:0">
      <table class="tbl"><thead><tr><th>Number</th><th>Customer</th><th>Status</th><th class="num">Total</th><th class="num">Margin</th><th class="num">Risk</th><th>Rep</th><th>Updated</th></tr></thead>
      <tbody>${quotations.map(q => `<tr class="clickable" onclick="location.hash='#/workspace/quote/${q.id}'">
        <td><b>${q.number}</b></td>
        <td>${esc(q.customer_name)} <span class="badge b-${q.customer_tier || 'bronze'}" style="margin-left:6px">${q.customer_tier || ''}</span></td>
        <td>${badge(q.status)}</td>
        <td class="num"><b>${fmtMoney(q.total, q.currency)}</b></td>
        <td class="num ${q.margin_pct < 20 ? 'viol' : 'okay'}">${fmtPct(q.margin_pct)}</td>
        <td class="num">${q.risk_score > 0 ? `<span class="viol">⚠ ${q.risk_score}</span>` : '<span class="okay">✓</span>'}</td>
        <td class="small">${esc(q.rep_name)}</td>
        <td class="small muted">${fmtDate(q.last_activity_at)}</td>
      </tr>`).join('')}</tbody></table>
    </div>`);
  document.getElementById('newQ').onclick = async () => {
    const { customers } = await api('GET', '/customers');
    const m = modal('New quotation', `
      <label>Customer</label><select id="nq-c">${customers.map(c => `<option value="${c.id}">${esc(c.name)} — ${c.tier} (${c.currency})</option>`).join('')}</select>
      <label>Expected delivery (optional)</label><input id="nq-d" type="date">`,
      `<button class="btn btn-ghost" data-x2>Cancel</button><button class="btn btn-primary" id="nq-go">Create & start building</button>`);
    m.querySelector('[data-x2]').onclick = () => m.remove();
    m.querySelector('#nq-go').onclick = async () => {
      try {
        const { quotation } = await api('POST', '/quotations', { customer_id: +val('nq-c'), expected_delivery: val('nq-d') || null });
        m.remove(); toast(`${quotation.number} created`, 'success');
        navigate(`/workspace/quote/${quotation.id}`);
      } catch (e) { toast(e.message, 'error'); }
    };
  };
});

/* ---------- pipeline kanban ---------- */
route(/^\/workspace\/pipeline$/, async () => {
  await boot(); const u = requireUser(); if (!u) return;
  const { quotations } = await api('GET', '/quotations' + (u.role === 'salesrep' ? '?mine=1' : ''));
  wsShell('pipeline', `
    <div class="page-head"><div><h1>Deal Pipeline</h1><div class="sub">Drag-free kanban — click a card to open the deal</div></div></div>
    <div class="kanban">
      ${PIPELINE_COLS.map(col => {
        const items = quotations.filter(q => col.key.split('|').includes(q.status));
        const val = items.reduce((a, q) => a + q.total, 0);
        return `<div class="kanban-col">
          <h4><span>${col.label}</span><span>${items.length} · ${fmtMoney(val)}</span></h4>
          ${items.map(q => `<div class="k-card" onclick="location.hash='#/workspace/quote/${q.id}'">
            <div class="k-top"><span class="k-cust">${esc(q.customer_name)}</span>${badge(q.status)}</div>
            <div class="row-between"><span class="k-amt">${fmtMoney(q.total, q.currency)}</span><span class="small muted">${q.number}</span></div>
            <div class="k-meta">
              <span class="badge b-${q.customer_tier || 'bronze'}">${q.customer_tier || ''}</span>
              ${q.risk_score > 0 ? `<span class="badge b-rejected">risk ${q.risk_score}</span>` : ''}
              <span class="small muted" style="margin-left:auto">${esc(q.rep_name?.split(' ')[0])}</span>
            </div>
          </div>`).join('') || '<p class="small muted" style="text-align:center;padding:12px 0">—</p>'}
        </div>`;
      }).join('')}
    </div>`);
});

/* ---------- quotation detail (tabbed) ---------- */
route(/^\/workspace\/quote\/(\d+)$/, async (m) => {
  await boot(); const u = requireUser(); if (!u) return;
  const id = m[0];
  let data;
  try { data = await api('GET', `/quotations/${id}`); } catch (e) { toast(e.message, 'error'); return navigate('/workspace/quotes'); }
  renderQuote(data.quotation, u, 'builder');
});

async function refreshQuote(id, tab = 'builder') {
  const data = await api('GET', `/quotations/${id}`);
  renderQuote(data.quotation, S.user, tab);
}

function renderQuote(q, u, tab) {
  const editable = ['draft', 'returned', 'negotiating', 'sent'].includes(q.status);
  const tabs = [
    ['builder', '🧺 Builder', q.lines.length ? `<span class="tab-count">${q.lines.length}</span>` : ''],
    ['approvals', '🛡️ Approval', q.approvals.length ? `<span class="tab-count">${q.approvals.filter(a => a.status === 'pending').length ? '!' : '✓'}</span>` : ''],
    ['fulfillment', '🏭 Fulfillment', q.fulfillment.length ? `<span class="tab-count">${q.fulfillment.filter(f => f.status !== 'shipped').length || '✓'}</span>` : ''],
    ['billing', '💳 Billing', q.invoices.length ? `<span class="tab-count">${q.invoices.filter(i => i.status === 'open').length || '✓'}</span>` : ''],
    ['customer', '🗣️ Customer', q.negotiations.filter(n => n.status === 'open').length ? `<span class="tab-count">${q.negotiations.filter(n => n.status === 'open').length}</span>` : ''],
    ['audit', '📜 Audit', ''],
  ];
  const head = `
    <div class="page-head">
      <div>
        <div class="row">
          <h1>${q.number}</h1>${badge(q.status)}
          ${q.risk.risk_score > 0 ? `<span class="badge b-rejected">risk ${q.risk.risk_score}</span>` : '<span class="badge b-approved">within ceilings</span>'}
        </div>
        <div class="sub">${esc(q.customer_name)} · <span class="badge b-${q.customer_tier}">${q.customer_tier}</span> · rep ${esc(q.rep_name)} · ${q.currency} · valid until ${fmtDate(q.valid_until)}</div>
      </div>
      <div class="row">
        ${editable && q.status !== 'sent' ? `<button class="btn btn-primary" id="submitQ">✅ Submit for processing</button>` : ''}
        ${['approved', 'confirmed', 'fulfilling', 'fulfilled'].includes(q.status) ? `<button class="btn btn-soft" id="sendQ">🔗 ${q.sent_at ? 'Resend' : 'Send'} to customer</button>` : ''}
      </div>
    </div>`;

  const bodies = {
    builder: builderTab, approvals: approvalsTab, fulfillment: fulfillmentTab,
    billing: billingTab, customer: customerTab, audit: auditTab,
  };
  wsShell('quotes', head + `
    <div class="tabs">${tabs.map(([k, label, cnt]) => `<button class="${tab === k ? 'active' : ''}" onclick="refreshQuote(${q.id},'${k}')">${label}${cnt}</button>`).join('')}</div>
    <div id="tabbody">${bodies[tab](q, u, editable)}</div>`);

  wireQuoteActions(q, u, editable);
  window.refreshQuote = refreshQuote;
}

/* ============ BUILDER TAB ============ */
function builderTab(q, u, editable) {
  const marginColor = q.margin_pct >= 25 ? 'var(--success)' : q.margin_pct >= 15 ? 'var(--warn)' : 'var(--danger)';
  return `
  <div class="builder">
    <div class="card">
      <h3>📦 Add products</h3>
      <div class="catalog-tabs mt8" id="cat-tabs"></div>
      <input id="prod-search" class="search-in" style="width:100%;margin-bottom:10px" placeholder="🔍 Search catalog…">
      <div id="prod-list" style="max-height:520px;overflow:auto"></div>
    </div>

    <div class="card">
      <div class="row-between">
        <h3>🧺 Order lines</h3>
        ${editable ? `<div class="row"><span class="small muted">Order discount %</span>
          <input class="disc-in" id="ord-disc" type="number" min="0" max="90" value="${q.order_discount_pct}" ${editable ? '' : 'disabled'}>
          <button class="btn btn-soft btn-sm" id="apply-ord" ${editable ? '' : 'disabled'}>Apply</button></div>` : ''}
      </div>
      <div id="cart">
        ${q.lines.map(l => `
        <div class="cart-line">
          <div class="row-between">
            <div>
              <b>${esc(l.description)}</b> ${l.line_type === 'subscription' ? '<span class="badge b-sent">recurring</span>' : ''}
              <div class="small muted">${fmtMoney(l.unit_price, q.currency)} × ${l.qty} · allowed ≤${l.allowed_discount}% · margin ${l.margin_pct}%</div>
            </div>
            <div style="text-align:right">
              <div class="row" style="justify-content:flex-end">
                ${editable ? `<div class="qty-ctrl"><button onclick="setQty(${l.id},${l.qty - 1})" ${editable ? '' : 'disabled'}>−</button><span>${l.qty}</span><button onclick="setQty(${l.id},${l.qty + 1})" ${editable ? '' : 'disabled'}>+</button></div>` : `<b>×${l.qty}</b>`}
                ${editable ? `<input class="disc-in" id="disc-${l.id}" type="number" min="0" max="90" value="${l.discount_pct}" title="line discount %">
                <button class="btn btn-soft btn-sm" onclick="setDisc(${l.id})">%</button>
                <button class="btn btn-danger btn-sm" onclick="delLine(${l.id})">✕</button>` : `<span class="small muted">${l.discount_pct}%</span>`}
              </div>
              <div class="small" style="margin-top:4px">${l.violation > 0 ? `<span class="viol">⚠ ${l.effective_discount}% given · ${l.violation} pts over ceiling</span>` : `<span class="okay">${l.effective_discount}% within limit</span>`}
                · <b>${fmtMoney(l.net, q.currency)}</b></div>
            </div>
          </div>
        </div>`).join('') || emptyState('🛒', 'Add products from the catalog')}
      </div>
      <div class="totals">
        <div class="t-row"><span class="muted">Subtotal</span><span>${fmtMoney(q.subtotal, q.currency)}</span></div>
        <div class="t-row"><span class="muted">Discounts ${q.order_discount_pct ? `(incl. ${q.order_discount_pct}% order-level)` : ''}</span><span style="color:var(--danger)">− ${fmtMoney(q.discount_total, q.currency)}</span></div>
        <div class="t-row"><span class="muted">Tax</span><span>${fmtMoney(q.tax_total, q.currency)}</span></div>
        <div class="t-row grand"><span>Total</span><span>${fmtMoney(q.total, q.currency)}</span></div>
        <div class="mt8">
          <div class="row-between small"><span class="muted">Live order margin</span><b style="color:${marginColor}">${fmtPct(q.margin_pct)}</b></div>
          <div class="margin-bar"><div style="width:${Math.max(2, Math.min(100, q.margin_pct))}%"></div></div>
        </div>
      </div>
    </div>

    <div>
      <div class="card">
        <h3>✨ Upsell & cross-sell</h3>
        <p class="small muted mt8">Ranked by co-purchase history + active promotions. Margin-healthy only.</p>
        <div class="mt16" id="sug-list"></div>
      </div>
      ${q.risk.risk_score > 0 ? `
      <div class="card mt16" style="border-left:4px solid var(--danger)">
        <h3>⚠ Blended risk ${q.risk.risk_score}</h3>
        <p class="small muted mt8">${q.risk.line_breakdown.filter(l => l.violation > 0).map(l =>
          `${esc(l.product)}: ${l.discount_given}% vs ≤${l.allowed}% (+${l.violation})`).join('<br>')}</p>
        <p class="small muted mt8">Submitting will route to <b>${q.approval_level === 'finance' ? 'Manager → Finance' : 'Sales Manager'}</b> automatically.</p>
      </div>` : ''}
    </div>
  </div>`;
}

async function loadCatalog(q, catFilter) {
  const [{ products, variants, plans }, { categories }] = await Promise.all([api('GET', '/products'), api('GET', '/categories')]);
  const catTabs = document.getElementById('cat-tabs');
  const list = document.getElementById('prod-list');
  if (!catTabs || !list) return;
  catTabs.innerHTML = `<button class="${!catFilter ? 'active' : ''}" onclick="window._cat=null;loadCatalog(S.cache.q,null)">All</button>` +
    categories.map(c => `<button class="${catFilter === c.id ? 'active' : ''}" onclick="window._cat=${c.id};loadCatalog(S.cache.q,${c.id})">${esc(c.name)}</button>`).join('');
  const term = (document.getElementById('prod-search')?.value || '').toLowerCase();
  const items = products.filter(p => p.active && (!catFilter || p.category_id === catFilter) && (!term || p.name.toLowerCase().includes(term) || p.sku.toLowerCase().includes(term)));
  list.innerHTML = items.map(p => {
    const vs = variants.filter(v => v.product_id === p.id);
    const plan = plans.find(pp => pp.product_id === p.id);
    const priceLabel = p.product_type === 'subscription' && plan ? `${fmtMoney(plan.recurring_price)}/${plan.billing_period.slice(0, 2)}` : fmtMoney(p.base_price);
    return `<div class="prod-item" ${q && ['draft', 'returned', 'negotiating', 'sent'].includes(q.status) ? `onclick="addProduct(${p.id})"` : 'style="opacity:.6"'}>
      <div><div class="p-name">${esc(p.name)} ${p.promoted ? '<span class="badge b-promoted">promo</span>' : ''}</div>
      <div class="p-meta">${p.category_name} · ${priceLabel} · ${p.product_type === 'subscription' ? 'recurring' : 'one-time'}</div>
      ${vs.length ? `<div class="p-meta" style="margin-top:3px">${vs.map(v => `<button class="ship-tag" onclick="event.stopPropagation();addProduct(${p.id},${v.id})">+ ${esc(v.value)} (+${fmtMoney(v.extra_price)})</button>`).join('')}</div>` : ''}
      </div>
      <button class="btn btn-soft btn-sm">Add</button>
    </div>`;
  }).join('') || emptyState('🔍', 'Nothing matches');
  const search = document.getElementById('prod-search');
  if (search && !search._wired) {
    search._wired = true;
    search.oninput = () => loadCatalog(S.cache.q, window._cat || null);
  }
}
window.loadCatalog = loadCatalog;
window.addProduct = async (pid, vid) => {
  try {
    const { quotation } = await api('POST', `/quotations/${S.cache.q.id}/lines`, { product_id: pid, variant_id: vid || null, qty: 1 });
    S.cache.q = quotation; await refreshQuote(quotation.id, 'builder');
    toast('Line added', 'success');
  } catch (e) { toast(e.message, 'error'); }
};
window.setQty = async (lid, qty) => {
  if (qty < 1) return;
  try { const { quotation } = await api('PUT', `/quotations/${S.cache.q.id}/lines/${lid}`, { qty }); S.cache.q = quotation; await refreshQuote(quotation.id, 'builder'); } catch (e) { toast(e.message, 'error'); }
};
window.setDisc = async (lid) => {
  try { const { quotation } = await api('PUT', `/quotations/${S.cache.q.id}/lines/${lid}`, { discount_pct: +val('disc-' + lid) }); S.cache.q = quotation; await refreshQuote(quotation.id, 'builder'); } catch (e) { toast(e.message, 'error'); }
};
window.delLine = async (lid) => {
  try { const { quotation } = await api('DELETE', `/quotations/${S.cache.q.id}/lines/${lid}`); S.cache.q = quotation; await refreshQuote(quotation.id, 'builder'); } catch (e) { toast(e.message, 'error'); }
};
async function loadSuggestions(q) {
  const el = document.getElementById('sug-list');
  if (!el) return;
  const { suggestions } = await api('GET', `/quotations/${q.id}/upsell`);
  el.innerHTML = suggestions.map(s => `
    <div class="sug-card">
      <div class="s-name"><span>${esc(s.name)}</span><span class="score-pill">${Math.round(s.score * 100)}</span></div>
      <div class="s-meta">
        <span>${esc(s.category)} · ${fmtMoney(s.price)} · ${s.product_type === 'subscription' ? 'recurring' : 'one-time'}</span>
        <span>➕ margin delta <b style="color:var(--success)">${fmtMoney(s.margin_delta)}</b> (line margin ${s.margin_pct}%)${s.promoted ? ' · <b style="color:#a21caf">PROMOTED</b>' : ''}</span>
      </div>
      <div class="row">
        <button class="btn btn-primary btn-sm" onclick="addSug(${s.product_id})">Add to quote</button>
        <button class="btn btn-ghost btn-sm" onclick="this.closest('.sug-card').style.opacity=.35">Dismiss</button>
      </div>
    </div>`).join('') || emptyState('✨', 'Add products to see suggestions');
}
window.addSug = async (pid) => {
  try {
    const r = await api('POST', `/quotations/${S.cache.q.id}/upsell/${pid}/add`);
    S.cache.q = r.quotation; await refreshQuote(r.quotation.id, 'builder');
    toast('Suggestion added — total & margin updated', 'success');
  } catch (e) { toast(e.message, 'error'); }
};

/* ============ APPROVALS TAB ============ */
function approvalsTab(q, u) {
  const risk = q.risk;
  const riskClass = risk.risk_score === 0 ? 'risk-low' : risk.risk_score <= 5 ? 'risk-med' : 'risk-high';
  const canManagerAct = ['manager', 'admin'].includes(u.role) && q.status === 'pending_manager';
  const canFinanceAct = ['finance', 'admin'].includes(u.role) && q.status === 'pending_finance';
  return `
  <div class="grid" style="grid-template-columns:1.2fr 1fr;align-items:start">
    <div>
      <div class="risk-hero" style="background:linear-gradient(135deg,#f8f9fd,#eef0fe)">
        <div class="risk-dial ${riskClass}">${risk.risk_score}</div>
        <div>
          <h3>Blended discount risk score</h3>
          <p class="small muted mt8">Worst line violation <b>${risk.max_violation}</b> pts · total overage <b>${risk.total_overage}</b> pts across ${risk.line_breakdown.filter(l => l.violation > 0).length || 0} line(s)</p>
          <p class="small muted">Routing: ${q.approval_level === 'none' ? 'no approval required' : q.approval_level === 'finance' ? '<b>Manager → Finance</b>' : '<b>Sales Manager</b>'}</p>
        </div>
      </div>
      <div class="card">
        <h3>Line-by-line compliance</h3>
        <p class="small muted mt8">Green bar = discount given · ▎mark = allowed ceiling (tier ∩ category)</p>
        <div class="mt16">
        ${q.lines.map(l => `
          <div>
            <div class="row-between small"><span><b>${esc(l.description)}</b> <span class="muted">(${esc(l.category)} ≤${l.allowed_discount}%)</span></span>
              <span>${l.effective_discount}% ${l.violation > 0 ? `<span class="viol">+${l.violation} over</span>` : '<span class="okay">✓</span>'}</span></div>
            ${discBar(l.effective_discount, l.allowed_discount)}
          </div>`).join('') || '<p class="small muted">No lines.</p>'}
        </div>
      </div>
    </div>
    <div class="card">
      <h3>Approval steps</h3>
      <div class="steps mt16">
        ${(q.approvals.length ? q.approvals : [{ level: 'manager', status: 'skipped', sequence: 1 }]).map(a => `
        <div class="step">
          <div class="rail"><div class="dot ${a.status}">${a.status === 'approved' ? '✓' : a.status === 'rejected' ? '✕' : a.status === 'returned' ? '↩' : a.sequence}</div><div class="cord"></div></div>
          <div class="st-body">
            <div class="st-title">${a.level === 'manager' ? '🧭 Sales Manager' : '💰 Finance'}</div>
            <div class="small muted">${statusLabel(a.status)}${a.approver_name ? ` by ${esc(a.approver_name)}` : ''}${a.decided_at ? ` · ${fmtDate(a.decided_at)}` : ''}</div>
            ${a.reason ? `<div class="small mt8" style="background:#f8f9fd;border-radius:9px;padding:8px 11px">"${esc(a.reason)}"</div>` : ''}
          </div>
        </div>`).join('')}
      </div>
      ${canManagerAct || canFinanceAct ? `
        <div class="mt16" style="border-top:1px solid var(--line);padding-top:14px">
          <b class="small">You are the required approver for this step</b>
          <div class="row mt8">
            <button class="btn btn-success" onclick="actApprove('approve')">✓ Approve</button>
            <button class="btn btn-warn" onclick="actApprove('return')">↩ Return for revision</button>
            <button class="btn btn-danger" onclick="actApprove('reject')">✕ Reject</button>
          </div>
        </div>` : ''}
      ${q.status === 'draft' || q.status === 'returned' ? `<div class="copy-link mt16">Submit the quote from the Builder tab — routing happens automatically, no manual request needed.</div>` : ''}
    </div>
  </div>`;
}
window.actApprove = async (action) => {
  const m = modal(`${action === 'approve' ? 'Approve' : action === 'reject' ? 'Reject' : 'Return'} ${S.cache.q.number}`,
    `<label>Reason (logged in the audit trail)</label><textarea id="ap-r" rows="3" placeholder="${action === 'approve' ? 'e.g. Margin acceptable for this bundle' : 'e.g. Reduce service discount to ≤10%'}"></textarea>`,
    `<button class="btn btn-ghost" data-x2>Cancel</button><button class="btn btn-primary" id="ap-go">Confirm</button>`);
  m.querySelector('[data-x2]').onclick = () => m.remove();
  m.querySelector('#ap-go').onclick = async () => {
    try {
      const { quotation } = await api('POST', `/quotations/${S.cache.q.id}/approve`, { action, reason: val('ap-r') });
      m.remove();
      toast(action === 'approve' ? 'Approved ✓' : action === 'reject' ? 'Rejected' : 'Returned to rep', 'success');
      await refreshQuote(quotation.id, 'approvals');
    } catch (e) { toast(e.message, 'error'); m.remove(); }
  };
};

/* ============ FULFILLMENT TAB ============ */
function fulfillmentTab(q, u, editable) {
  const canPlan = ['approved'].includes(q.status);
  const hasPlan = q.fulfillment.length > 0;
  return `
  <div class="grid" style="grid-template-columns:1fr 1fr;align-items:start">
    <div class="card">
      <h3>🏭 Warehouse fulfillment</h3>
      ${canPlan ? `<p class="small muted mt8">Live stock suggestion — minimizes shipment count, then cost.</p>
        <button class="btn btn-primary mt16" id="plan-split">⚡ Suggest split</button>
        <div id="split-sug" class="mt16"></div>` : ''}
      ${hasPlan ? `
        <h4 class="mt16">Allocations</h4>
        <table class="tbl mt8"><thead><tr><th>Line</th><th>Warehouse</th><th class="num">Qty</th><th>Status</th><th></th></tr></thead>
        <tbody>${q.fulfillment.map(f => `<tr>
          <td class="small">${esc(f.description)}</td><td>${esc(f.warehouse_name)}</td><td class="num"><b>${f.qty}</b></td>
          <td><span class="ship-tag ${f.status}">${f.status}</span></td>
          <td>${f.status === 'planned' ? `<button class="btn btn-success btn-sm" onclick="ship(${f.id})">🚚 Ship</button>` : f.shipped_at ? `<span class="small muted">${fmtDate(f.shipped_at)}</span>` : ''}</td>
        </tr>`).join('')}</tbody></table>
        ${q.fulfillment.some(f => f.status === 'backorder') ? `
          <div class="copy-link mt16">⏳ Backorder waiting for stock. When new inventory arrives (Back-end → Warehouses → 📥 Restock), a <b>Consolidate Remaining Backorder</b> prompt appears here automatically.</div>
          ${q.can_consolidate ? `<button class="btn btn-warn mt8" onclick="consolidate()">📦 Consolidate remaining backorder (stock available!)</button>` : ''}` : ''}
      ` : !canPlan ? emptyState('🏭', ['draft','pending_manager','pending_finance','returned','sent','negotiating'].includes(q.status)
          ? 'Fulfillment planning unlocks once the order is approved.' : 'No fulfillment plan yet.') : ''}
    </div>
    <div class="card">
      <h3>Expected delivery</h3>
      <p class="k-value mt8" style="font-size:1.3rem">${fmtDate(q.expected_delivery) || '—'}</p>
      <p class="small muted mt8">Set when the quotation was created. Slipping past this date with unshipped lines raises a 🚚 slippage alert on the Deal Health dashboard.</p>
      <h4 class="mt24">Status</h4>
      <div class="mt8">${badge(q.status)}</div>
      ${q.status === 'fulfilled' ? '<p class="okay small mt8">✓ All shipments delivered — order fulfilled.</p>' : ''}
    </div>
  </div>`;
}
window.ship = async (fid) => {
  try { const r = await api('POST', `/quotations/${S.cache.q.id}/ship`, { split_id: fid }); toast('Shipped 🚚 (stock decremented)', 'success'); await refreshQuote(r.quotation.id, 'fulfillment'); } catch (e) { toast(e.message, 'error'); }
};
window.consolidate = async () => {
  try { const r = await api('POST', `/quotations/${S.cache.q.id}/consolidate`); toast(`Backorder consolidated: ${r.moved} unit(s) → planned shipments`, 'success'); await refreshQuote(r.quotation.id, 'fulfillment'); } catch (e) { toast(e.message, 'error'); }
};

/* ============ BILLING TAB ============ */
function billingTab(q, u) {
  const oneTime = q.lines.filter(l => l.line_type === 'one_time');
  const subs = q.lines.filter(l => l.line_type === 'subscription');
  const payBtn = (inv) => inv.status === 'open' ? `<button class="btn btn-success btn-sm" onclick="payInv(${inv.id},${inv.amount},'${q.id}')">💳 Pay</button>` : badge(inv.status);
  return `
  <div class="grid" style="grid-template-columns:1fr 1fr;align-items:start">
    <div class="card">
      <h3>🧾 Hybrid billing</h3>
      <div class="mt16">
        <b class="small">ONE-TIME LINES</b>
        <table class="tbl mt8"><thead><tr><th>Line</th><th class="num">Qty</th><th class="num">Net</th></tr></thead>
        <tbody>${oneTime.map(l => `<tr><td class="small">${esc(l.description)}</td><td class="num">${l.qty}</td><td class="num">${fmtMoney(l.net, q.currency)}</td></tr>`).join('') || `<tr><td colspan="3" class="small muted">—</td></tr>`}</tbody></table>
        <b class="small" style="display:block;margin-top:16px">RECURRING SUBSCRIPTION LINES</b>
        <table class="tbl mt8"><thead><tr><th>Line</th><th class="num">Qty</th><th class="num">Per cycle</th><th>Controls</th></tr></thead>
        <tbody>${subs.map(l => {
          const activeCycles = q.schedule.filter(s => s.line_id === l.id && s.status === 'scheduled').length;
          return `<tr>
          <td class="small"><b>${esc(l.description)}</b><div class="muted">${activeCycles} upcoming cycle(s)</div></td>
          <td class="num">${l.qty}</td><td class="num">${fmtMoney(l.net, q.currency)}</td>
          <td class="row">
            ${activeCycles > 0 ? `
            <button class="btn btn-ghost btn-sm" onclick="modSub(${l.id}, ${l.qty})">± Qty (prorated)</button>
            <button class="btn btn-danger btn-sm" onclick="cancelSub(${l.id})">Cancel</button>` : '<span class="small muted">cancelled</span>'}
          </td></tr>`;
        }).join('') || `<tr><td colspan="4" class="small muted">No subscription lines on this order</td></tr>`}</tbody></table>
      </div>
    </div>
    <div>
      <div class="card">
        <div class="row-between"><h3>Billing schedule</h3>
          <button class="btn btn-soft btn-sm" onclick="genDue()">⚡ Generate due invoices</button></div>
        <table class="tbl mt8"><thead><tr><th>Date</th><th>Description</th><th class="num">Amount</th><th>Status</th></tr></thead>
        <tbody>${q.schedule.map(s => `<tr>
          <td class="small">${fmtDate(s.scheduled_date)}</td><td class="small">${esc(s.description || '')}</td>
          <td class="num">${fmtMoney(s.amount, q.currency)}</td>
          <td><span class="ship-tag ${s.status === 'invoiced' ? 'shipped' : s.status === 'cancelled' ? 'backorder' : 'planned'}">${s.status}</span></td>
        </tr>`).join('') || `<tr><td colspan="4" class="small muted">Schedule appears on order confirmation</td></tr>`}</tbody></table>
      </div>
      <div class="card mt16">
        <h3>Invoices</h3>
        <table class="tbl mt8"><thead><tr><th>Invoice</th><th>Type</th><th class="num">Amount</th><th>Status</th><th></th></tr></thead>
        <tbody>${q.invoices.map(i => `<tr>
          <td><b>${i.number}</b></td>
          <td><span class="badge ${i.kind === 'credit_note' ? 'b-returned' : i.kind === 'recurring' ? 'b-sent' : 'b-draft'}">${i.kind.replace('_', '-')}</span></td>
          <td class="num">${fmtMoney(i.amount, q.currency)}</td><td>${badge(i.status)}</td><td>${payBtn(i)}</td>
        </tr>`).join('') || `<tr><td colspan="5" class="small muted">—</td></tr>`}</tbody></table>
      </div>
    </div>
  </div>`;
}
window.payInv = (id, amount, qid) => {
  const m = modal('Record payment', `
    <label>Amount</label><input id="pi-amt" type="number" step="0.01" value="${amount}">
    <div class="row"><div style="flex:1"><label>Method</label><select id="pi-m"><option>bank_transfer</option><option>card</option><option>cash</option><option>upi</option></select></div>
    <div style="flex:1"><label>Reference</label><input id="pi-ref" placeholder="TXN-..."></div></div>`,
    `<button class="btn btn-ghost" data-x2>Cancel</button><button class="btn btn-success" id="pi-go">💳 Record payment</button>`);
  m.querySelector('[data-x2]').onclick = () => m.remove();
  m.querySelector('#pi-go').onclick = async () => {
    try {
      const r = await api('POST', `/invoices/${id}/pay`, { amount: +val('pi-amt'), method: val('pi-m'), reference: val('pi-ref') });
      m.remove(); toast(r.invoice.status === 'paid' ? 'Invoice PAID ✅' : 'Partial payment recorded', 'success');
      await refreshQuote(+qid, 'billing');
    } catch (e) { toast(e.message, 'error'); }
  };
};
window.modSub = (lid, curQty) => {
  const m = modal('Change subscription quantity', `
    <p class="small muted">Current: <b>${curQty}</b>. Mid-cycle changes are <b>daily-prorated</b>: a charge or credit note is issued for the remainder of the current cycle, and future cycles are re-rated.</p>
    <label>New quantity</label><input id="ms-q" type="number" min="1" value="${curQty}">`,
    `<button class="btn btn-ghost" data-x2>Cancel</button><button class="btn btn-primary" id="ms-go">Apply (prorated)</button>`);
  m.querySelector('[data-x2]').onclick = () => m.remove();
  m.querySelector('#ms-go').onclick = async () => {
    try { await api('POST', `/quotations/${S.cache.q.id}/lines/${lid}/subscription`, { action: 'modify', qty: +val('ms-q') }); m.remove(); toast('Quantity changed — prorated adjustment issued', 'success'); await refreshQuote(S.cache.q.id, 'billing'); } catch (e) { toast(e.message, 'error'); }
  };
};
window.cancelSub = (lid) => {
  const m = modal('Cancel subscription', `
    <p class="small muted">Remaining scheduled cycles are cancelled and a <b>credit note</b> is issued per the plan's cancellation policy (prorated refund or % refund).</p>
    <label>Reason</label><input id="cs-r" placeholder="Customer request">`,
    `<button class="btn btn-ghost" data-x2>Keep subscription</button><button class="btn btn-danger" id="cs-go">Cancel subscription</button>`);
  m.querySelector('[data-x2]').onclick = () => m.remove();
  m.querySelector('#cs-go').onclick = async () => {
    try { await api('POST', `/quotations/${S.cache.q.id}/lines/${lid}/subscription`, { action: 'cancel' }); m.remove(); toast('Subscription cancelled — credit note issued', 'success'); await refreshQuote(S.cache.q.id, 'billing'); } catch (e) { toast(e.message, 'error'); }
  };
};
window.genDue = async () => {
  try { const r = await api('POST', `/quotations/${S.cache.q.id}/billing/generate`); toast(r.created ? `${r.created} due cycle(s) invoiced` : 'Nothing due yet', 'success'); await refreshQuote(S.cache.q.id, 'billing'); } catch (e) { toast(e.message, 'error'); }
};

/* ============ CUSTOMER TAB (portal + negotiation) ============ */
function customerTab(q) {
  const base = location.origin + '/#';
  const link = base + q.portal_url;
  return `
  <div class="grid" style="grid-template-columns:1fr 1.2fr;align-items:start">
    <div class="card">
      <h3>🔗 Customer portal link</h3>
      <p class="small muted mt8">Customer views & negotiates the live quotation here — no login needed (magic link), or they can sign in at the portal.</p>
      <div class="copy-link mt16"><span style="flex:1;user-select:all">${esc(link)}</span></div>
      <div class="row mt8">
        <button class="btn btn-primary btn-sm" onclick="navigator.clipboard.writeText('${esc(link)}').then(()=>toast('Link copied ✂️','success'))">Copy link</button>
        <a class="btn btn-ghost btn-sm" href="${esc(q.portal_url)}" target="_blank">Open portal view ↗</a>
        ${['approved', 'confirmed', 'fulfilling', 'fulfilled'].includes(q.status) ? '<span class="small muted" style="align-self:center">sent ' + (q.sent_at ? fmtDate(q.sent_at) : '—') + '</span>' : ''}
      </div>
    </div>
    <div class="card">
      <h3>🗣️ Negotiation thread</h3>
      ${q.negotiations.length ? q.negotiations.map(n => `
        <div class="thread-item">
          <div class="avatar" style="width:30px;height:30px;font-size:.7rem">${n.user_id ? 'SR' : 'C'}</div>
          <div style="flex:1">
            <div class="row-between">
              <b class="small">${n.user_id ? 'Sales side' : 'Customer'} · ${n.kind === 'counter' ? 'counter proposal' : n.kind === 'change_request' ? 'change request' : 'comment'}</b>
              <span class="small muted">${fmtDate(n.created_at)}</span>
            </div>
            ${n.line_label ? `<div class="small muted">on: ${esc(n.line_label)}</div>` : ''}
            <div class="small mt8">${esc(n.message || '')}</div>
            ${n.kind === 'counter' && n.proposed_discount != null ? `<div class="mt8"><span class="badge b-negotiating">proposed ${n.proposed_discount}% discount</span></div>` : ''}
            <div class="row mt8">
              ${n.status === 'open' && n.kind === 'counter' ? `
                <button class="btn btn-success btn-sm" onclick="resolveNeg(${n.id},'accept')">✓ Accept counter</button>
                <button class="btn btn-ghost btn-sm" onclick="resolveNeg(${n.id},'decline')">Decline</button>` : ''}
              <span class="badge ${n.status === 'open' ? 'b-open' : n.status === 'accepted' ? 'b-approved' : 'b-cancelled'}">${n.status}</span>
            </div>
            ${n.status === 'accepted' && n.kind === 'counter' && n.proposed_discount != null ? '<div class="small muted mt8">Accepting applies the discount to all lines and re-routes automatically if ceilings break.</div>' : ''}
          </div>
        </div>`).join('') : emptyState('💬', 'No customer messages yet. Send the portal link to start negotiating.')}
    </div>
  </div>`;
}
window.resolveNeg = async (nid, action) => {
  try {
    const { quotation } = await api('POST', `/quotations/${S.cache.q.id}/negotiation/${nid}`, { action });
    toast(action === 'accept' ? 'Counter accepted' + (quotation.status.startsWith('pending') ? ' — quote re-routed for approval automatically' : '') : 'Declined', 'success');
    await refreshQuote(quotation.id, 'customer');
  } catch (e) { toast(e.message, 'error'); }
};

/* ============ AUDIT TAB ============ */
function auditTab(q) {
  return `<div class="card" style="max-width:860px">
    <h3>📜 Full audit trail</h3>
    <p class="small muted mt8">Every action on this quotation — user, timestamp, reason.</p>
    <div class="steps mt16">${q.audit.map(a => `
      <div class="step">
        <div class="rail"><div class="dot ${a.action.includes('reject') ? 'rejected' : a.action.includes('approve') && !a.action.includes('re_enter') ? 'approved' : a.action.includes('re_enter') ? 'returned' : 'waiting'}">•</div><div class="cord"></div></div>
        <div class="st-body">
          <div class="st-title" style="font-size:.9rem">${esc(a.action.replace(/_/g, ' '))}</div>
          <div class="small muted">${esc(a.user_name || 'system')} · ${new Date(a.created_at + (a.created_at.includes('T') ? '' : 'T00:00')).toLocaleString()}</div>
          ${a.details ? `<div class="small mt8" style="background:#f8f9fd;border-radius:9px;padding:7px 11px">${esc(a.details)}</div>` : ''}
        </div>
      </div>`).join('') || emptyState('📜', 'No entries yet')}
    </div>
  </div>`;
}

/* ---------- quote-level action wiring ---------- */
function wireQuoteActions(q, u, editable) {
  S.cache.q = q;
  loadCatalog(q, window._cat || null);
  loadSuggestions(q);
  const sub = document.getElementById('submitQ');
  if (sub) sub.onclick = async () => {
    try {
      const { quotation } = await api('POST', `/quotations/${q.id}/submit`);
      toast(quotation.status === 'approved'
        ? 'Within ceilings — auto-approved, ready for fulfillment ⚡'
        : `Routed for approval automatically: ${quotation.approval_level === 'finance' ? 'Manager → Finance' : 'Manager'} 🛡️`, 'success');
      await refreshQuote(q.id, 'approvals');
    } catch (e) { toast(e.message, 'error'); }
  };
  const send = document.getElementById('sendQ');
  if (send) send.onclick = async () => {
    try {
      const { quotation } = await api('POST', `/quotations/${q.id}/send`);
      await navigator.clipboard?.writeText(quotation.portal_link).catch(() => {});
      toast('Portal link issued & copied — customer can negotiate now 🔗', 'success');
      await refreshQuote(q.id, 'customer');
    } catch (e) { toast(e.message, 'error'); }
  };
  const ordBtn = document.getElementById('apply-ord');
  if (ordBtn) ordBtn.onclick = async () => {
    try { const { quotation } = await api('PUT', `/quotations/${q.id}/order-discount`, { order_discount_pct: +val('ord-disc') }); toast('Order discount applied', 'success'); await refreshQuote(q.id, 'builder'); } catch (e) { toast(e.message, 'error'); }
  };
  const planBtn = document.getElementById('plan-split');
  if (planBtn) planBtn.onclick = async () => {
    try {
      const { suggestion } = await api('GET', `/quotations/${q.id}/split-suggestion`);
      const el = document.getElementById('split-sug');
      el.innerHTML = `
        <h4>Suggested split — ${suggestion.shipment_count} shipment(s), est. ${fmtMoney(suggestion.est_cost)}</h4>
        <table class="tbl mt8"><thead><tr><th>Warehouse</th><th class="num">Fulfilled</th><th class="num">Backorder</th></tr></thead>
        <tbody>${suggestion.per_warehouse.map(w => `<tr><td>${esc(w.warehouse)}</td><td class="num okay">${w.qty || '—'}</td><td class="num ${w.backorder ? 'viol' : 'muted'}">${w.backorder || '—'}</td></tr>`).join('')}</tbody></table>
        <div class="row mt8">
          <button class="btn btn-primary btn-sm" onclick="acceptSplit()">✓ Accept suggested split</button>
          <button class="btn btn-ghost btn-sm" onclick="manualSplit()">✎ Manual override</button>
        </div>
        <details class="mt8 small muted"><summary>Per-line detail</summary>
          ${suggestion.lines.map(l => `<div class="small">• ${esc(l.product)}: ${l.qty} from ${esc(l.warehouse)} ${l.status === 'backorder' ? '(backorder)' : ''}</div>`).join('')}
        </details>`;
    } catch (e) { toast(e.message, 'error'); }
  };
}
window.acceptSplit = async () => {
  try {
    const r = await api('POST', `/quotations/${S.cache.q.id}/split/accept`);
    toast('Split accepted — order confirmed, billing generated 🎉', 'success');
    await refreshQuote(r.quotation.id, 'fulfillment');
  } catch (e) { toast(e.message, 'error'); }
};
window.manualSplit = async () => {
  try {
    const { suggestion } = await api('GET', `/quotations/${S.cache.q.id}/split-suggestion`);
    const { warehouses } = await api('GET', '/warehouses');
    const m = modal('Manual override', `
      <p class="small muted">Set quantity per warehouse for each line. Unallocated remainder becomes backorder.</p>
      <div id="ms-rows">${suggestion.lines.map((l, i) => `
        <div class="mb16" style="border-bottom:1px solid var(--line);padding-bottom:10px">
          <b class="small">${esc(l.product)} — need ${l.qty}</b>
          <div class="row mt8" style="flex-wrap:wrap">${warehouses.map(w => `
            <label class="row small" style="margin:0 10px 0 0"><input type="number" min="0" data-line="${l.line_id}" data-wh="${w.id}" value="${suggestion.lines.find(x => x.line_id === l.line_id && x.warehouse_id === w.id && x.status === 'planned')?.qty || 0}" style="width:64px;margin-right:5px"> @ ${esc(w.code)}</label>`).join('')}
          </div>
        </div>`).join('')}</div>`,
      `<button class="btn btn-ghost" data-x2>Cancel</button><button class="btn btn-primary" id="ms-apply">Apply override</button>`);
    m.querySelector('[data-x2]').onclick = () => m.remove();
    m.querySelector('#ms-apply').onclick = async () => {
      const splits = [...m.querySelectorAll('input[data-line]')]
        .map(inp => ({ line_id: +inp.dataset.line, warehouse_id: +inp.dataset.wh, qty: +inp.value }))
        .filter(s => s.qty > 0);
      try {
        const r = await api('POST', `/quotations/${S.cache.q.id}/split/override`, { splits });
        m.remove(); toast('Manual split applied — order confirmed', 'success');
        await refreshQuote(r.quotation.id, 'fulfillment');
      } catch (e) { toast(e.message, 'error'); }
    };
  } catch (e) { toast(e.message, 'error'); }
};
