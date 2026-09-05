/* DealFlow360 — router, auth screens, backend config + dashboard views */
'use strict';

/* ============ router ============ */
const routes = [];
function route(pattern, handler) { routes.push({ pattern, handler }); }
function navigate(hash) { location.hash = hash; }
async function render() {
  const raw = location.hash.slice(1) || '/login';
  const [path, qs] = raw.split('?');
  const q = Object.fromEntries(new URLSearchParams(qs || ''));
  for (const r of routes) {
    const pp = path.match(r.pattern);
    if (pp) {
      document.documentElement.scrollTop = 0;
      try { await r.handler(pp.slice(1), q); } catch (e) { console.error(e); toast(e.message, 'error'); }
      return;
    }
  }
  location.hash = '#/login';
}
window.addEventListener('hashchange', render);

/* ============ auth screens ============ */
route(/^\/login$/, async () => {
  document.getElementById('app').innerHTML = `
  <div class="auth-wrap">
    <div class="auth-card">
      <div class="auth-logo"><div class="logo-mark">D</div><h2 style="font-size:1.3rem">DealFlow360</h2></div>
      <p class="auth-sub">Self-governing sales operations — sign in to your workspace</p>
      <form id="f">
        <label>Email</label><input id="email" type="email" required placeholder="you@company.com" autocomplete="username">
        <label>Password</label><input id="pw" type="password" required placeholder="••••••••" autocomplete="current-password">
        <button class="btn btn-primary">Sign in</button>
      </form>
      <p class="small mt16" style="text-align:center">New sales rep? <a href="#/signup">Create an account</a> · <a href="#/portal">Customer portal</a></p>
      <div class="demo-creds">
        <b>Quick demo logins</b> (click to fill):
        <div class="cred" data-e="rep@dealflow.io" data-p="Rep@123"><span>👤 Sales Rep — Asha</span><span>rep@dealflow.io</span></div>
        <div class="cred" data-e="manager@dealflow.io" data-p="Manager@123"><span>🧭 Sales Manager — Priya</span><span>manager@dealflow.io</span></div>
        <div class="cred" data-e="finance@dealflow.io" data-p="Finance@123"><span>💰 Finance — Rahul</span><span>finance@dealflow.io</span></div>
        <div class="cred" data-e="admin@dealflow.io" data-p="Admin@123"><span>⚙️ Admin</span><span>admin@dealflow.io</span></div>
      </div>
    </div>
  </div>`;
  document.querySelectorAll('.cred').forEach(c => c.onclick = () => {
    document.getElementById('email').value = c.dataset.e;
    document.getElementById('pw').value = c.dataset.p;
  });
  document.getElementById('f').onsubmit = async (e) => {
    e.preventDefault();
    try {
      const { user } = await api('POST', '/auth/login', { email: val('email'), password: val('pw') });
      S.user = user;
      toast(`Welcome back, ${user.name.split(' ')[0]}!`, 'success');
      navigate(user.role === 'salesrep' ? '/workspace/quotes' : '/app/dashboard');
    } catch (err) { toast(err.message, 'error'); }
  };
});

route(/^\/signup$/, async () => {
  document.getElementById('app').innerHTML = `
  <div class="auth-wrap">
    <div class="auth-card">
      <div class="auth-logo"><div class="logo-mark">D</div><h2 style="font-size:1.3rem">Create your account</h2></div>
      <p class="auth-sub">Sales reps can self-register — an admin can promote you to manager/finance later.</p>
      <form id="f">
        <label>Full name</label><input id="name" required placeholder="Jane Sales">
        <label>Email</label><input id="email" type="email" required placeholder="you@company.com">
        <label>Password (6+ characters)</label><input id="pw" type="password" required minlength="6">
        <button class="btn btn-primary">Sign up</button>
      </form>
      <p class="small mt16" style="text-align:center">Already registered? <a href="#/login">Sign in</a></p>
    </div>
  </div>`;
  document.getElementById('f').onsubmit = async (e) => {
    e.preventDefault();
    try {
      const { user } = await api('POST', '/auth/signup', { name: val('name'), email: val('email'), password: val('pw') });
      S.user = user; toast('Account created — welcome aboard!', 'success');
      navigate('/workspace/quotes');
    } catch (err) { toast(err.message, 'error'); }
  };
});

const val = (id) => document.getElementById(id)?.value?.trim();

/* ============ shared shells ============ */
async function boot() {
  if (!S.user) {
    try { S.user = (await api('GET', '/auth/me')).user; } catch { S.user = null; }
  }
  return S.user;
}
function requireUser(roles) {
  const u = S.user;
  if (!u) { navigate('/login'); return null; }
  if (roles && !roles.includes(u.role)) { toast(`This page requires: ${roles.join(' / ')}`, 'error'); navigate(u.role === 'salesrep' ? '/workspace/quotes' : '/app/dashboard'); return null; }
  return u;
}

