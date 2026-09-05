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


