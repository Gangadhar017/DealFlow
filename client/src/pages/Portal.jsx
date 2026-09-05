import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { api, fmtMoney, fmtDate, fmtPct } from '../api';
import { Pill, useToast } from '../components/ui';

/* Customer-facing portal — reachable via magic link /#/portal/q/QT-XXXX?k=token (no login needed) */
export default function Portal() {
  const { number } = useParams();
  const [params] = useSearchParams();
  const nav = useNavigate();
  const key = params.get('k');
  const { toast } = useToast();
  const [quote, setQuote] = useState(null);
  const [via, setVia] = useState('');
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [counter, setCounter] = useState('');
  const [counterMsg, setCounterMsg] = useState('');
  const [demoQuotes, setDemoQuotes] = useState([]);

  const load = () => api.get(`/portal/quote/${number}?k=${key}`).then((r) => { setQuote(r.quote); setVia(r.via); }).catch((e) => setErr(e.message));
  
  useEffect(() => { 
    if (number && key) load(); 
    else {
      api.get('/portal/demo-quotes')
        .then(r => setDemoQuotes(r.quotes || []))
        .catch(() => {});
    }
  }, [number, key]);

  if (!number || !key) {
    return (
      <div className="portal-shell">
        <div className="card pad" style={{ maxWidth: 800, margin: '40px auto' }}>
          <div className="portal-brand" style={{ justifyContent: 'center', fontSize: 20 }}>
            <span className="avatar-sm"><span className="avatar-bg0" style={{ width: 34, height: 34, borderRadius: 8, display: 'grid', placeItems: 'center', color: '#fff', background: '#714B67', fontWeight: 800 }}>D</span></span> 
            DealFlow360 — Customer Negotiation Portal
          </div>
          <p style={{ textAlign: 'center', color: 'var(--muted)', margin: '14px 0 24px', fontSize: 14 }}>
            Experience self-governing B2B sales operations: live multi-tier discount negotiations, inline commentary, counter-offers, and instant quote confirmation.
          </p>

          <h3 style={{ borderBottom: '1px solid #E5E7EB', paddingBottom: 8, marginBottom: 16 }}>Select an active quotation to negotiate:</h3>
          
          <div style={{ display: 'grid', gap: 12 }}>
            {demoQuotes.map((q) => (
              <div key={q.number} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', border: '1px solid #E5E7EB', borderRadius: 8, background: '#F9FAFB', transition: 'all 0.2s' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <b style={{ fontSize: 16, color: '#1F2937' }}>{q.number}</b>
                    <Pill status={q.status} />
                    <span style={{ fontSize: 11, background: '#E5E7EB', padding: '2px 8px', borderRadius: 12, textTransform: 'capitalize' }}>
                      {q.customer_tier} partner
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: '#4B5563', marginTop: 4 }}>
                    {q.customer_name} — Total: <b style={{ color: '#111827' }}>{fmtMoney(q.total, q.currency)}</b>
                  </div>
                </div>
                <button 
                  className="btn primary"
                  onClick={() => nav(`/portal/q/${q.number}?k=${q.portal_token}`)}
                  style={{ cursor: 'pointer', padding: '8px 16px', fontWeight: 600 }}>
                  Open Negotiation Portal →
                </button>
              </div>
            ))}
            {demoQuotes.length === 0 && (
              <div style={{ textAlign: 'center', color: '#6B7280', padding: 20 }}>
                Loading available quotations...
              </div>
            )}
          </div>
          
          <div style={{ marginTop: 24, textAlign: 'center' }}>
            <button className="btn" onClick={() => nav('/')}>← Back to Sales Management</button>
          </div>
        </div>
      </div>
    );
  }
  if (err) return <div className="portal-shell"><div className="card pad" style={{ maxWidth: 600, margin: '40px auto', textAlign: 'center' }}><h3>⚠️ Error Loading Quote</h3><p>{err}</p><button className="btn" onClick={() => nav('/portal')}>View Demo Quotes</button></div></div>;
  if (!quote) return <div className="page-loading">Opening quotation…</div>;

  const post = async (action, body, okMsg) => {
    try {
      const r = await api.post(`/portal/quote/${number}/${action}?k=${key}`, body || {});
      toast(okMsg, 'ok');
      setQuote(r.quote); setMsg(''); setCounter(''); setCounterMsg('');
      if (r.re_approval && r.re_approval !== 'none') {
        toast('Your terms were sent for internal approval — we will notify you shortly', '');
      }
    } catch (e) { toast(e.message, 'err'); }
  };

  const canNegotiate = ['sent', 'negotiating'].includes(quote.status);
  const canConfirm = ['sent', 'negotiating', 'approved'].includes(quote.status);

  return (
    <div className="portal-shell">
      <div className="portal-top">
        <div className="portal-brand"><span className="avatar-sm"><span className="avatar-bg0" style={{ width: 30, height: 30, borderRadius: 8, display: 'grid', placeItems: 'center', color: '#fff', background: '#714B67', fontWeight: 800 }}>D</span></span> DealFlow360</div>
        <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>{quote.customer?.name} • {quote.customer?.tier} partner</div>
      </div>

      <div className="card pad" style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h2 style={{ margin: 0 }}>Quotation {quote.number} <Pill status={quote.status} /></h2>
            <div style={{ color: 'var(--muted)', fontSize: 12.5, marginTop: 4 }}>
              Created {fmtDate(quote.created_at)} • valid until <b>{fmtDate(quote.valid_until)}</b> • promised delivery {fmtDate(quote.expected_delivery)}
            </div>
          </div>
          {canConfirm && (
            <button className="btn-new" style={{ padding: '10px 22px' }} onClick={() => post('confirm', {}, 'Quotation confirmed — thank you!')}>
              ✓ Confirm quotation
            </button>
          )}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        <table className="list">
          <thead><tr>
            <th>Product</th><th className="num">Qty</th><th className="num">Unit</th>
            <th className="num">Discount</th><th className="num">Amount</th>
          </tr></thead>
          <tbody>
            {quote.lines.map((l) => (
              <tr key={l.id}>
                <td>{l.description}</td>
                <td className="num">{l.qty}</td>
                <td className="num">{fmtMoney(l.unit_price, quote.currency)}</td>
                <td className="num">{l.effective_discount}%</td>
                <td className="num"><b>{fmtMoney(l.net, quote.currency)}</b></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="total-band" style={{ margin: 14 }}>
          <div>
            <div className="sub">TOTAL • {quote.currency}</div>
            <div className="amt">{fmtMoney(quote.total, quote.currency)}</div>
          </div>
          <div style={{ textAlign: 'right', fontSize: 12.5, lineHeight: 1.8 }}>
            subtotal {fmtMoney(quote.subtotal, quote.currency)} • discount -{fmtMoney(quote.discount_total, quote.currency)} • tax {fmtMoney(quote.tax_total, quote.currency)}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, alignItems: 'start' }}>
        <div className="card pad">
          <h3>💬 Questions or requests</h3>
          <div style={{ maxHeight: 260, overflow: 'auto', marginBottom: 10 }}>
            {(quote.thread || []).map((m) => (
              <div key={m.id} className={`bubble ${m.user_id ? 'me' : 'them'}`}>
                <div style={{ fontSize: 11.5, color: 'var(--muted)', marginBottom: 3 }}>
                  {m.staff_name || m.user_name || 'You'} • {m.kind} • {fmtDateTime(m.created_at)}
                </div>
                {m.message}
                {m.proposed_discount != null && <div style={{ marginTop: 4 }}><b>Proposed discount: {m.proposed_discount}%</b></div>}
                {m.status !== 'open' && <div style={{ fontSize: 11.5, color: m.status === 'accepted' ? '#0F7B3D' : '#B3261E', marginTop: 4 }}>✓ {m.status}</div>}
              </div>
            ))}
            {!(quote.thread || []).length && <div style={{ color: 'var(--muted)', fontSize: 12.5 }}>No messages yet.</div>}
          </div>
          {canNegotiate ? (
            <>
              <div className="field">
                <label className="f">Message</label>
                <textarea className="f" rows={2} value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="e.g. Can you include onboarding at this price?" />
              </div>
              <div className="grid2">
                <div className="field">
                  <label className="f">Counter-offer: discount %</label>
                  <input className="f" type="number" min="0" max="90" value={counter} onChange={(e) => setCounter(e.target.value)} placeholder="e.g. 18" />
                </div>
                <div className="field">
                  <label className="f">Note with counter</label>
                  <input className="f" value={counterMsg} onChange={(e) => setCounterMsg(e.target.value)} placeholder="Competitor offered…" />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn primary" disabled={!msg} onClick={() => post('comment', { message: msg }, 'Message sent to your salesperson')}>
                  Send message
                </button>
                <button className="btn" disabled={counter === ''} onClick={() => post('counter', { discount_pct: Number(counter), message: counterMsg }, `Counter-offer at ${counter}% sent`)}>
                  Send counter-offer
                </button>
              </div>
            </>
          ) : (
            <div style={{ fontSize: 12.5, color: 'var(--muted)', fontStyle: 'italic' }}>Negotiation is closed for this quotation.</div>
          )}
        </div>

        <div className="card pad">
          <h3>📄 Invoices on this order</h3>
          <table className="list">
            <thead><tr>
              <th>Invoice</th><th>Type</th><th className="num">Amount</th><th>Status</th><th>Due</th>
            </tr></thead>
            <tbody>
              {quote.invoices.map((inv) => (
                <tr key={inv.id}>
                  <td>{inv.number}</td>
                  <td>{inv.kind === 'credit_note' ? 'credit note' : inv.kind}</td>
                  <td className="num">{fmtMoney(inv.amount, quote.currency)}</td>
                  <td><Pill status={inv.status} /></td>
                  <td>{fmtDate(inv.due_date)}</td>
                </tr>
              ))}
              {!quote.invoices.length && <tr><td colSpan={5} style={{ color: 'var(--muted)', fontSize: 12.5 }}>Invoices appear after confirmation.</td></tr>}
            </tbody>
          </table>
          <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 10 }}>
            Access: {via === 'magic' ? 'secure magic link (this quotation only)' : 'customer account'} • You only ever see your own company's documents.
          </div>
        </div>
      </div>
    </div>
  );
}