const NAV = [
  { sec: 'Overview' },
  { path: '/app/dashboard', ic: '📊', label: 'Dashboard' },
  { path: '/app/health', ic: '🩺', label: 'Deal Health' },
  { sec: 'Sales' },
  { path: '/workspace/quotes', ic: '💼', label: 'Sales Workspace' },
  { path: '/app/invoices', ic: '🧾', label: 'Invoices & Payments' },
  { path: '/app/reports', ic: '📈', label: 'Reports' },
  { sec: 'Configuration', admin: true },
  { path: '/app/products', ic: '📦', label: 'Products & Variants' },
  { path: '/app/pricing', ic: '🏷️', label: 'Price Lists' },
  { path: '/app/governance', ic: '🛡️', label: 'Discount Governance' },
  { path: '/app/warehouses', ic: '🏭', label: 'Warehouses & Stock' },
  { path: '/app/subscriptions', ic: '🔄', label: 'Subscription Plans' },
  { path: '/app/upsell', ic: '✨', label: 'Upsell Rules' },
  { path: '/app/customers', ic: '🤝', label: 'Customers' },
  { path: '/app/users', ic: '👥', label: 'Users', admin: true },
  { path: '/app/settings', ic: '⚙️', label: 'Settings', admin: true },
];

function shell(activePath, contentHTML) {
  const u = S.user;
  const navHTML = NAV.map(n => {
    if (n.sec) return `<div class="nav-sec">${n.sec}</div>`;
    if (n.admin && !['admin', 'manager'].includes(u.role)) return '';
    return `<a class="nav-item ${activePath === n.path ? 'active' : ''}" href="#${n.path}"><span class="ic">${n.ic}</span>${n.label}</a>`;
  }).join('');
  document.getElementById('app').innerHTML = `
  <div class="shell">
    <aside class="sidebar">
      <div class="brand"><div class="logo-mark">D</div><span>DealFlow360</span></div>
      ${navHTML}
      <div class="spacer"></div>
      <div class="user-chip">
        <div class="avatar">${initials(u.name)}</div>
        <div><div class="name">${esc(u.name)}</div><div class="role">${u.role.replace('salesrep', 'Sales Rep')}</div></div>
      </div>
      <button class="nav-item" id="logout" style="color:#fca5a5"><span class="ic">⏻</span>Sign out</button>
    </aside>
    <main class="main">${contentHTML}</main>
  </div>`;
  document.getElementById('logout').onclick = async () => { await api('POST', '/auth/logout'); S.user = null; navigate('/login'); };
}
const pageHead = (title, sub, actions = '') => `<div class="page-head"><div><h1>${title}</h1><div class="sub">${sub}</div></div><div class="row">${actions}</div></div>`;

/* ============ dashboard ============ */
route(/^\/app\/dashboard$/, async () => {
  const u = await boot(); if (!requireUser()) return;
  if (u.role === 'salesrep') { navigate('/workspace/quotes'); return; }
  const { kpi } = await api('GET', '/dashboard');
  const ac = Object.fromEntries(kpi.alert_counts.map(a => [a.kind, a.c]));
  shell('/app/dashboard', `
    ${pageHead(`Good day, ${u.name.split(' ')[0]} 👋`, 'Company-wide sales pulse, refreshed live', `<a class="btn btn-primary" href="#/app/health">🩺 Deal Health (${kpi.alerts.length})</a>`)}
    <div class="kpis">
      <div class="kpi accent"><div class="k-label">Open pipeline</div><div class="k-value">${fmtMoney(kpi.pipeline_value)}</div><div class="k-sub">${kpi.quotes_by_status.filter(s => ['draft','pending_manager','pending_finance','sent','negotiating','returned'].includes(s.status)).reduce((a,b)=>a+b.c,0)} active quotations</div></div>
      <div class="kpi"><div class="k-label">Won value</div><div class="k-value">${fmtMoney(kpi.confirmed_value)}</div><div class="k-sub">confirmed + fulfilled</div></div>
      <div class="kpi"><div class="k-label">Recurring revenue (MRR)</div><div class="k-value">${fmtMoney(kpi.recurring_mrr)}</div><div class="k-sub">from active subscriptions</div></div>
      <div class="kpi"><div class="k-label">Pending approvals</div><div class="k-value">${kpi.pending_approvals}</div><div class="k-sub">waiting on manager / finance</div></div>
      <div class="kpi"><div class="k-label">Open invoices</div><div class="k-value">${fmtMoney(kpi.open_invoices.v || 0)}</div><div class="k-sub">${kpi.open_invoices.c} to collect · ${fmtMoney(kpi.paid_value)} paid</div></div>
      <div class="kpi"><div class="k-label">Avg discount / margin</div><div class="k-value">${fmtPct(kpi.avg_discount)} / ${fmtPct(kpi.avg_margin)}</div><div class="k-sub">on won deals</div></div>
    </div>
    <div class="grid mt16" style="grid-template-columns: 1.6fr 1fr;">
      <div class="card"><h3>Confirmed revenue by month</h3><div class="chart-wrap mt8"><canvas class="chart" id="ch1"></canvas></div></div>
      <div class="card">
        <h3>🩺 Live alerts</h3>
        <div class="row mt8 mb8">
          <span class="badge b-pending_manager">Stalled ${ac.stalled || 0}</span>
          <span class="badge b-rejected">Anomaly ${ac.anomaly || 0}</span>
          <span class="badge b-sent">Slippage ${ac.slippage || 0}</span>
        </div>
        ${kpi.alerts.slice(0, 4).map(a => alertCard(a, u)).join('') || emptyState('✅', 'No alerts — deals are healthy')}
        ${kpi.alerts.length > 4 ? `<a class="small" href="#/app/health">View all ${kpi.alerts.length} alerts →</a>` : ''}
      </div>
    </div>
    <div class="card mt16"><h3>Top products by revenue</h3>
      <table class="tbl mt8"><thead><tr><th>Product</th><th class="num">Qty sold</th><th class="num">Revenue</th></tr></thead>
      <tbody>${kpi.top_products.map(p => `<tr><td>${esc(p.description)}</td><td class="num">${p.qty}</td><td class="num"><b>${fmtMoney(p.revenue)}</b></td></tr>`).join('')}</tbody></table>
    </div>`);
  const m = kpi.monthly;
  barChart(document.getElementById('ch1'), m.map(x => x.m?.slice(5) + '/' + x.m?.slice(2, 4)), m.map(x => x.v), { money: true });
});

