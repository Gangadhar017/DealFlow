/* DealFlow360 — shared UI helpers: toast, modal, tiny canvas charts */
'use strict';

function toast(msg, kind = '') {
  const el = document.createElement('div');
  el.className = `toast ${kind}`;
  el.textContent = msg;
  document.getElementById('toasts').appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .3s'; setTimeout(() => el.remove(), 320); }, 3400);
}

function modal(title, bodyHTML, footHTML = '') {
  const back = document.createElement('div');
  back.className = 'modal-back';
  back.innerHTML = `<div class="modal">
    <div class="m-head"><h3>${title}</h3><button class="btn btn-ghost btn-sm" data-x>✕</button></div>
    <div class="m-body">${bodyHTML}</div>
    ${footHTML ? `<div class="m-foot">${footHTML}</div>` : ''}
  </div>`;
  back.querySelector('[data-x]').onclick = () => back.remove();
  back.addEventListener('mousedown', (e) => { if (e.target === back) back.remove(); });
  document.body.appendChild(back);
  return back;
}

const emptyState = (icon, text) => `<div class="empty"><div class="big">${icon}</div>${text}</div>`;

/* tiny bar chart (no libraries) */
function barChart(canvas, labels, values, { money = false, color = '#4f46e5' } = {}) {
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth || 600, h = canvas.clientHeight || 220;
  canvas.width = w * dpr; canvas.height = h * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr); ctx.clearRect(0, 0, w, h);
  if (!values.length) { ctx.fillStyle = '#8a92ab'; ctx.font = '13px Segoe UI'; ctx.textAlign = 'center'; ctx.fillText('No data yet', w / 2, h / 2); return; }
  const pad = { l: money ? 54 : 40, r: 10, t: 14, b: 26 };
  const max = Math.max(...values, 1) * 1.12;
  const cw = (w - pad.l - pad.r) / values.length;
  ctx.strokeStyle = '#e9ecf5'; ctx.fillStyle = '#8a92ab'; ctx.font = '11px Segoe UI'; ctx.textAlign = 'right';
  for (let i = 0; i <= 4; i++) {
    const y = pad.t + (h - pad.t - pad.b) * i / 4;
    ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(w - pad.r, y); ctx.stroke();
    const val = max * (1 - i / 4);
    ctx.fillText(money ? fmtMoney(val).replace('.00', '') : Math.round(val), pad.l - 6, y + 4);
  }
  values.forEach((v, i) => {
    const bh = (h - pad.t - pad.b) * v / max;
    const x = pad.l + i * cw + cw * 0.22, bw = cw * 0.56;
    const grad = ctx.createLinearGradient(0, h - pad.b - bh, 0, h - pad.b);
    grad.addColorStop(0, color); grad.addColorStop(1, color + '99');
    ctx.fillStyle = grad;
    const r = Math.min(7, bw / 2);
    const y = h - pad.b - bh;
    ctx.beginPath(); ctx.moveTo(x, h - pad.b); ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r);
    ctx.lineTo(x + bw - r, y); ctx.arcTo(x + bw, y, x + bw, y + r, r); ctx.lineTo(x + bw, h - pad.b); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#8a92ab'; ctx.font = '10.5px Segoe UI'; ctx.textAlign = 'center';
    ctx.fillText(labels[i], x + bw / 2, h - 8);
  });
}

/* horizontal stacked-ish comparison bar for discount vs ceiling */
function discBar(given, allowed) {
  const max = Math.max(given, allowed, 25) * 1.15;
  const gp = Math.min(100, given / max * 100), ap = Math.min(100, allowed / max * 100);
  const over = given > allowed;
  return `<div class="linebar">
    <div class="fill ${over ? 'over' : ''}" style="width:${gp}%"></div>
    <div class="mark" style="left:${ap}%"></div>
  </div>`;
}
