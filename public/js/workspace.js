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
  catTabs.innerHTML = `<button class="${!catFilter ? 'active' : ''}" onclick="loadCatalog(S.cache.q,!1&&null||null)">All</button>` +
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