function alertCard(a, u) {
  const ic = { stalled: ['🕐', 'ic-stalled'], anomaly: ['🚨', 'ic-anomaly'], slippage: ['🚚', 'ic-slippage'] }[a.kind];
  const klabel = { stalled: 'Stalled', anomaly: 'Discount anomaly', slippage: 'Delivery slippage' }[a.kind];
  return `<div class="alert-card">
    <div class="alert-ic ${ic[1]}">${ic[0]}</div>
    <div style="flex:1">
      <div class="row-between"><b class="small">${klabel}</b>${a.severity === 'high' ? '<span class="badge b-rejected">High</span>' : ''}</div>
      <div class="small mt8" style="color:var(--ink-2)">${esc(a.message)}</div>
      <div class="row mt8">
        <button class="btn btn-ghost btn-sm" onclick="openQuoteByNumber('${a.number}')">Open ${a.number}</button>
        <button class="btn btn-warn btn-sm" onclick="alertAct(${a.id},'nudge')">Nudge rep</button>
        <button class="btn btn-danger btn-sm" onclick="alertAct(${a.id},'escalate')">Escalate</button>
      </div>
    </div>
  </div>`;
}
window.alertAct = async (id, action) => {
  try { await api('POST', `/alerts/${id}/${action}`); toast(action === 'nudge' ? 'Rep nudged ✉️' : action === 'escalate' ? 'Escalated to manager 🔺' : 'Dismissed', 'success'); render(); }
  catch (e) { toast(e.message, 'error'); }
};
window.openQuoteByNumber = async (number) => {
  const { quotations } = await api('GET', '/quotations');
  const q = quotations.find(x => x.number === number);
  if (q) navigate(`/workspace/quote/${q.id}`);
};

/* ============ deal health ============ */
route(/^\/app\/health$/, async () => {
  await boot(); if (!requireUser()) return;
  const { kpi } = await api('GET', '/dashboard');
  const groups = { stalled: [], anomaly: [], slippage: [] };
  kpi.alerts.forEach(a => groups[a.kind]?.push(a));
  const block = (title, icon, list, hint) => `
    <div class="card">
      <div class="row-between"><h3>${icon} ${title}</h3><span class="small muted">${hint}</span></div>
      <div class="mt16">${list.map(a => alertCard(a)).join('') || emptyState('✅', 'Nothing here — healthy!')}</div>
    </div>`;
  shell('/app/health', `
    ${pageHead('Deal Health & Anomalies', 'Self-governing monitoring — stalled deals, discount anomalies and delivery slippage')}
    <div class="grid" style="grid-template-columns:repeat(3,1fr);align-items:start">
      ${block('Stalled deals', '🕐', groups.stalled, `inactive > ${window.__stalledDays || 3} days`)}
      ${block('Discount anomalies', '🚨', groups.anomaly, 'far above rep baseline')}
      ${block('Delivery slippage', '🚚', groups.slippage, 'past promised date, unshipped')}
    </div>`);
});

