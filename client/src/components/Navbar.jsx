import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth';
import { api } from '../api';
import { Avatar } from './ui';

/* Odoo-style top navbar: app menus with dropdown submenus, right-side user area */
export default function Navbar() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [open, setOpen] = useState(null);
  const [alertCount, setAlertCount] = useState(0);
  const [userMenu, setUserMenu] = useState(false);
  const barRef = useRef(null);
  const role = user?.role;

  useEffect(() => { setOpen(null); setUserMenu(false); }, [loc.pathname]);
  useEffect(() => {
    let alive = true;
    const load = () => api.get('/dashboard')
      .then((r) => alive && setAlertCount(r.kpi.alerts?.length || 0))
      .catch(() => {});
    load();
    const t = setInterval(load, 30000);
    return () => { alive = false; clearInterval(t); };
  }, [loc.pathname]);

  const go = (path) => nav(path);

  /* menus by role — Odoo Sales app structure + Commissions + Configuration */
  const menus = [
    {
      label: 'Orders', show: true,
      items: [
        { label: 'Quotations', path: '/quotations' },
        { label: 'Orders', path: '/orders' },
        { label: 'Customers', path: '/customers' },
      ],
    },
    {
      label: 'Products', show: true,
      items: [
        { label: 'Products', path: '/products' },
        { label: 'Pricelists', path: '/pricelists' },
        { label: 'Discount Governance', path: '/governance' },
        { label: 'Subscription Plans', path: '/plans' },
        { label: 'Upsell Rules', path: '/upsell' },
      ],
    },
    {
      label: 'Commissions', show: true,
      items: [
        { label: 'Commissions', path: '/commissions' },
        { label: 'Commission Rules', path: '/commissions/rules' },
        { label: 'Commissions by Salesperson', path: '/commissions/report' },
        { label: 'Sales Commission Detail', path: '/commissions/report?view=detail' },
      ],
    },
    {
      label: 'Reporting', show: true,
      items: [
        { label: 'Sales', path: '/reports' },
        { label: 'Dashboards', path: '/' },
      ],
    },
    {
      label: 'Configuration', show: ['admin', 'manager', 'finance'].includes(role),
      items: [
        { label: 'Warehouses & Stock', path: '/warehouses', roles: ['admin', 'finance'] },
        { label: 'Users', path: '/users', roles: ['admin'] },
        { label: 'Settings', path: '/settings', roles: ['admin'] },
        { label: 'Audit Log', path: '/audit' },
      ].filter((i) => !i.roles || i.roles.includes(role)),
    },
  ].filter((m) => m.show);

  return (
    <div className="navbar" ref={barRef}>
      <div className="brand" onClick={() => go('/')}>
        <span className="logo">D360</span><span className="txt">DealFlow360</span>
      </div>
      <div className="nav-menus">
        {menus.map((m) => (
          <div key={m.label} className={`nav-item ${open === m.label ? 'open' : ''}`}
            onClick={(e) => { e.stopPropagation(); setOpen(open === m.label ? null : m.label); }}>
            <span className="txt">{m.label}</span><span className="nav-caret">▼</span>
            <div className="dropdown">
              {m.items.map((it) => (
                <a key={it.path} onClick={(e) => { e.preventDefault(); go(it.path); }}>{it.label}</a>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="nav-right">
        <div className="nav-bell" title="Deal health alerts" onClick={() => go('/')}>
          🔔{alertCount > 0 && <span className="badge">{alertCount}</span>}
        </div>
        <div className="nav-user" onClick={() => setUserMenu(!userMenu)}>
          <span className="avatar"><Avatar name={user?.name} size={27} /></span>
          <span className="who txt">
            <div>{user?.name}</div>
            <div className="role">{role === 'salesrep' ? 'Salesperson' : role}</div>
          </span>
          {userMenu && (
            <>
              <div style={{ position: 'fixed', inset: 0, zIndex: 300 }} onClick={(e) => { e.stopPropagation(); setUserMenu(false); }} />
              <div className="dropdown" style={{ right: 6, left: 'auto', top: '100%' }}>
                <div className="dd-item" onClick={() => go('/portal-preview')} hidden>Portal demo</div>
                <a onClick={(e) => { e.preventDefault(); logout().then(() => nav('/login')); }}>Log out</a>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
