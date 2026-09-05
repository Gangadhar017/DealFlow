import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { api, fmtMoney, fmtDate } from '../api';
import { Pill, useToast } from '../components/ui';

/* Customer-facing portal — magic link /#/portal/q/QT-XXXX?k=token (no login needed) */
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
      api.get('/portal/demo-quotes').then((r) => setDemoQuotes(r.quotes || [])).catch(() => {});
    }
  }, [number, key]);

  /* ---------- landing: pick a live quote (demo convenience) ---------- */
  if (!number || !key) {
    return (
      <div className="portal-shell">
        <div className="portal-hero">
          <div className="portal-brand"><span className="p-logo">D</span> DealFlow360</div>
          <h1 style={{ margin: '14px 0 6px' }}>Customer Negotiation Portal</h1>
          <p>Live B2B quotes you can view, question and counter-offer — no email chains, no static PDFs. Confirm in one click.</p>
        </div>
        <div className="card pad" style={{ maxWidth: 780, margin: '0 auto' }}>
          <h3 style={{ marginBottom: 14 }}>Select an active quotation to negotiate</h3>
          <div style={{ display: 'grid', gap: 12 }}>
            {demoQuotes.map((q) => (
              <div key={q.number} className="portal-quote-row">
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                    <b style={{ fontSize: 16 }}>{q.number}</b>
                    <Pill status={q.status} />
                    <span className="tier-chip">{q.customer_tier} partner</span>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 5 }}>
                    {q.customer_name} — <b style={{ color: 'var(--text)' }}>{fmtMoney(q.total, q.currency)}</b>
                  </div>
                </div>
                <button className="btn-new" onClick={() => nav(`/portal/q/${q.number}?k=${q.portal_token}`)}>
                  Open negotiation →
                </button>
              </div>
            ))}
            {demoQuotes.length === 0 && <div className="empty-state">Loading available quotations…</div>}
          </div>
          <div style={{ marginTop: 22, textAlign: 'center' }}>
            <button className="btn" onClick={() => nav('/')}>← Back to Sales Management</button>
          </div>
        </div>
      </div>
    );
  }
  if (err) {
    return (
      <div className="portal-shell">
        <div className="card pad" style={{ maxWidth: 560, margin: '50px auto', textAlign: 'center' }}>
          <div style={{ fontSize: 40 }}>🔒</div>
          <h3 style={{ margin: '8px 0' }}>Unable to open quotation</h3>
          <p style={{ color: 'var(--muted)' }}>{err}</p>
          <button className="btn" onClick={() => nav('/portal')}>View demo quotes</button>
        </div>
      </div>
    );
  }
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
  const cur = quote.currency;

  return (
    <div className="portal-shell">
      {/* hero header */}
      <div className="portal-hero compact">
        <div className="portal-top">
          <div className="portal-brand"><span className="p-logo">D</span> DealFlow360</div>
          <div className="portal-meta">{quote.customer?.name} · <span className="tier-chip">{quote.customer?.tier} partner</span></div>
        </div>
        <div className="hero-main">
          <div>
            <div className="hero-kicker">QUOTATION</div>
            <h1 style={{ margin: '2px 0 8px', fontSize: 30 }}>{quote.number}</h1>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <Pill status={quote.status} />
              <span className="hero-fact">Created {fmtDate(quote.created_at)}</span>
              <span className="hero-fact">· Valid until <b>{fmtDate(quote.valid_until)}</b></span>
              <span className="hero-fact">· Delivery {fmtDate(quote.expected_delivery)}</span>
            </div>
          </div>
          {canConfirm && (
            <button className="btn-new btn-lg" onClick={() => post('confirm', {}, 'Quotation confirmed — thank you!')}>
              ✔ Confirm quotation
            </button>
          )}
        </div>
      </div>

      {/* lines + totals */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-head">Order lines</div>
        <table className="list portal-lines">
          <thead><tr><th>Product</th><th className="num">Qty</th><th className="num">Unit</th><th className="num">Discount</th><th className="num">Amount</th></tr></thead>
          <tbody>
            {quote.lines.map((l) => (
              <tr key={l.id}>
                <td data-label="Product"><b>{l.description}</b></td>
                <td className="num" data-label="Qty">{l.qty}</td>
                <td className="num" data-label="Unit">{fmtMoney(l.unit_price, cur)}</td>
                <td className="num" data-label="Discount">{l.effective_discount}%</td>
                <td className="num" data-label="Amount"><b>{fmtMoney(l.net, cur)}</b></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="portal-totals">
          <div className="t-row"><span>Subtotal</span><b>{fmtMoney(quote.subtotal, cur)}</b></div>
          <div className="t-row disc"><span>Discount</span><b>−{fmtMoney(quote.discount_total, cur)}</b></div>
          <div className="t-row"><span>Tax</span><b>{fmtMoney(quote.tax_total, cur)}</b></div>
          <div className="t-row grand"><span>Total ({cur})</span><b>{fmtMoney(quote.total, cur)}</b></div>
        </div>
      </div>

      {/* negotiation + invoices */}
      <div className="portal-grid">
        <div className="card pad">
          <h3 style={{ marginTop: 0 }}>💬 Questions & negotiation</h3>
          <div className="thread-scroll">
            {(quote.thread || []).map((n) => (
              <div key={n.id} className={`bubble ${n.user_id ? 'me' : 'them'}`}>
                <div className="b-head">
                  {n.staff_name || n.user_name || 'You'} · {n.kind}{n.proposed_discount != null && ` · ${n.proposed_discount}%`} · {fmtDate(n.created_at)}
                </div>
                {n.message}
                {n.proposed_discount != null && <div style={{ marginTop: 4 }}><b>Proposed discount: {n.proposed_discount}%</b></div>}
                {n.status !== 'open' && <div className={`b-status ${n.status}`}>● {n.status}</div>}
              </div>
            ))}
            {!(quote.thread || []).length && <div style={{ color: 'var(--muted)', fontSize: 13, padding: '10px 0' }}>No messages yet — ask us anything about this quote.</div>}
          </div>
          {canNegotiate ? (
            <>
              <div className="field"><label className="f">Message to your salesperson</label>
                <textarea className="f" rows={2} value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="e.g. Can you include onboarding at this price?" />
              </div>
              <div className="grid2">
                <div className="field"><label className="f">Counter-offer: discount %</label>
                  <input className="f" type="number" min="0" max="90" value={counter} onChange={(e) => setCounter(e.target.value)} placeholder="e.g. 18" />
                </div>
                <div className="field"><label className="f">Note with counter</label>
                  <input className="f" value={counterMsg} onChange={(e) => setCounterMsg(e.target.value)} placeholder="Competitor offered…" />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn primary" disabled={!msg} onClick={() => post('comment', { message: msg }, 'Message sent to your salesperson')}>Send message</button>
                <button className="btn" disabled={counter === ''} onClick={() => post('counter', { discount_pct: Number(counter), message: counterMsg }, `Counter-offer at ${counter}% sent`)}>Send counter-offer</button>
              </div>
              <div className="hint">💡 Confirming applies any open counter-offer automatically — terms above our approval ceilings go for a quick internal approval.</div>
            </>
          ) : (
            <div className="hint">Negotiation is closed for this quotation.</div>
          )}
        </div>

        <div className="card pad">
          <h3 style={{ marginTop: 0 }}>🧾 Invoices on this order</h3>
          <div className="inv-list">
            {quote.invoices.map((i) => (
              <div key={i.id} className="inv-row">
                <div className="inv-main">
                  <div className="inv-title">
                    <b>{i.number}</b>
                    <Pill status={i.status} />
                  </div>
                  <div className="inv-sub">
                    {i.kind === 'credit_note' ? 'Credit note' : i.kind === 'recurring' ? 'Recurring cycle' : 'One-time'} · due {fmtDate(i.due_date)}
                  </div>
                </div>
                <div className="inv-side">
                  <b className="inv-amt">{fmtMoney(i.amount, cur)}</b>
                  <a className="btn sm inv-dl" href={`/api/portal/quote/${number}/invoice/${i.id}/pdf${key ? `?k=${key}` : ''}`} target="_blank" rel="noreferrer">⬇ PDF</a>
                </div>
              </div>
            ))}
            {!quote.invoices.length && <div className="hint" style={{ marginTop: 0 }}>Invoices appear after you confirm the quotation.</div>}
          </div>
          <div className="hint" style={{ marginTop: 12 }}>
            Access: {via === 'magic' ? 'secure magic link (this quotation only)' : 'your customer account'} — you only ever see your own company's documents.
          </div>
        </div>
      </div>
    </div>
  );
}