/* ============ products ============ */
route(/^\/app\/products$/, async () => {
  const u = await boot(); if (!requireUser()) return;
  const [{ products, variants, plans }, { categories }] = await Promise.all([api('GET', '/products'), api('GET', '/categories')]);
  const isAdmin = u.role === 'admin';
  shell('/app/products', `
    ${pageHead('Products & Variants', 'Catalog with categories, variants, pricing and promotion flags',
      isAdmin ? `<button class="btn btn-primary" id="addP">+ New product</button><button class="btn btn-ghost" id="addC">+ Category</button>` : '')}
    <div class="card" style="padding:0;overflow:auto">
      <table class="tbl"><thead><tr><th>Product</th><th>SKU</th><th>Category</th><th>Type</th><th class="num">Price</th><th class="num">Cost</th><th class="num">Margin</th><th class="num">Tax</th><th>Variants</th><th>Flags</th>${isAdmin ? '<th></th>' : ''}</tr></thead>
      <tbody>${products.map(p => {
        const vs = variants.filter(v => v.product_id === p.id);
        const margin = p.base_price > 0 ? Math.round((p.base_price - p.cost_price) / p.base_price * 100) : (plans.find(pp => pp.product_id === p.id) ? 'plan' : 0);
        return `<tr>
          <td><b>${esc(p.name)}</b><div class="small muted">${esc(p.description || '')}</div></td>
          <td class="small">${p.sku}</td><td>${esc(p.category_name)} <span class="small muted">(≤${p.discount_ceiling}%)</span></td>
          <td><span class="badge ${p.product_type === 'subscription' ? 'b-sent' : 'b-draft'}">${p.product_type}</span></td>
          <td class="num"><b>${p.product_type === 'subscription' && plans.find(pp => pp.product_id === p.id) ? fmtMoney(plans.find(pp => pp.product_id === p.id).recurring_price) + '/' + plans.find(pp => pp.product_id === p.id).billing_period.slice(0, 2) : fmtMoney(p.base_price)}</b></td>
          <td class="num muted">${fmtMoney(p.cost_price)}</td>
          <td class="num ${typeof margin === 'number' && margin < 30 ? 'viol' : 'okay'}">${typeof margin === 'number' ? margin + '%' : margin}</td>
          <td class="num">${p.tax_rate}%</td>
          <td>${isAdmin ? `<button class="btn btn-ghost btn-sm" onclick="editVariants(${p.id}, '${esc(p.name)}')">${vs.length} variant${vs.length === 1 ? '' : 's'} ⚙</button>` : vs.length}</td>
          <td>${p.promoted ? '<span class="badge b-promoted">Promoted</span>' : ''} ${p.stocked ? '' : '<span class="badge b-draft">Service</span>'}</td>
          ${isAdmin ? `<td><button class="btn btn-ghost btn-sm" onclick="editProduct(${p.id})">Edit</button></td>` : ''}
        </tr>`; }).join('')}
      </tbody></table>
    </div>`);

  if (isAdmin) {
    window.editProduct = (id) => {
      const p = products.find(x => x.id === id);
      const m = modal('Edit product', `
        <label>Name</label><input id="ep-name" value="${esc(p.name)}">
        <div class="row"><div style="flex:1"><label>Base price</label><input id="ep-price" type="number" step="0.01" value="${p.base_price}"></div>
        <div style="flex:1"><label>Cost price</label><input id="ep-cost" type="number" step="0.01" value="${p.cost_price}"></div></div>
        <label>Category</label><select id="ep-cat">${categories.map(c => `<option value="${c.id}" ${c.id === p.category_id ? 'selected' : ''}>${esc(c.name)} (≤${c.discount_ceiling}%)</option>`).join('')}</select>
        <label class="row" style="margin-top:14px"><input type="checkbox" id="ep-promo" ${p.promoted ? 'checked' : ''} style="width:auto"> Currently promoted (ranks higher in upsell)</label>`,
        `<button class="btn btn-ghost" data-x2>Cancel</button><button class="btn btn-primary" id="ep-save">Save</button>`);
      m.querySelector('[data-x2]').onclick = () => m.remove();
      m.querySelector('#ep-save').onclick = async () => {
        try { await api('PUT', `/products/${p.id}`, { name: val('ep-name'), base_price: +val('ep-price'), cost_price: +val('ep-cost'), category_id: +val('ep-cat'), promoted: document.getElementById('ep-promo').checked ? 1 : 0 }); m.remove(); toast('Product saved', 'success'); render(); } catch (e) { toast(e.message, 'error'); }
      };
    };
    window.editVariants = (pid, name) => {
      const vs = variants.filter(v => v.product_id === pid);
      const m = modal(`Variants — ${esc(name)}`, `
        <div id="vlist">${vs.map(v => `<div class="row mb8"><input value="${esc(v.attribute)}" style="width:110px" disabled><input value="${esc(v.value)}" style="flex:1" disabled><input value="${v.extra_price}" style="width:90px" disabled><button class="btn btn-danger btn-sm" onclick="delVariant(${v.id})">✕</button></div>`).join('') || '<p class="small muted">No variants yet.</p>'}</div>
        <hr style="border:none;border-top:1px solid var(--line);margin:14px 0">
        <div class="row"><input id="nv-attr" placeholder="Attribute (e.g. Pack)" style="width:130px"><input id="nv-val" placeholder="Value (e.g. 3-Pack)" style="flex:1"><input id="nv-extra" type="number" placeholder="+Price" style="width:90px"><button class="btn btn-soft btn-sm" id="nv-add">Add</button></div>`);
      m.querySelector('#nv-add').onclick = async () => {
        try { await api('POST', `/products/${pid}/variants`, { attribute: val('nv-attr'), value: val('nv-val'), extra_price: +val('nv-extra') || 0 }); m.remove(); toast('Variant added', 'success'); render(); } catch (e) { toast(e.message, 'error'); }
      };
      window.delVariant = async (id) => { await api('DELETE', `/variants/${id}`); m.remove(); render(); };
    };
    document.getElementById('addP').onclick = () => {
      const m = modal('New product', `
        <div class="row"><div style="flex:1"><label>Name</label><input id="np-name"></div><div style="width:130px"><label>SKU</label><input id="np-sku"></div></div>
        <div class="row"><div style="flex:1"><label>Category</label><select id="np-cat">${categories.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select></div>
        <div style="flex:1"><label>Type</label><select id="np-type"><option value="one_time">One-time</option><option value="subscription">Subscription</option></select></div></div>
        <div class="row"><div style="flex:1"><label>Base price</label><input id="np-price" type="number" step="0.01" value="0"></div><div style="flex:1"><label>Cost price</label><input id="np-cost" type="number" step="0.01" value="0"></div><div style="flex:1"><label>Tax %</label><input id="np-tax" type="number" value="8"></div></div>`,
        `<button class="btn btn-ghost" data-x2>Cancel</button><button class="btn btn-primary" id="np-save">Create</button>`);
      m.querySelector('[data-x2]').onclick = () => m.remove();
      m.querySelector('#np-save').onclick = async () => {
        try { await api('POST', '/products', { name: val('np-name'), sku: val('np-sku'), category_id: +val('np-cat'), product_type: val('np-type'), base_price: +val('np-price'), cost_price: +val('np-cost'), tax_rate: +val('np-tax') }); m.remove(); toast('Product created', 'success'); render(); } catch (e) { toast(e.message, 'error'); }
      };
    };
    document.getElementById('addC').onclick = () => {
      const m = modal('New category', `
        <label>Category name</label><input id="nc-name">
        <label>Category discount ceiling (%) — how much discretion reps have on this category</label><input id="nc-ceiling" type="number" value="15">`,
        `<button class="btn btn-ghost" data-x2>Cancel</button><button class="btn btn-primary" id="nc-save">Create</button>`);
      m.querySelector('[data-x2]').onclick = () => m.remove();
      m.querySelector('#nc-save').onclick = async () => {
        try { await api('POST', '/categories', { name: val('nc-name'), discount_ceiling: +val('nc-ceiling') }); m.remove(); toast('Category created', 'success'); render(); } catch (e) { toast(e.message, 'error'); }
      };
    };
  }
});

