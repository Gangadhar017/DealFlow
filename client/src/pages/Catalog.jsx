import React, { useEffect, useState } from 'react';
import { api, fmtMoney, fmtPct } from '../api';
import ListView from '../components/ListView';
import { Pill, Modal, useToast } from '../components/ui';
import { useAuth } from '../auth';

/* ============================================================ PRODUCTS */
export function Products() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [data, setData] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const canEdit = user.role === 'admin';

  const load = () => api.get('/products').then(setData).catch((e) => toast(e.message, 'err'));
  useEffect(() => { load(); }, []);
  if (!data) return <div className="page-loading">Loading products…</div>;

  const toggle = async (p, field, value) => {
    try { await api.put(`/products/${p.id}`, { [field]: value }); load(); } catch (e) { toast(e.message, 'err'); }
  };

  return (
    <>
      <div className="kpi-chips">
        <div className="kpi-chip" style={{ background: '#4C689E' }}><span className="cnt">{data.products.filter((p) => p.product_type === 'one_time' && p.stocked).length}</span> Goods</div>
        <div className="kpi-chip" style={{ background: '#7A6DAE' }}><span className="cnt">{data.products.filter((p) => p.product_type === 'one_time' && !p.stocked).length}</span> Services</div>
        <div className="kpi-chip" style={{ background: '#0F7B3D' }}><span className="cnt">{data.products.filter((p) => p.product_type === 'subscription').length}</span> Subscriptions</div>
        <div className="kpi-summary"><div><b>{data.products.filter((p) => p.promoted).length} promoted</b><span className="up">+0.15 upsell score boost</span></div></div>
      </div>
      <ListView
        rows={data.products}
        searchKeys={['name', 'sku', 'category_name', 'description']}
        actions={canEdit && <button className="btn-new" onClick={() => setShowNew(true)}>＋ New</button>}
        columns={[
          { key: 'name', label: 'Product', link: true, render: (p) => <><b>{p.name}</b>{p.promoted && <span className="promo-tag" style={{ marginLeft: 8 }}>promoted</span>}{!p.active && <span className="pill" style={{ marginLeft: 8, background: '#EEE', color: '#777' }}>archived</span>}</> },
          { key: 'sku', label: 'SKU', width: 100 },
          { key: 'category_name', label: 'Category', width: 120 },
          { key: 'product_type', label: 'Type', width: 110, render: (p) => p.product_type === 'subscription' ? <span className="pill" style={{ background: '#E5F0F0', color: '#017E84' }}>recurring</span> : p.stocked ? 'stocked' : 'service' },
          { key: 'base_price', label: 'Price', num: true, render: (p) => p.product_type === 'subscription' ? '—' : fmtMoney(p.base_price) },
          { key: 'cost_price', label: 'Cost', num: true, render: (p) => fmtMoney(p.cost_price) },
          { key: 'margin', label: 'Margin', num: true, sort: false, render: (p) => p.base_price > 0 ? fmtPct((p.base_price - p.cost_price) / p.base_price * 100) : '—' },
          { key: 'discount_ceiling', label: 'Disc. ceiling', num: true, render: (p) => `${p.discount_ceiling}%` },
          { key: 'variants', label: 'Variants', sort: false, width: 90, render: (p) => data.variants.filter((v) => v.product_id === p.id).length || '—' },
          ...(canEdit ? [{ key: '_act', label: '', sort: false, render: (p) => (
            <button className="btn sm" onClick={() => toggle(p, 'promoted', p.promoted ? 0 : 1)}>{p.promoted ? 'Unpromote' : 'Promote'}</button>
          ) }] : []),
        ]}
      />
      {showNew && <ProductModal categories={data.products} onClose={() => setShowNew(false)} reload={load} />}
    </>
  );
}

