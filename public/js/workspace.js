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