/* ============ price lists ============ */
route(/^\/app\/pricing$/, async () => {
  const u = await boot(); if (!requireUser()) return;
  const { price_lists } = await api('GET', '/price-lists');
  const isAdmin = u.role === 'admin';
  shell('/app/pricing', `
    ${pageHead('Price Lists', 'Customer-tier pricing with currency-specific rules', isAdmin ? '<button class="btn btn-primary" id="add">+ New price list</button>' : '')}
    <div class="card" style="padding:0">
      <table class="tbl"><thead><tr><th>Name</th><th>Tier</th><th>Currency</th><th>Rule</th><th class="num">Value</th><th>Status</th>${isAdmin ? '<th></th>' : ''}</tr></thead>
      <tbody>${price_lists.map(pl => `<tr class="clickable">
        <td><b>${esc(pl.name)}</b></td><td><span class="badge b-${pl.customer_tier}">${pl.customer_tier}</span></td><td>${pl.currency}</td>
        <td>${pl.rule_type === 'discount' ? 'Discount off list' : 'Markup on list'}</td>
        <td class="num"><b>${pl.value}%</b></td>
        <td>${pl.active ? '<span class="badge b-approved">Active</span>' : '<span class="badge b-cancelled">Off</span>'}</td>
        ${isAdmin ? `<td><button class="btn btn-ghost btn-sm" onclick="delPL(${pl.id})">Delete</button></td>` : ''}
      </tr>`).join('')}</tbody></table>
    </div>
    <p class="small muted mt8">Applied automatically when a rep adds products to a quotation: tier + currency matched, best rule wins. Subscriptions use plan pricing.</p>`);
  if (isAdmin) {
    document.getElementById('add').onclick = () => {
      const m = modal('New price list', `
        <label>Name</label><input id="pl-name">
        <div class="row"><div style="flex:1"><label>Customer tier</label><select id="pl-tier"><option value="bronze">Bronze</option><option value="silver">Silver</option><option value="gold">Gold</option></select></div>
        <div style="flex:1"><label>Currency</label><select id="pl-cur"><option>USD</option><option>INR</option></select></div></div>
        <div class="row"><div style="flex:1"><label>Rule</label><select id="pl-rule"><option value="discount">Discount</option><option value="markup">Markup</option></select></div>
        <div style="flex:1"><label>Value %</label><input id="pl-val" type="number" value="5"></div></div>`,
        `<button class="btn btn-ghost" data-x2>Cancel</button><button class="btn btn-primary" id="pl-save">Create</button>`);
      m.querySelector('[data-x2]').onclick = () => m.remove();
      m.querySelector('#pl-save').onclick = async () => {
        try { await api('POST', '/price-lists', { name: val('pl-name'), customer_tier: val('pl-tier'), currency: val('pl-cur'), rule_type: val('pl-rule'), value: +val('pl-val') }); m.remove(); toast('Price list created', 'success'); render(); } catch (e) { toast(e.message, 'error'); }
      };
    };
    window.delPL = async (id) => { await api('DELETE', `/price-lists/${id}`); toast('Deleted', 'success'); render(); };
  }
});

