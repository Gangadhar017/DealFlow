import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, PrivateRoute } from './auth';
import { ToastProvider } from './components/ui';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import { Quotations, QuoteDetail } from './pages/Sales';
import Customers from './pages/Customers';
import { Products, Pricelists, Governance, Plans, Upsell } from './pages/Catalog';
import Warehouses from './pages/Warehouses';
import { Commissions, CommissionDetail, CommissionRules, CommissionReport } from './pages/Commissions';
import Invoices from './pages/Invoices';
import Reports from './pages/Reports';
import { Users, SettingsPage, AuditLog } from './pages/Admin';
import Portal from './pages/Portal';

function Shell({ children }) {
  return (
    <>
      <Navbar />
      {children}
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <HashRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/portal/q/:number" element={<Portal />} />
            <Route path="/portal" element={<Portal />} />
            <Route path="/" element={<PrivateRoute><Shell><Dashboard /></Shell></PrivateRoute>} />
            <Route path="/quotations" element={<PrivateRoute><Shell><Quotations mode="all" /></Shell></PrivateRoute>} />
            <Route path="/orders" element={<PrivateRoute><Shell><Quotations mode="orders" /></Shell></PrivateRoute>} />
            <Route path="/quotations/:id" element={<PrivateRoute><Shell><QuoteDetail /></Shell></PrivateRoute>} />
            <Route path="/customers" element={<PrivateRoute><Shell><Customers /></Shell></PrivateRoute>} />
            <Route path="/products" element={<PrivateRoute><Shell><Products /></Shell></PrivateRoute>} />
            <Route path="/pricelists" element={<PrivateRoute><Shell><Pricelists /></Shell></PrivateRoute>} />
            <Route path="/governance" element={<PrivateRoute><Shell><Governance /></Shell></PrivateRoute>} />
            <Route path="/plans" element={<PrivateRoute><Shell><Plans /></Shell></PrivateRoute>} />
            <Route path="/upsell" element={<PrivateRoute><Shell><Upsell /></Shell></PrivateRoute>} />
            <Route path="/warehouses" element={<PrivateRoute><Shell><Warehouses /></Shell></PrivateRoute>} />
            <Route path="/commissions" element={<PrivateRoute><Shell><Commissions /></Shell></PrivateRoute>} />
            <Route path="/commissions/rules" element={<PrivateRoute><Shell><CommissionRules /></Shell></PrivateRoute>} />
            <Route path="/commissions/report" element={<PrivateRoute><Shell><CommissionReport /></Shell></PrivateRoute>} />
            <Route path="/commissions/:id" element={<PrivateRoute><Shell><CommissionDetail /></Shell></PrivateRoute>} />
            <Route path="/invoices" element={<PrivateRoute><Shell><Invoices /></Shell></PrivateRoute>} />
            <Route path="/reports" element={<PrivateRoute><Shell><Reports /></Shell></PrivateRoute>} />
            <Route path="/users" element={<PrivateRoute><Shell><Users /></Shell></PrivateRoute>} />
            <Route path="/settings" element={<PrivateRoute><Shell><SettingsPage /></Shell></PrivateRoute>} />
            <Route path="/audit" element={<PrivateRoute><Shell><AuditLog /></Shell></PrivateRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </HashRouter>
      </ToastProvider>
    </AuthProvider>
  );
}
