/* DealFlow360 — CUSTOMER PORTAL (separate restricted surface: negotiation on live quotations) */
'use strict';

async function portalFetch(path, body, key) {
  const qs = key ? (path.includes('?') ? '&' : '?') + 'k=' + key : '';
  const res = await fetch('/api' + path + qs, {
    method: body ? 'POST' : 'GET',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(json?.error || 'Portal error');
  return json;
}

route(/^\/portal$/, async () => {
  document.getElementById('app').innerHTML = `
  <div class="auth-wrap" style="background:radial-gradient(1000px 500px at 80% -10%, #1e3a8a 0%, #0d1128 60%)">
    <div class="auth-card">
      <div class="auth-logo"><div class="logo-mark" style="background:linear-gradient(135deg,#0ea5e9,#6366f1)">◈</div><h2 style="font-size:1.25rem">Customer Portal</h2></div>
      <p class="auth-sub">View and negotiate your quotations directly — no more email back-and-forth.</p>
      <form id="f">
        <label>Email</label><input id="email" type="email" required placeholder="you@company.com">
        <label>Password</label><input id="pw" type="password" required placeholder="••••••••">
        <button class="btn btn-primary" style="background:linear-gradient(135deg,#0ea5e9,#6366f1)">Sign in to portal</button>
      </form>
      <div class="demo-creds">
        <b>Demo customers</b>:
        <div class="cred" data-e="buyer@acmecorp.com" data-p="Customer@123"><span>Acme Corp</span><span>buyer@acmecorp.com</span></div>
        <div class="cred" data-e="buyer@gammaretail.in" data-p="Customer@123"><span>Gamma Retail</span><span>buyer@gammaretail.in</span></div>
      </div>
      <p class="small mt16" style="text-align:center"><a href="#/login">← Internal team sign-in</a></p>
    </div>
  </div>`;
  document.querySelectorAll('.cred').forEach(c => c.onclick = () => {
    document.getElementById('email').value = c.dataset.e;
    document.getElementById('pw').value = c.dataset.p;
  });
  document.getElementById('f').onsubmit = async (e) => {
    e.preventDefault();
    try {
      await portalFetch('/auth/portal/login', { email: val('email'), password: val('pw') });
      location.hash = '/portal/home';
    } catch (err) { toast(err.message, 'error'); }
  };
});

route(/^\/portal\/home$/, async () => {
  let data;
  try { data = await portalFetch('/portal/quotes'); } catch { return navigate('/portal'); }
  document.getElementById('app').innerHTML = `
  <div class="portal-wrap">
    <div class="portal-card">
      <div class="portal-head">
        <div class="row-between">
          <div class="row"><div class="logo-mark" style="background:linear-gradient(135deg,#0ea5e9,#6366f1)">◈</div>
            <div><h2>Your quotations</h2><div class="small" style="color:#aab6d8">Customer self-service portal</div></div></div>
          <a href="#/portal" class="btn btn-ghost" style="background:rgba(255,255,255,.12);color:#fff;border-color:transparent">Sign out</a>
        </div>
      </div>
      <div class="portal-body">
        ${data.quotes.map(qx => `<div class="row-between" style="border-bottom:1px solid var(--line);padding:13px 4px;cursor:pointer"
          onclick="location.hash='/portal/q/${qx.number}'">
          <div><b>${qx.number}</b><div class="small muted">${fmtDate(qx.created_at)} · valid until ${fmtDate(qx.valid_until)}</div></div>
          <div class="row"><b>${fmtMoney(qx.total, qx.currency)}</b>${badge(qx.status)}</div>
        </div>`).join('') || emptyState('📭', 'No quotations yet')}
      </div>
    </div>
  </div>`;
});

route(/^\/portal\/q\/([A-Za-z0-9-]+)$/, async (m, q) => {
  const number = m[0], key = q.k || '';
  let data;
  try { data = await portalFetch(`/portal/quote/${number}`, null, key); } catch (e) {
    document.getElementById('app').innerHTML = `<div class="portal-wrap"><div class="portal-card"><div class="card" style="text-align:center">
      ${emptyState('🔒', esc(e.message))}<a class="btn btn-primary" href="#/portal" style="margin-top:10px">Go to portal sign-in</a></div></div></div>`;
    return;
  }
  const qt = data.quote;
  const negOpen = ['sent', 'negotiating'].includes(qt.status);
  const thread = qt.thread || [];
  document.getElementById('app').innerHTML = `
  <div class="portal-wrap">
    <div class="portal-card">
      <div class="portal-head">
        <div class="row-between">
          <div>
            <div class="row">${badge(qt.status)} <span class="small" style="color:#aab6d8">Quotation ${qt.number} · ${esc(qt.customer?.name || '')} (${qt.customer?.tier || ''} partner)</span></div>
            <h1 class="mt8" style="font-size:1.7rem">${fmtMoney(qt.total, qt.currency)}</h1>
            <div class="small" style="color:#aab6d8">${qt.lines.length} line(s) · valid until ${fmtDate(qt.valid_until)}${qt.expected_delivery ? ` · delivery by ${fmtDate(qt.expected_delivery)}` : ''}</div>
          </div>
          ${data.via === 'login' ? '<a href="#/portal/home" class="btn btn-ghost" style="background:rgba(255,255,255,.12);color:#fff;border-color:transparent">← My quotations</a>' : ''}
        </div>
      </div>
      <div class="portal-body">
        <table class="tbl">
          <thead><tr><th style="width:34px"></th><th>Item</th><th class="num">Qty</th><th class="num">Unit</th><th class="num">Disc.</th><th class="num">Amount</th></tr></thead>
          <tbody>${qt.lines.map(l => `
            <tr>
              <td><button title="Ask a question about this line" class="btn btn-ghost btn-sm quote-line-comment" onclick="portalComment(${l.id || 0}, '${esc(l.description).replace(/'/g, '')}')">💬</button></td>
              <td><b>${esc(l.description)}</b></td>
              <td class="num">${l.qty}</td>
              <td class="num">${fmtMoney(l.unit_price, qt.currency)}</td>
              <td class="num">${l.effective_discount}%</td>
              <td class="num"><b>${fmtMoney(l.net, qt.currency)}</b></td>
            </tr>`).join('')}
          </tbody>
        </table>
        <div class="totals" style="max-width:340px;margin-left:auto">
          <div class="t-row"><span class="muted">Subtotal</span><span>${fmtMoney(qt.subtotal, qt.currency)}</span></div>
          <div class="t-row"><span class="muted">Discount</span><span style="color:var(--danger)">− ${fmtMoney(qt.discount_total, qt.currency)}</span></div>
          <div class="t-row"><span class="muted">Tax</span><span>${fmtMoney(qt.tax_total, qt.currency)}</span></div>
          <div class="t-row grand"><span>Total</span><span>${fmtMoney(qt.total, qt.currency)}</span></div>
        </div>

        <div class="grid mt24" style="grid-template-columns:1fr 1fr;align-items:start">
          <div class="card" style="box-shadow:none;border:1px solid var(--line)">
            <h3>💬 Negotiate</h3>
            ${negOpen ? `
              <label>Counter discount proposal (%)</label>
              <div class="row"><input id="ctr-disc" type="number" min="0" max="90" value="${Math.max(...qt.lines.map(l => Math.ceil(l.effective_discount)), 0)}" style="width:110px"><span class="muted">%</span></div>
              <label>Message (optional)</label>
              <textarea id="ctr-msg" rows="2" placeholder="e.g. Competitor is offering a better rate…"></textarea>
              <button class="btn btn-primary mt8" onclick="portalCounter()">📨 Submit counter proposal</button>
              <div class="copy-link mt16" style="border-color:var(--warn);background:var(--warn-soft)">When you confirm, terms above your tier ceilings automatically go back for internal approval — you'll see the status here.</div>
            ` : `<p class="small muted mt8">Negotiation for this quote is ${qt.status === 'confirmed' || qt.status.startsWith('fulfill') ? 'closed — thank you!' : 'not open in this status (' + statusLabel(qt.status) + ')'}. Line questions still work.</p>
              <label>General comment / question</label>
              <textarea id="gen-msg" rows="2"></textarea>
              <button class="btn btn-soft mt8" onclick="portalComment(null)">📨 Send</button>`}
            ${negOpen ? '' : ''}
          </div>
          <div>
            ${['sent', 'negotiating', 'approved'].includes(qt.status) ? `
            <div class="card" style="box-shadow:none;border:1px solid var(--success);text-align:center">
              <h3>Ready to proceed?</h3>
              <p class="small muted mt8">Confirming accepts the current terms${thread.some(t => t.kind === 'counter' && t.status === 'open') ? ' <b>including your open counter proposal</b>' : ''}.</p>
              <button class="btn btn-success mt16" style="width:100%;justify-content:center" onclick="portalConfirm()">✅ Confirm quotation</button>
            </div>` : ''}
            <div class="card mt16" style="box-shadow:none;border:1px solid var(--line)">
              <h3>🧾 Invoices</h3>
              ${qt.invoices.map(i => `<div class="row-between small" style="padding:6px 0;border-bottom:1px solid var(--line)">
                <span>${i.number} · ${i.kind.replace('_', '-')}</span><span class="row">${fmtMoney(i.amount, qt.currency)} ${badge(i.status)}</span>
              </div>`).join('') || '<p class="small muted mt8">No invoices yet.</p>'}
            </div>
          </div>
        </div>

        <div class="card mt16" style="box-shadow:none;border:1px solid var(--line)">
          <h3>📜 Conversation</h3>
          ${thread.length ? thread.map(t => `
            <div class="thread-item">
              <div class="avatar" style="width:30px;height:30px;font-size:.7rem;background:${t.user_id ? 'linear-gradient(135deg,#6366f1,#a855f7)' : 'linear-gradient(135deg,#0ea5e9,#22c55e)'}">${t.user_id ? initials(t.staff_name || 'SR') : 'C'}</div>
              <div style="flex:1">
                <div class="row-between"><b class="small">${t.user_id ? esc(t.staff_name || 'Sales') : 'You'}${t.kind === 'counter' ? ' · counter proposal' : ''}${t.line_label ? ' · on "' + esc(t.line_label) + '"' : ''}</b>
                <span class="small muted">${fmtDate(t.created_at)} ${badge(t.status)}</span></div>
                <div class="small mt8">${esc(t.message || '')}</div>
                ${t.proposed_discount != null ? `<div class="mt8"><span class="badge b-negotiating">${t.proposed_discount}% proposed</span></div>` : ''}
              </div>
            </div>`).join('') : '<p class="small muted mt8">No messages yet — ask a question on any line 💬.</p>'}
        </div>
      </div>
    </div>
  </div>`;

  window.portalKey = key;
  window.portalComment = (lineId, label) => {
    const m = modal(label ? `💬 Question about: ${label}` : '💬 Message to the sales team', `
      <textarea id="pc-msg" rows="3" placeholder="${label ? 'e.g. Can this price include setup?' : 'Type your message…'}"></textarea>`,
      `<button class="btn btn-ghost" data-x2>Cancel</button><button class="btn btn-primary" id="pc-go">📨 Send</button>`);
    m.querySelector('[data-x2]').onclick = () => m.remove();
    m.querySelector('#pc-go').onclick = async () => {
      try { await portalFetch(`/portal/quote/${number}/comment`, { line_id: lineId || null, message: val('pc-msg') }, key); m.remove(); toast('Message sent to the sales team 📨', 'success'); render(); } catch (e) { toast(e.message, 'error'); }
    };
  };
  window.portalCounter = async () => {
    try {
      await portalFetch(`/portal/quote/${number}/counter`, { discount_pct: +val('ctr-disc'), message: val('ctr-msg') }, key);
      toast('Counter proposal submitted — the team has been notified', 'success'); render();
    } catch (e) { toast(e.message, 'error'); }
  };
  window.portalConfirm = () => {
    const m = modal('Confirm quotation', `<p class="small muted">You're confirming <b>${number}</b> at the current terms. If negotiated terms exceed internal limits, it will automatically route for internal approval first — you'll see the updated status here.</p>`,
      `<button class="btn btn-ghost" data-x2>Not yet</button><button class="btn btn-success" id="pc-go">✅ Confirm</button>`);
    m.querySelector('[data-x2]').onclick = () => m.remove();
    m.querySelector('#pc-go').onclick = async () => {
      try {
        const r = await portalFetch(`/portal/quote/${number}/confirm`, {}, key);
        m.remove();
        toast(r.re_approval && r.re_approval !== 'none' ? 'Confirmed — now routing through internal approval 🔁' : 'Confirmed — thank you! 🎉', 'success');
        render();
      } catch (e) { toast(e.message, 'error'); }
    };
  };
});