/* ============ discount governance ============ */
route(/^\/app\/governance$/, async () => {
  const u = await boot(); if (!requireUser()) return;
  const { discount_tiers, approval_rules } = await api('GET', '/governance');
  const { categories } = await api('GET', '/categories');
  const isAdmin = u.role === 'admin';
  shell('/app/governance', `
    ${pageHead('Discount Governance', 'Tier ceilings, category ceilings and the automated approval chain',
      isAdmin ? '<button class="btn btn-primary" id="addRule">+ Approval rule</button>' : '')}
    <div class="grid" style="grid-template-columns:1fr 1fr;align-items:start">
      <div class="card">
        <h3>Customer tier ceilings</h3>
        <p class="small muted mt8">Maximum discount a rep may give before approval is triggered, per customer tier.</p>
        <div class="mt16">${discount_tiers.map(t => `
          <div class="row-between mb8"><span class="badge b-${t.customer_tier}" style="min-width:86px;justify-content:center">${t.customer_tier}</span>
          <div class="row">${isAdmin ? `<input type="number" value="${t.max_discount_pct}" id="tier-${t.customer_tier}" style="width:80px;text-align:right">` : `<b>${t.max_discount_pct}%</b>`}<span class="muted small">%</span>
          ${isAdmin ? `<button class="btn btn-soft btn-sm" onclick="saveTier('${t.customer_tier}')">Save</button>` : ''}</div></div>`).join('')}
        </div>
        <h3 class="mt24">Category ceilings</h3>
        <p class="small muted mt8">Effective allowed discount per line = min(tier ceiling, category ceiling).</p>
        <div class="mt16">${categories.map(c => isAdmin ? `
          <div class="row-between mb8"><span>${esc(c.name)}</span>
          <div class="row"><input type="number" value="${c.discount_ceiling}" id="cat-${c.id}" style="width:80px;text-align:right"><span class="muted small">%</span>
          <button class="btn btn-soft btn-sm" onclick="saveCat(${c.id})">Save</button></div></div>` : `
          <div class="row-between mb8"><span>${esc(c.name)}</span><b>${c.discount_ceiling}%</b></div>`).join('')}
        </div>
      </div>
      <div class="card">
        <h3>Approval chain</h3>
        <p class="small muted mt8">Blended risk score = <b>worst line violation + ½ × (other violations)</b>. The quote routes to the highest level whose range matches.</p>
        <div class="steps mt16">${approval_rules.map(r => `
          <div class="step">
            <div class="rail"><div class="dot ${r.level === 'finance' ? 'pending' : 'approved'}">${r.sequence}</div><div class="cord"></div></div>
            <div class="st-body">
              <div class="st-title">${r.level === 'manager' ? '🧭 Sales Manager' : '💰 Finance'} — ${esc(r.name)}</div>
              <div class="small muted">Blended risk ${r.risk_min} – ${r.risk_max}${r.any_line_over ? ` · or any single line > ${r.any_line_over}%` : ''}</div>
              ${isAdmin ? `<div class="row mt8"><button class="btn btn-ghost btn-sm" onclick="editRule(${r.id})">Edit</button><button class="btn btn-danger btn-sm" onclick="delRule(${r.id})">Delete</button></div>` : ''}
            </div>
          </div>`).join('')}</div>
        <div class="copy-link mt8">Example: Gold customer buys Hardware (≤15%) at 12% ✓ and Services (≤10%) at 18% ✗ → worst violation 8 pts → risk 8 → <b>Manager + Finance</b></div>
      </div>
    </div>`);
  if (isAdmin) {
    window.saveTier = async (tier) => { try { await api('PUT', `/discount-tiers/${tier}`, { max_discount_pct: +val(`tier-${tier}`) }); toast('Ceiling updated', 'success'); } catch (e) { toast(e.message, 'error'); } };
    window.saveCat = async (id) => { try { await api('PUT', `/categories/${id}`, { discount_ceiling: +val(`cat-${id}`) }); toast('Category ceiling updated', 'success'); } catch (e) { toast(e.message, 'error'); } };
    window.delRule = async (id) => { await api('DELETE', `/approval-rules/${id}`); toast('Rule deleted', 'success'); render(); };
    window.editRule = (id) => {
      const r = approval_rules.find(x => x.id === id);
      const m = modal('Edit approval rule', `
        <label>Name</label><input id="ar-name" value="${esc(r.name)}">
        <div class="row"><div style="flex:1"><label>Level</label><select id="ar-level"><option value="manager" ${r.level === 'manager' ? 'selected' : ''}>Manager</option><option value="finance" ${r.level === 'finance' ? 'selected' : ''}>Finance</option></select></div>
        <div style="flex:1"><label>Sequence</label><input id="ar-seq" type="number" value="${r.sequence}"></div></div>
        <div class="row"><div style="flex:1"><label>Risk min</label><input id="ar-min" type="number" step="0.1" value="${r.risk_min}"></div>
        <div style="flex:1"><label>Risk max</label><input id="ar-max" type="number" step="0.1" value="${r.risk_max}"></div>
        <div style="flex:1"><label>Any line over %</label><input id="ar-over" type="number" value="${r.any_line_over ?? ''}" placeholder="—"></div></div>`,
        `<button class="btn btn-ghost" data-x2>Cancel</button><button class="btn btn-primary" id="ar-save">Save</button>`);
      m.querySelector('[data-x2]').onclick = () => m.remove();
      m.querySelector('#ar-save').onclick = async () => {
        try { await api('PUT', `/approval-rules/${r.id}`, { name: val('ar-name'), level: val('ar-level'), sequence: +val('ar-seq'), risk_min: +val('ar-min'), risk_max: +val('ar-max'), any_line_over: val('ar-over') ? +val('ar-over') : null }); m.remove(); toast('Rule saved', 'success'); render(); } catch (e) { toast(e.message, 'error'); }
      };
    };
    document.getElementById('addRule').onclick = () => {
      const m = modal('New approval rule', `
        <label>Name</label><input id="nr-name" placeholder="e.g. High-risk review">
        <div class="row"><div style="flex:1"><label>Level</label><select id="nr-level"><option value="manager">Manager</option><option value="finance">Finance</option></select></div>
        <div style="flex:1"><label>Sequence</label><input id="nr-seq" type="number" value="1"></div></div>
        <div class="row"><div style="flex:1"><label>Risk min</label><input id="nr-min" type="number" step="0.1" value="1"></div>
        <div style="flex:1"><label>Risk max</label><input id="nr-max" type="number" step="0.1" value="999"></div>
        <div style="flex:1"><label>Any line over %</label><input id="nr-over" type="number" placeholder="optional"></div></div>`,
        `<button class="btn btn-ghost" data-x2>Cancel</button><button class="btn btn-primary" id="nr-save">Create</button>`);
      m.querySelector('[data-x2]').onclick = () => m.remove();
      m.querySelector('#nr-save').onclick = async () => {
        try { await api('POST', '/approval-rules', { name: val('nr-name'), level: val('nr-level'), sequence: +val('nr-seq'), risk_min: +val('nr-min'), risk_max: +val('nr-max'), any_line_over: val('nr-over') ? +val('nr-over') : null }); m.remove(); toast('Rule created', 'success'); render(); } catch (e) { toast(e.message, 'error'); }
      };
    };
  }
});