function ProductModal({ onClose, reload }) {
  const { toast } = useToast();
  const [f, setF] = useState({ name: '', sku: '', category_id: '', product_type: 'one_time', base_price: '', cost_price: '', tax_rate: 8, description: '' });
  const [cats, setCats] = useState([]);
  useEffect(() => { api.get('/categories').then((r) => setCats(r.categories)); }, []);
  const save = async () => {
    try {
      await api.post('/products', { ...f, category_id: Number(f.category_id), base_price: Number(f.base_price || 0), cost_price: Number(f.cost_price || 0), stocked: f.product_type === 'one_time' ? 1 : 0 });
      toast('Product created', 'ok'); reload(); onClose();
    } catch (e) { toast(e.message, 'err'); }
  };
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  return (
    <Modal title="New product" onClose={onClose} wide
      footer={<><button className="btn" onClick={onClose}>Cancel</button><button className="btn primary" disabled={!f.name || !f.sku || !f.category_id} onClick={save}>Create</button></>}>
      <div className="grid2">
        <div className="field"><label className="f">Name</label><input className="f" value={f.name} onChange={(e) => set('name', e.target.value)} /></div>
        <div className="field"><label className="f">SKU</label><input className="f" value={f.sku} onChange={(e) => set('sku', e.target.value)} placeholder="LP-16" /></div>
      </div>
      <div className="grid3">
        <div className="field"><label className="f">Category</label>
          <select className="f" value={f.category_id} onChange={(e) => set('category_id', e.target.value)}>
            <option value="">Select…</option>
            {cats.map((c) => <option key={c.id} value={c.id}>{c.name} (ceiling {c.discount_ceiling}%)</option>)}
          </select>
        </div>
        <div className="field"><label className="f">Type</label>
          <select className="f" value={f.product_type} onChange={(e) => set('product_type', e.target.value)}>
            <option value="one_time">One-time</option>
            <option value="subscription">Subscription</option>
          </select>
        </div>
        <div className="field"><label className="f">Tax %</label><input className="f" type="number" value={f.tax_rate} onChange={(e) => set('tax_rate', Number(e.target.value))} /></div>
      </div>
      <div className="grid2">
        <div className="field"><label className="f">Base price</label><input className="f" type="number" value={f.base_price} onChange={(e) => set('base_price', e.target.value)} /></div>
        <div className="field"><label className="f">Cost price</label><input className="f" type="number" value={f.cost_price} onChange={(e) => set('cost_price', e.target.value)} /></div>
      </div>
      <div className="field"><label className="f">Description</label><textarea className="f" rows={2} value={f.description} onChange={(e) => set('description', e.target.value)} /></div>
    </Modal>
  );
}

/* ============================================================ PRICELISTS */
export function Pricelists() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [pls, setPls] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const canEdit = user.role === 'admin';
  const load = () => api.get('/price-lists').then((r) => setPls(r.price_lists)).catch((e) => toast(e.message, 'err'));
  useEffect(() => { load(); }, []);
  if (!pls) return <div className="page-loading">Loading pricelists…</div>;

  return (
    <>
      <div className="breadcrumbs">Products ‣ Configuration <b>Pricelists</b></div>
      <div className="ctrl-bar">
        <span className="page-title">Tier pricing — applied to <b>one-time</b> products at quotation build time</span>
        <div style={{ flex: 1 }} />
        {canEdit && <button className="btn-new" onClick={() => setShowNew(true)}>＋ New</button>}
      </div>
      <ListView
        rows={pls}
        searchKeys={['name', 'customer_tier', 'currency']}
        columns={[
          { key: 'name', label: 'Pricelist', link: true },
          { key: 'customer_tier', label: 'Customer tier', render: (p) => <Pill status={`tier-${p.customer_tier}`} label={p.customer_tier} /> },
          { key: 'currency', label: 'Currency', width: 90 },
          { key: 'rule_type', label: 'Rule', render: (p) => p.rule_type === 'discount' ? 'Discount %' : 'Markup %' },
          { key: 'value', label: 'Value', num: true, render: (p) => `${p.value}%` },
          { key: 'active', label: 'Status', render: (p) => <Pill status={p.active ? 'fulfilled' : 'cancelled'} label={p.active ? 'active' : 'off'} /> },
          ...(canEdit ? [{ key: '_act', label: '', sort: false, render: (p) => (
            <button className="btn sm danger" onClick={async () => { if (confirm(`Delete ${p.name}?`)) { await api.del(`/price-lists/${p.id}`); load(); } }}>Delete</button>
          ) }] : []),
        ]}
      />
      {showNew && (
        <PLModal onClose={() => setShowNew(false)} reload={load} />
      )}
    </>
  );
}
function PLModal({ onClose, reload }) {
  const { toast } = useToast();
  const [f, setF] = useState({ name: '', customer_tier: 'gold', currency: 'USD', rule_type: 'discount', value: 5 });
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const save = async () => {
    try { await api.post('/price-lists', f); toast('Pricelist created', 'ok'); reload(); onClose(); }
    catch (e) { toast(e.message, 'err'); }
  };
  return (
    <Modal title="New pricelist" onClose={onClose}
      footer={<><button className="btn" onClick={onClose}>Cancel</button><button className="btn primary" disabled={!f.name} onClick={save}>Create</button></>}>
      <div className="field"><label className="f">Name</label><input className="f" value={f.name} onChange={(e) => set('name', e.target.value)} /></div>
      <div className="grid3">
        <div className="field"><label className="f">Tier</label>
          <select className="f" value={f.customer_tier} onChange={(e) => set('customer_tier', e.target.value)}>
            <option>gold</option><option>silver</option><option>bronze</option>
          </select>
        </div>
        <div className="field"><label className="f">Currency</label>
          <select className="f" value={f.currency} onChange={(e) => set('currency', e.target.value)}><option>USD</option><option>INR</option></select>
        </div>
        <div className="field"><label className="f">Value %</label><input className="f" type="number" value={f.value} onChange={(e) => set('value', Number(e.target.value))} /></div>
      </div>
      <div className="field"><label className="f">Rule</label>
        <select className="f" value={f.rule_type} onChange={(e) => set('rule_type', e.target.value)}>
          <option value="discount">Discount from list</option><option value="markup">Markup on list</option>
        </select>
      </div>
    </Modal>
  );
}

