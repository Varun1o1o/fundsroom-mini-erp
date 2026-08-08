import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import Inventory from './pages/Inventory';
import Challans from './pages/Challans';
import { RefreshCw } from 'lucide-react';

function PrivateLayout({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', gap: '1rem', backgroundColor: 'var(--bg-primary)' }}>
        <RefreshCw size={44} style={{ animation: 'spin 1.5s linear infinite', color: 'var(--color-primary)' }} />
        <p style={{ color: 'var(--text-muted)' }}>Securing connection context...</p>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Pick titles and descriptions based on current path
  let currentTitle = 'Operations Portal';
  let currentSubtitle = 'Manage billing pipelines and customer relationships.';

  switch (location.pathname) {
    case '/':
      currentTitle = 'Operational Intelligence Dashboard';
      currentSubtitle = 'Overview of current CRM follow-ups, low stock events, and revenue.';
      break;
    case '/customers':
      currentTitle = 'CRM Client Accounts';
      currentSubtitle = 'Track sales pipeline status and log call history.';
      break;
    case '/inventory':
      currentTitle = 'Warehouse & Inventory Registry';
      currentSubtitle = 'Monitor stock ranges, adjust quantities, and print ledger audits.';
      break;
    case '/challans':
      currentTitle = 'Sales Challan Pipelines';
      currentSubtitle = 'Configure draft list, confirm delivery counts, or cancel orders.';
      break;
    default:
      break;
  }

  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-content">
        <header className="top-header">
          <div className="page-title-group">
            <h1>{currentTitle}</h1>
            <p>{currentSubtitle}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }} className="header-actions">
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Server: <strong style={{ color: 'var(--success)' }}>ONLINE</strong>
            </span>
          </div>
        </header>
        <div className="content-body">
          {children}
        </div>
      </div>
    </div>
  );
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%vh', backgroundColor: 'var(--bg-primary)' }}>
        <RefreshCw size={24} style={{ animation: 'spin 1.5s linear infinite' }} />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route 
            path="/login" 
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            } 
          />

          <Route 
            path="/" 
            element={
              <PrivateLayout>
                <Dashboard />
              </PrivateLayout>
            } 
          />

          <Route 
            path="/customers" 
            element={
              <PrivateLayout>
                <Customers />
              </PrivateLayout>
            } 
          />

          <Route 
            path="/inventory" 
            element={
              <PrivateLayout>
                <Inventory />
              </PrivateLayout>
            } 
          />

          <Route 
            path="/challans" 
            element={
              <PrivateLayout>
                <Challans />
              </PrivateLayout>
            } 
          />

          {/* Catch all fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
