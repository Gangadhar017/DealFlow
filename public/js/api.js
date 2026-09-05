/* DealFlow360 — API client + shared state + formatters */
'use strict';
const S = { user: null, cache: {} };

async function api(method, path, body) {
  const res = await fetch('/api' + path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try { json = await res.json(); } catch { /* non-json (exports) */ }
  if (!res.ok) {
    const err = new Error(json?.error || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return json;
}

const fmtMoney = (v, cur = 'USD') => {
  const n = Number(v || 0);
  const sym = cur === 'INR' ? '₹' : '$';
  return sym + n.toLocaleString('en-US', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 });
};
const fmtPct = (v) => `${Number(v || 0).toFixed(1)}%`;
const fmtDate = (d) => d ? new Date(String(d).includes('T') ? d : d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const statusLabel = (s) => s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
const badge = (s) => `<span class="badge b-${esc(s)}">${statusLabel(s)}</span>`;
const initials = (name) => String(name || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

async function downloadExport(format, params) {
  const qs = new URLSearchParams({ format, ...Object.fromEntries(Object.entries(params || {}).filter(([, v]) => v !== '' && v != null)) });
  const res = await fetch(`/api/reports/export?${qs}`);
  if (!res.ok) { toast((await res.json()).error, 'error'); return; }
  const blob = await res.blob();
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `dealflow-report.${format}`;
  a.click();
  URL.revokeObjectURL(a.href);
}

/* ============ hash router (defined early; all view files register routes) ============ */
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