/* ============================================================ GOVERNANCE (discount tiers + approval rules) */
export function Governance() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [data, setData] = useState(null);
  const canEdit = user.role === 'admin';
  const load = () => api.get('/governance').then(setData).catch((e) => toast(e.message, 'err'));
  useEffect(() => { load(); }, []);
  if (!data) return <div className="page-loading">Loading governance…</div>;

  const saveTier = async (tier, val) => {
    try { await api.put(`/discount-tiers/${tier}`, { max_discount_pct: Number(val) }); toast('Ceiling updated', 'ok'); load(); } catch (e) { toast(e.message, 'err'); }
  };
  const delRule = async (id) => {
    if (!confirm('Delete rule?')) return;
    try { await api.del(`/approval-rules/${id}`); load(); } catch (e) { toast(e.message, 'err'); }
  };
  const toggleRule = async (r) => {
    try { await api.put(`/approval-rules/${r.id}`, { active: r.active ? 0 : 1 }); load(); } catch (e) { toast(e.message, 'err'); }
  };

  return (
    <>
      <div className="breadcrumbs">Products ‣ Configuration <b>Discount Governance</b></div>
      <div className="settings-section">
        <h2>Customer-tier discount ceilings</h2>
        <div className="desc">Per-line discount = min(tier ceiling, category ceiling). Effective discount is line + compounded order discount.</div>
        {data.discount_tiers.map((t) => (
          <div className="setting-row" key={t.customer_tier}>
            <div className="lbl"><b style={{ textTransform: 'capitalize' }}>{t.customer_tier} customers</b><span>max allowed discount before violations accrue</span></div>
            <div className="ctl" style={{ display: 'flex', gap: 6 }}>
              <input className="f" type="number" defaultValue={t.max_discount_pct} disabled={!canEdit} id={`tier-${t.customer_tier}`} />
              {canEdit && <button className="btn sm" onClick={() => saveTier(t.customer_tier, document.getElementById(`tier-${t.customer_tier}`).value)}>Save</button>}
            </div>
          </div>
        ))}
      </div>
      <div className="settings-section">
        <h2>Approval routing rules</h2>
        <div className="desc">Blended risk = worst-line violation + 50% of remaining overage. Rules route quotations to manager/finance in sequence.</div>
        <ListView
          rows={data.approval_rules}
          searchKeys={['name', 'level']}
          columns={[
            { key: 'name', label: 'Rule', link: true },
            { key: 'level', label: 'Approver', render: (r) => <b style={{ textTransform: 'capitalize' }}>{r.level}</b> },
            { key: 'sequence', label: 'Step', num: true },
            { key: 'risk_min', label: 'Risk min', num: true },
            { key: 'risk_max', label: 'Risk max', num: true },
            { key: 'any_line_over', label: 'Hard cap (any line >)', num: true, render: (r) => r.any_line_over != null ? `${r.any_line_over}%` : '—' },
            { key: 'active', label: 'Status', render: (r) => <Pill status={r.active ? 'fulfilled' : 'cancelled'} label={r.active ? 'active' : 'off'} /> },
            ...(canEdit ? [{ key: '_act', label: '', sort: false, render: (r) => (
              <span style={{ display: 'flex', gap: 6 }}>
                <button className="btn sm" onClick={() => toggleRule(r)}>{r.active ? 'Disable' : 'Enable'}</button>
                <button className="btn sm danger" onClick={() => delRule(r.id)}>Delete</button>
              </span>
            ) }] : []),
          ]}
        />
      </div>
    </>
  );
}

