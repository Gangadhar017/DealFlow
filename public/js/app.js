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


