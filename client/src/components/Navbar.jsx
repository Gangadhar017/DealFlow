import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth';
import { api } from '../api';
import { Avatar, useToast } from './ui';

export default function Navbar() {
  const { user, login, logout } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const { toast } = useToast();
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

  const go = (path) => {
    setOpen(null);
    setUserMenu(false);
    nav(path);
  };

  const switchPersona = async (email, password, label) => {
    try {
      await login(email, password);
      toast(`Switched to ${label}`, 'ok');
      setUserMenu(false);
      nav('/');
    } catch (e) {
      toast(e.message, 'err');
    }
  };

  const menus = [
    {
      label: 'Orders', show: true,
      items: [
        { label: 'Quotations', path: '/quotations' },
        { label: 'Orders', path: '/orders' },
        { label: 'Customers', path: '/customers' },
        { label: 'Invoices & Billing', path: '/invoices' },
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
        { label: 'Sales Analytics', path: '/reports' },
        { label: 'Dashboards', path: '/' },
      ],
    },
    {
      label: 'Configuration', show: true,
      items: [
        { label: 'Warehouses & Stock', path: '/warehouses' },
        { label: 'Users & RBAC', path: '/users' },
        { label: 'Settings & Policies', path: '/settings' },
        { label: 'Audit Log', path: '/audit' },
      ],
    },
  ];

  return (
    <div className="navbar" ref={barRef}>
      <div className="brand" onClick={() => go('/')} style={{ cursor: 'pointer' }}>
        <span className="logo">D360</span><span className="txt">DealFlow360</span>
      </div>
      <div className="nav-menus">
        {menus.map((m) => (
          <div key={m.label} className={`nav-item ${open === m.label ? 'open' : ''}`}
            onClick={(e) => { e.stopPropagation(); setOpen(open === m.label ? null : m.label); }}>
            <span className="txt">{m.label}</span><span className="nav-caret" style={{ fontSize: 10, marginLeft: 4 }}>▼</span>
            <div className="dropdown">
              {m.items.map((it) => (
                <a key={it.path} onClick={(e) => { e.preventDefault(); go(it.path); }}>{it.label}</a>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="nav-right">
        <button 
          className="btn sm" 
          style={{ background: 'rgba(255,255,255,0.18)', color: '#FFF', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 4, cursor: 'pointer', padding: '4px 10px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}
          onClick={() => go('/portal')}
          title="Open Customer Portal demo">
          <span>🌐</span> Customer Portal
        </button>
        <div className="nav-bell" title="Deal health alerts" onClick={() => go('/')} style={{ cursor: 'pointer' }}>
          <span>🔔</span>{alertCount > 0 && <span className="badge">{alertCount}</span>}
        </div>
        <div className="nav-user" onClick={() => setUserMenu(!userMenu)} style={{ cursor: 'pointer' }}>
          <span className="avatar"><Avatar name={user?.name} size={27} /></span>
          <span className="who txt">
            <div>{user?.name || 'User'}</div>
            <div className="role">{role === 'salesrep' ? 'Salesperson' : role || 'User'}</div>
          </span>
          {userMenu && (
            <>
              <div style={{ position: 'fixed', inset: 0, zIndex: 300 }} onClick={(e) => { e.stopPropagation(); setUserMenu(false); }} />
              <div className="dropdown" style={{ right: 6, left: 'auto', top: '100%', minWidth: 220, zIndex: 301, background: '#FFF', borderRadius: 6, boxShadow: '0 8px 24px rgba(0,0,0,0.15)', border: '1px solid #E5E7EB', padding: '6px 0' }}>
                <div style={{ padding: '8px 14px', borderBottom: '1px solid #F3F4F6', fontSize: 11, color: '#6B7280', textTransform: 'uppercase', fontWeight: 700 }}>
                  Switch Role Persona
                </div>
                <a style={{ padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12.5 }}
                   onClick={(e) => { e.preventDefault(); switchPersona('rep@dealflow.io', 'Rep@123', 'Asha Verma (Sales Rep)'); }}>
                  <span>💼</span> <b>Asha Verma</b> <span style={{ color: '#9CA3AF', fontSize: 11 }}>(Rep)</span>
                </a>
                <a style={{ padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12.5 }}
                   onClick={(e) => { e.preventDefault(); switchPersona('manager@dealflow.io', 'Manager@123', 'Priya Sharma (Manager)'); }}>
                  <span>👔</span> <b>Priya Sharma</b> <span style={{ color: '#9CA3AF', fontSize: 11 }}>(Manager)</span>
                </a>
                <a style={{ padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12.5 }}
                   onClick={(e) => { e.preventDefault(); switchPersona('finance@dealflow.io', 'Finance@123', 'Rahul Mehta (Finance)'); }}>
                  <span>📊</span> <b>Rahul Mehta</b> <span style={{ color: '#9CA3AF', fontSize: 11 }}>(Finance)</span>
                </a>
                <a style={{ padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12.5 }}
                   onClick={(e) => { e.preventDefault(); switchPersona('admin@dealflow.io', 'Admin@123', 'System Admin'); }}>
                  <span>⚙️</span> <b>System Admin</b>
                </a>
                <div style={{ borderTop: '1px solid #F3F4F6', margin: '4px 0' }} />
                <a style={{ padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12.5, color: '#714B67', fontWeight: 600 }}
                   onClick={(e) => { e.preventDefault(); go('/portal'); }}>
                  <span>🌐</span> Customer Portal Preview
                </a>
                <a style={{ padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12.5, color: '#DC2626' }}
                   onClick={(e) => { e.preventDefault(); logout().then(() => nav('/login')); }}>
                  <span>🚪</span> Log out
                </a>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