/* ============================================================ SUBSCRIPTION PLANS */
export function Plans() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [data, setData] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const canEdit = user.role === 'admin';
  const load = () => api.get('/plans').then(setData).catch((e) => toast(e.message, 'err'));
  useEffect(() => { load(); }, []);
  if (!data) return <div className="page-loading">Loading plans…</div>;

  return (
    <>
      <div className="breadcrumbs">Products ‣ Configuration <b>Subscription Plans</b></div>
      <div className="ctrl-bar">
        <span className="page-title">Billing cycles, <b>daily proration</b> & cancellation policies</span>
        <div style={{ flex: 1 }} />
        {canEdit && <button className="btn-new" onClick={() => setShowNew(true)}>＋ New plan</button>}
      </div>
      <ListView
        rows={data.plans}
        searchKeys={['name', 'billing_period', 'cancellation_policy']}
        columns={[
          { key: 'name', label: 'Plan', link: true },
          { key: 'billing_period', label: 'Cycle', render: (p) => <span style={{ textTransform: 'capitalize' }}>{p.billing_period}</span> },
          { key: 'proration_rule', label: 'Proration', render: (p) => p.proration_rule === 'daily' ? 'Daily' : 'None' },
          { key: 'cancellation_policy', label: 'Cancellation', render: (p) => p.cancellation_policy === 'refund_prorated' ? 'Prorated refund' : p.cancellation_policy === 'refund_pct' ? `${p.refund_pct}% refund` : 'No refund' },
          { key: 'notice_days', label: 'Notice days', num: true },
          { key: 'active', label: 'Status', render: (p) => <Pill status={p.active ? 'fulfilled' : 'cancelled'} label={p.active ? 'active' : 'off'} /> },
        ]}
      />
      <div className="card pad" style={{ marginTop: 4 }}>
        <h3>Product ↔ plan bindings</h3>
        <table className="list">
          <thead><tr><th>Product</th><th>Plan</th><th className="num">Recurring price</th></tr></thead>
          <tbody>
            {data.product_plans.map((pp) => (
              <tr key={pp.id}><td>{pp.product_name}</td><td>{pp.plan_name}</td><td className="num"><b>{fmtMoney(pp.recurring_price)}</b></td></tr>
            ))}
          </tbody>
        </table>
      </div>
      {showNew && <PlanModal onClose={() => setShowNew(false)} reload={load} />}
    </>
  );
}
function PlanModal({ onClose, reload }) {
  const { toast } = useToast();
  const [f, setF] = useState({ name: '', billing_period: 'monthly', proration_rule: 'daily', cancellation_policy: 'refund_prorated', refund_pct: 0, notice_days: 0 });
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const save = async () => {
    try { await api.post('/plans', f); toast('Plan created', 'ok'); reload(); onClose(); }
    catch (e) { toast(e.message, 'err'); }
  };
  return (
    <Modal title="New subscription plan" onClose={onClose}
      footer={<><button className="btn" onClick={onClose}>Cancel</button><button className="btn primary" disabled={!f.name} onClick={save}>Create</button></>}>
      <div className="field"><label className="f">Plan name</label><input className="f" value={f.name} onChange={(e) => set('name', e.target.value)} /></div>
      <div className="grid3">
        <div className="field"><label className="f">Billing</label>
          <select className="f" value={f.billing_period} onChange={(e) => set('billing_period', e.target.value)}>
            <option value="monthly">Monthly</option><option value="quarterly">Quarterly</option><option value="yearly">Yearly</option>
          </select>
        </div>
        <div className="field"><label className="f">Proration</label>
          <select className="f" value={f.proration_rule} onChange={(e) => set('proration_rule', e.target.value)}>
            <option value="daily">Daily</option><option value="none">None</option>
          </select>
        </div>
        <div className="field"><label className="f">Notice days</label><input className="f" type="number" value={f.notice_days} onChange={(e) => set('notice_days', Number(e.target.value))} /></div>
      </div>
      <div className="grid2">
        <div className="field"><label className="f">Cancellation policy</label>
          <select className="f" value={f.cancellation_policy} onChange={(e) => set('cancellation_policy', e.target.value)}>
            <option value="refund_prorated">Prorated refund</option>
            <option value="refund_pct">% refund</option>
            <option value="none">No refund</option>
          </select>
        </div>
        {f.cancellation_policy === 'refund_pct' && (
          <div className="field"><label className="f">Refund %</label><input className="f" type="number" value={f.refund_pct} onChange={(e) => set('refund_pct', Number(e.target.value))} /></div>
        )}
      </div>
    </Modal>
  );
}