/* ============ warehouses & stock ============ */
route(/^\/app\/warehouses$/, async () => {
  const u = await boot(); if (!requireUser()) return;
  const { warehouses, stock } = await api('GET', '/warehouses');
  const { products } = await api('GET', '/products');
  const stocked = products.filter(p => p.stocked);
  const canEdit = ['admin', 'finance'].includes(u.role);
  const cell = (wh, p) => {
    const s = stock.find(x => x.warehouse_id === wh.id && x.product_id === p.id);
    const q = s ? s.qty : 0;
    const low = q <= (s?.reorder_point || 0);
    return { s, html: `<td class="num"><span class="stock-pill ${low ? 'stock-low' : 'stock-ok'}">${q}</span></td>` };
  };
  shell('/app/warehouses', `
    ${pageHead('Warehouses & Stock', 'Live stock levels and replenishment — the auto-split engine minimizes shipments',
      canEdit ? '<button class="btn btn-primary" id="addWH">+ Warehouse</button><button class="btn btn-ghost" id="restock">📥 Restock</button>' : '')}
    <div class="kpis">${warehouses.map(w => `
      <div class="kpi"><div class="k-label">${esc(w.name)} · ${w.code}</div>
      <div class="k-value">${stock.filter(s => s.warehouse_id === w.id).reduce((a, s) => a + s.qty, 0)} <span class="small muted" style="font-size:.9rem">units</span></div>
      <div class="k-sub">ship cost weight ×${w.shipping_cost_weight} · ${esc(w.address || '')}</div></div>`).join('')}
    </div>
    <div class="card mt16" style="padding:0;overflow:auto">
      <table class="tbl"><thead><tr><th>Product</th>${warehouses.map(w => `<th class="num">${esc(w.code)}</th>`).join('')}<th class="num">Total</th></tr></thead>
      <tbody>${stocked.map(p => {
        const total = warehouses.reduce((a, w) => a + (stock.find(s => s.warehouse_id === w.id && s.product_id === p.id)?.qty || 0), 0);
        return `<tr><td><b>${esc(p.name)}</b></td>${warehouses.map(w => cell(w, p).html).join('')}<td class="num"><b>${total}</b></td></tr>`;
      }).join('')}</tbody></table>
    </div>
    ${canEdit ? `<p class="small muted mt8">Stock below reorder point shows red. Use 📥 Restock to simulate inbound inventory — open orders with backorders will offer consolidation.</p>` : ''}`);

  if (canEdit) {
    document.getElementById('addWH').onclick = () => {
      const m = modal('New warehouse', `
        <div class="row"><div style="flex:1"><label>Name</label><input id="wh-name" placeholder="North Depot"></div><div style="width:120px"><label>Code</label><input id="wh-code" placeholder="WH-N"></div></div>
        <div class="row"><div style="flex:1"><label>Shipping cost weight (lower = cheaper)</label><input id="wh-w" type="number" step="0.1" value="1.0"></div><div style="flex:1"><label>Address</label><input id="wh-addr"></div></div>`,
        `<button class="btn btn-ghost" data-x2>Cancel</button><button class="btn btn-primary" id="wh-save">Create</button>`);
      m.querySelector('[data-x2]').onclick = () => m.remove();
      m.querySelector('#wh-save').onclick = async () => {
        try { await api('POST', '/warehouses', { name: val('wh-name'), code: val('wh-code'), shipping_cost_weight: +val('wh-w'), address: val('wh-addr') }); m.remove(); toast('Warehouse created', 'success'); render(); } catch (e) { toast(e.message, 'error'); }
      };
    };
    document.getElementById('restock').onclick = () => {
      const m = modal('📥 Restock warehouse', `
        <label>Warehouse</label><select id="rs-wh">${warehouses.map(w => `<option value="${w.id}">${esc(w.name)}</option>`).join('')}</select>
        <label>Product</label><select id="rs-p">${stocked.map(p => `<option value="${p.id}">${esc(p.name)}</option>`).join('')}</select>
        <label>Quantity received</label><input id="rs-q" type="number" value="10">`,
        `<button class="btn btn-ghost" data-x2>Cancel</button><button class="btn btn-primary" id="rs-save">Receive stock</button>`);
      m.querySelector('[data-x2]').onclick = () => m.remove();
      m.querySelector('#rs-save').onclick = async () => {
        try { await api('POST', `/warehouses/${+val('rs-wh')}/restock`, { product_id: +val('rs-p'), qty: +val('rs-q') }); m.remove(); toast('Stock received 📦', 'success'); render(); } catch (e) { toast(e.message, 'error'); }
      };
    };
  }
});

