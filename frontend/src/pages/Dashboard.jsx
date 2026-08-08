import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { analyticsAPI, productAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  DollarSign, 
  Users, 
  AlertTriangle, 
  FileCheck, 
  Layers, 
  ArrowRight,
  TrendingDown,
  Activity,
  Plus,
  RefreshCw
} from 'lucide-react';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await analyticsAPI.getDashboard();
      setStats(data);

      // Also get detailed low stock products for visual display
      const prodData = await productAPI.getProducts({ lowStock: 'true' });
      setLowStockProducts(prodData.products);
    } catch (err) {
      console.error(err);
      setError('Could not retrieve dashboard metrics. Please reload.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', flexDirection: 'column', gap: '1rem' }}>
        <RefreshCw size={40} style={{ animation: 'spin 1.5s linear infinite', color: 'var(--color-primary)' }} />
        <p style={{ color: 'var(--text-muted)' }}>Assembling business analytics...</p>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert-box alert-danger">
        <p>{error}</p>
        <button onClick={fetchDashboardData} className="btn btn-secondary" style={{ marginTop: '1rem' }}>
          Retry
        </button>
      </div>
    );
  }

  const { summary, categoriesBreakdown, recentMovements, recentChallans, rolesBreakdown } = stats || {};

  return (
    <div className="dashboard-grid">
      {/* Top Welcome Panel */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', marginBottom: '0.35rem' }}>Welcome Back, {user?.name}</h2>
          <p style={{ color: 'var(--text-muted)' }}>Role Access level: <span className="badge badge-user-role">{user?.role}</span></p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {(user?.role === 'Admin' || user?.role === 'Sales') && (
            <>
              <button className="btn btn-primary" onClick={() => navigate('/challans?new=true')}>
                <Plus size={18} />
                <span>New Challan</span>
              </button>
              <button className="btn btn-secondary" onClick={() => navigate('/customers?new=true')}>
                <Plus size={18} />
                <span>Add Customer</span>
              </button>
            </>
          )}
          {(user?.role === 'Warehouse') && (
            <button className="btn btn-secondary" onClick={() => navigate('/inventory?new=true')}>
              <Plus size={18} />
              <span>Register Product</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Stats Cards Row */}
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: 'var(--success-bg)', color: 'var(--success)', border: '1px solid var(--success)' }}>
            <DollarSign size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Confirmed Revenue</span>
            <h3 className="stat-value">₹{(summary?.totalRevenue || 0).toLocaleString()}</h3>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: 'rgba(99, 102, 241, 0.15)', color: 'var(--color-primary)', border: '1px solid var(--color-primary)' }}>
            <Users size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-label">CRM Customers</span>
            <h3 className="stat-value">{summary?.totalCustomers || 0}</h3>
          </div>
        </div>

        <div 
          className="stat-card" 
          style={summary?.lowStockItemsCount > 0 ? { border: '1px solid var(--danger)', boxShadow: '0 0 15px rgba(239, 68, 68, 0.1)' } : {}}
        >
          <div className="stat-icon" style={{ 
            backgroundColor: summary?.lowStockItemsCount > 0 ? 'var(--danger-bg)' : 'rgba(107, 114, 128, 0.15)', 
            color: summary?.lowStockItemsCount > 0 ? 'var(--danger)' : 'var(--text-dim)',
            border: summary?.lowStockItemsCount > 0 ? '1px solid var(--danger)' : '1px solid var(--border-color)'
          }}>
            <AlertTriangle size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Stock Alerts</span>
            <h3 className="stat-value" style={summary?.lowStockItemsCount > 0 ? { color: 'var(--danger)' } : {}}>{summary?.lowStockItemsCount || 0}</h3>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: 'var(--warning-bg)', color: 'var(--warning)', border: '1px solid var(--warning)' }}>
            <FileCheck size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Active Orders (Challans)</span>
            <h3 className="stat-value">{stats?.summary?.confirmedChallansCount || 0}</h3>
          </div>
        </div>
      </div>

      {/* Critical Stock Alert Box if any */}
      {lowStockProducts.length > 0 && (
        <div style={{ background: '#1c1917', border: '1px solid var(--warning)', borderRadius: 'var(--radius-md)', padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--warning)', marginBottom: '0.75rem', fontWeight: 700 }}>
            <TrendingDown size={20} />
            <span>CRITICAL WAREHOUSE REORDER ALERTS ({lowStockProducts.length})</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
            {lowStockProducts.slice(0, 4).map((p) => (
              <div 
                key={p.id} 
                style={{ 
                  background: 'var(--bg-secondary)', 
                  border: '1px solid var(--border-color)', 
                  borderRadius: 'var(--radius-sm)', 
                  padding: '1rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <h4 style={{ fontSize: '0.9rem', marginBottom: '0.15rem' }}>{p.productName}</h4>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>SKU: {p.sku} | Loc: {p.warehouseLocation}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ color: 'var(--danger)', fontWeight: 800, fontSize: '1rem' }}>{p.currentStock}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}> / min {p.minimumStockAlertQuantity}</span>
                </div>
              </div>
            ))}
          </div>
          {lowStockProducts.length > 4 && (
            <p style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: 'var(--text-muted)', cursor: 'pointer' }} onClick={() => navigate('/inventory?lowStock=true')}>
              And {lowStockProducts.length - 4} other products are low on inventory. View entire catalog <ArrowRight size={12} style={{ display: 'inline', verticalAlign: 'middle' }} />
            </p>
          )}
        </div>
      )}

      {/* Main Charts & Feed Row */}
      <div className="dashboard-metrics-grid">
        {/* Left Side: Recent Orders/Movements */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Confirmed Sales Challans */}
          <div className="card" style={{ marginBottom: 0 }}>
            <div className="card-header">
              <h3 className="card-title">Recent Sales Challans</h3>
              <button className="btn btn-secondary" onClick={() => navigate('/challans')} style={{ padding: '0.35rem 0.75rem', fontSize: '0.85rem' }}>
                View All
              </button>
            </div>
            {recentChallans && recentChallans.length > 0 ? (
              <div className="table-responsive">
                <table>
                  <thead>
                    <tr>
                      <th>Challan</th>
                      <th>Customer</th>
                      <th>Quantity</th>
                      <th>Amount</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentChallans.map((challan) => (
                      <tr key={challan.id}>
                        <td style={{ fontWeight: 700 }}>{challan.challanNumber}</td>
                        <td style={{ color: 'var(--text-muted)' }}>{challan.customer?.customerName}</td>
                        <td>{challan.totalQuantity} items</td>
                        <td style={{ fontWeight: 600 }}>₹{Number(challan.totalAmount).toLocaleString()}</td>
                        <td>
                          <span className={`badge badge-${challan.status.toLowerCase()}`}>
                            {challan.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>No recent challans generated.</p>
            )}
          </div>

          {/* Catalog Categories breakdown table */}
          <div className="card" style={{ marginBottom: 0 }}>
            <h3 className="card-title" style={{ marginBottom: '1.25rem' }}>Product Stock Categorization</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
              {categoriesBreakdown && categoriesBreakdown.map((cat, idx) => (
                <div key={idx} style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ background: 'rgba(139, 92, 246, 0.15)', color: 'var(--color-accent)', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justify: 'center', justifyContent: 'center' }}>
                    <Layers size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{cat.category}</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{cat.count} Products</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side: Audit Stock Logs */}
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-header" style={{ marginBottom: '1.25rem' }}>
            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Activity size={18} className="text-secondary" />
              <span>Stock audit logs</span>
            </h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Real-time</span>
          </div>

          {recentMovements && recentMovements.length > 0 ? (
            <div className="timeline">
              {recentMovements.map((move) => (
                <div className="timeline-item" key={move.id}>
                  <div className="timeline-marker" style={{
                    backgroundColor: move.movementType === 'IN' ? 'var(--success)' : 'var(--danger)'
                  }}></div>
                  <div className="timeline-content" style={{ padding: '0.75rem' }}>
                    <div className="timeline-header">
                      <span>{move.product?.productName}</span>
                      <span>{new Date(move.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="timeline-note" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {move.reason}
                      </span>
                      <span style={{
                        fontSize: '0.85rem',
                        fontWeight: 800,
                        color: move.movementType === 'IN' ? 'var(--success)' : 'var(--danger)'
                      }}>
                        {move.movementType === 'IN' ? '+' : '-'}{move.quantityChanged}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>No inventory movements logged yet.</p>
          )}

          <div style={{ borderTop: '1px solid var(--border-color)', marginTop: '2rem', paddingTop: '1rem', textAlign: 'center' }}>
            <button className="btn btn-secondary" onClick={() => navigate('/inventory?logs=true')} style={{ width: '100%' }}>
              View Stock Audit Ledger
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