/* ============================================================ UPSELL RULES */
export function Upsell() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [data, setData] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const canEdit = ['admin', 'manager'].includes(user.role);
  const load = () => api.get('/upsell-rules').then(setData).catch((e) => toast(e.message, 'err'));
  useEffect(() => { load(); }, []);
  if (!data) return <div className="page-loading">Loading upsell rules…</div>;

  return (
    <>
      <div className="breadcrumbs">Products ‣ Configuration <b>Upsell Rules</b></div>
      <div className="ctrl-bar">
        <span className="page-title">Co-purchase engine — <b>score + 0.15</b> boost for promoted products</span>
        <div style={{ flex: 1 }} />
        {canEdit && <button className="btn-new" onClick={() => setShowNew(true)}>＋ New rule</button>}
      </div>
      <ListView
        rows={data.rules}
        searchKeys={['trigger_name', 'suggested_name', 'source']}
        columns={[
          { key: 'trigger_name', label: 'When cart has…' },
          { key: 'suggested_name', label: 'Suggest' },
          { key: 'co_score', label: 'Co-score', num: true, render: (r) => <b>{r.co_score.toFixed(2)}</b> },
          { key: 'source', label: 'Source', render: (r) => <span className="pill" style={{ background: '#EDEFF2', color: '#5F6B7A' }}>{r.source}</span> },
          { key: 'active', label: 'Status', render: (r) => <Pill status={r.active ? 'fulfilled' : 'cancelled'} label={r.active ? 'active' : 'off'} /> },
          ...(canEdit ? [{ key: '_act', label: '', sort: false, render: (r) => (
            <span style={{ display: 'flex', gap: 6 }}>
              <button className="btn sm" onClick={async () => { await api.put(`/upsell-rules/${r.id}`, { active: r.active ? 0 : 1 }); load(); }}>{r.active ? 'Disable' : 'Enable'}</button>
              <button className="btn sm danger" onClick={async () => { if (confirm('Delete rule?')) { await api.del(`/upsell-rules/${r.id}`); load(); } }}>Delete</button>
            </span>
          ) }] : []),
        ]}
      />
      {showNew && <UpsellModal onClose={() => setShowNew(false)} reload={load} />}
    </>
  );
}
function UpsellModal({ onClose, reload }) {
  const { toast } = useToast();
  const [products, setProducts] = useState([]);
  const [f, setF] = useState({ trigger_product_id: '', suggested_product_id: '', co_score: 0.5 });
  useEffect(() => { api.get('/products').then((r) => setProducts(r.products.filter((p) => p.active))); }, []);
  const save = async () => {
    try {
      await api.post('/upsell-rules', { trigger_product_id: Number(f.trigger_product_id), suggested_product_id: Number(f.suggested_product_id), co_score: Number(f.co_score), source: 'manual' });
      toast('Rule created', 'ok'); reload(); onClose();
    } catch (e) { toast(e.message, 'err'); }
  };
  return (
    <Modal title="New upsell rule" onClose={onClose}
      footer={<><button className="btn" onClick={onClose}>Cancel</button><button className="btn primary" disabled={!f.trigger_product_id || !f.suggested_product_id} onClick={save}>Create</button></>}>
      <div className="field"><label className="f">Trigger product (in cart)</label>
        <select className="f" value={f.trigger_product_id} onChange={(e) => setF({ ...f, trigger_product_id: e.target.value })}>
          <option value="">Select…</option>
          {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>
      <div className="field"><label className="f">Suggested product</label>
        <select className="f" value={f.suggested_product_id} onChange={(e) => setF({ ...f, suggested_product_id: e.target.value })}>
          <option value="">Select…</option>
          {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>
      <div className="field"><label className="f">Co-purchase score (0–1)</label><input className="f" type="number" step="0.01" min="0" max="1" value={f.co_score} onChange={(e) => setF({ ...f, co_score: e.target.value })} /></div>
    </Modal>
  );
}