/* ============ subscription plans ============ */
route(/^\/app\/subscriptions$/, async () => {
  const u = await boot(); if (!requireUser()) return;
  const { plans, product_plans } = await api('GET', '/plans');
  const isAdmin = u.role === 'admin';
  shell('/app/subscriptions', `
    ${pageHead('Subscription Plans', 'Recurring plans with proration and cancellation policies', isAdmin ? '<button class="btn btn-primary" id="addPlan">+ New plan</button>' : '')}
    <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(280px,1fr))">
      ${plans.map(pl => `<div class="card">
        <div class="row-between"><h3>${esc(pl.name)}</h3><span class="badge b-sent">${pl.billing_period}</span></div>
        <div class="small muted mt8">Proration: <b>${pl.proration_rule === 'daily' ? 'Daily proration' : 'None'}</b></div>
        <div class="small muted">Cancellation: <b>${pl.cancellation_policy.replace('_', ' ')}${pl.cancellation_policy === 'refund_pct' ? ` (${pl.refund_pct}%)` : ''}</b></div>
        <div class="small muted">Notice period: <b>${pl.notice_days} days</b></div>
      </div>`).join('')}
    </div>
    <div class="card mt16" style="padding:0">
      <table class="tbl"><thead><tr><th>Subscription product</th><th>Attached plan</th><th class="num">Recurring price</th></tr></thead>
      <tbody>${product_plans.map(pp => `<tr><td><b>${esc(pp.product_name)}</b></td><td>${esc(pp.plan_name)}</td><td class="num"><b>${fmtMoney(pp.recurring_price)}</b> / cycle</td></tr>`).join('')}</tbody></table>
    </div>`);
  if (isAdmin) {
    document.getElementById('addPlan').onclick = () => {
      const m = modal('New subscription plan', `
        <label>Plan name</label><input id="pln-name">
        <div class="row"><div style="flex:1"><label>Billing period</label><select id="pln-per"><option>monthly</option><option>quarterly</option><option>yearly</option></select></div>
        <div style="flex:1"><label>Proration</label><select id="pln-pro"><option value="daily">Daily</option><option value="none">None</option></select></div></div>
        <div class="row"><div style="flex:1"><label>Cancellation policy</label><select id="pln-can"><option value="refund_prorated">Refund prorated</option><option value="refund_pct">Refund %</option><option value="none">No refund</option></select></div>
        <div style="flex:1"><label>Refund %</label><input id="pln-ref" type="number" value="70"></div>
        <div style="flex:1"><label>Notice days</label><input id="pln-notice" type="number" value="7"></div></div>`,
        `<button class="btn btn-ghost" data-x2>Cancel</button><button class="btn btn-primary" id="pln-save">Create</button>`);
      m.querySelector('[data-x2]').onclick = () => m.remove();
      m.querySelector('#pln-save').onclick = async () => {
        try { await api('POST', '/plans', { name: val('pln-name'), billing_period: val('pln-per'), proration_rule: val('pln-pro'), cancellation_policy: val('pln-can'), refund_pct: +val('pln-ref'), notice_days: +val('pln-notice') }); m.remove(); toast('Plan created', 'success'); render(); } catch (e) { toast(e.message, 'error'); }
      };
    };
  }
});

/* ============ upsell rules ============ */
route(/^\/app\/upsell$/, async () => {
  const u = await boot(); if (!requireUser()) return;
  const { rules } = await api('GET', '/upsell-rules');
  const { products } = await api('GET', '/products');
  const { settings } = await api('GET', '/settings');
  const canEdit = ['admin', 'manager'].includes(u.role);
  shell('/app/upsell', `
    ${pageHead('Upsell & Cross-Sell Rules', `Ranked from co-purchase history + promotions · suggestions below ${settings.min_margin_pct}% margin are hidden`,
      canEdit ? '<button class="btn btn-primary" id="addR">+ New pairing</button>' : '')}
    <div class="card" style="padding:0">
      <table class="tbl"><thead><tr><th>When rep adds…</th><th>Suggest…</th><th class="num">Co-purchase score</th><th>Source</th>${canEdit ? '<th></th>' : ''}</tr></thead>
      <tbody>${rules.map(r => `<tr>
        <td><b>${esc(r.trigger_name)}</b></td><td>${esc(r.suggested_name)}</td>
        <td class="num"><b>${(r.co_score * 100).toFixed(0)}%</b></td>
        <td><span class="badge b-draft">${r.source}</span></td>
        ${canEdit ? `<td class="row"><button class="btn btn-ghost btn-sm" onclick="toggleR(${r.id},${r.active ? 0 : 1})">${r.active ? 'Disable' : 'Enable'}</button><button class="btn btn-danger btn-sm" onclick="delR(${r.id})">✕</button></td>` : ''}
      </tr>`).join('')}</tbody></table>
    </div>`);
  if (canEdit) {
    window.toggleR = async (id, active) => { await api('PUT', `/upsell-rules/${id}`, { active }); render(); };
    window.delR = async (id) => { await api('DELETE', `/upsell-rules/${id}`); toast('Removed', 'success'); render(); };
    document.getElementById('addR').onclick = () => {
      const m = modal('New product pairing', `
        <label>Trigger product (already in cart)</label><select id="up-t">${products.map(p => `<option value="${p.id}">${esc(p.name)}</option>`).join('')}</select>
        <label>Suggested product</label><select id="up-s">${products.map(p => `<option value="${p.id}">${esc(p.name)}</option>`).join('')}</select>
        <label>Co-purchase score (0–1)</label><input id="up-c" type="number" step="0.01" value="0.7">`,
        `<button class="btn btn-ghost" data-x2>Cancel</button><button class="btn btn-primary" id="up-save">Create</button>`);
      m.querySelector('[data-x2]').onclick = () => m.remove();
      m.querySelector('#up-save').onclick = async () => {
        try { await api('POST', '/upsell-rules', { trigger_product_id: +val('up-t'), suggested_product_id: +val('up-s'), co_score: +val('up-c'), source: 'manual' }); m.remove(); toast('Pairing created', 'success'); render(); } catch (e) { toast(e.message, 'error'); }
      };
    };
  }
});


