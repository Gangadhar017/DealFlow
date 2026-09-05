/* Hand-built SVG charts — no chart library */
import React from 'react';

export function BarChart({ data, height = 190, fmt }) {
  // data: [{ label, value, color? }]
  const max = Math.max(1, ...data.map((d) => d.value));
  const bw = 100 / Math.max(data.length, 1);
  return (
    <svg viewBox={`0 0 100 ${height / 3}`} preserveAspectRatio="none" style={{ width: '100%', height }}>
      {data.map((d, i) => {
        const h = (d.value / max) * (height / 3 - 8);
        return (
          <g key={i}>
            <rect x={i * bw + bw * 0.18} y={height / 3 - 6 - h} width={bw * 0.64} height={h} rx={0.6} fill={d.color || '#714B67'} opacity={0.88}>
              <title>{`${d.label}: ${fmt ? fmt(d.value) : d.value}`}</title>
            </rect>
          </g>
        );
      })}
    </svg>
  );
}

export function LineChart({ series, height = 190, fmt }) {
  // series: [{ label, value }] — rendered as smooth polyline with area
  const vals = series.map((s) => s.value);
  const max = Math.max(1, ...vals);
  const H = height / 3, W = 100;
  const pt = (i) => [ (i / Math.max(1, series.length - 1)) * (W - 6) + 3, H - 6 - (vals[i] / max) * (H - 14) ];
  const line = series.map((_, i) => pt(i).join(',')).join(' ');
  const area = `3,${H - 6} ${line} ${W - 3},${H - 6}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height }}>
      <polygon points={area} fill="#714B67" opacity={0.12} />
      <polyline points={line} fill="none" stroke="#714B67" strokeWidth={0.9} strokeLinejoin="round" />
      {series.map((s, i) => (
        <circle key={i} cx={pt(i)[0]} cy={pt(i)[1]} r={1.1} fill="#714B67"><title>{`${s.label}: ${fmt ? fmt(s.value) : s.value}`}</title></circle>
      ))}
    </svg>
  );
}

export function HBars({ data, fmt }) {
  // data: [{ label, value, color?, sub? }] horizontal bars with labels
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div>
      {data.map((d, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 0' }}>
          <div style={{ width: 150, flex: 'none', fontSize: 12.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={d.label}>{d.label}</div>
          <div className="meter" style={{ flex: 1, height: 12 }}>
            <div style={{ width: `${(d.value / max) * 100}%`, background: d.color || '#714B67' }} />
          </div>
          <b style={{ width: 92, textAlign: 'right', fontSize: 12.5, fontVariantNumeric: 'tabular-nums' }}>{fmt ? fmt(d.value) : d.value}</b>
        </div>
      ))}
    </div>
  );
}
