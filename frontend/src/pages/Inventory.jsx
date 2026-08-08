import React, { useEffect, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { productAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Search,
  Plus,
  RefreshCw,
  Edit2,
  ListMinus,
  ListPlus,
  TrendingDown,
  Warehouse,
  Coins,
  MapPin,
  Clock,
  History,
  AlertTriangle
} from 'lucide-react';

export default function Inventory() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [lowStock, setLowStock] = useState('false');

  // Pagination states
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  // Ledger Pagination states
  const [ledgerPage, setLedgerPage] = useState(1);
  const [ledgerTotalPages, setLedgerTotalPages] = useState(1);
  const [ledgerTotalRecords, setLedgerTotalRecords] = useState(0);

  // Modals & Selectors
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedProductLoading, setSelectedProductLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(null);
  const [showLedgerModal, setShowLedgerModal] = useState(false);

  // Form states - Create Product
  const [prodForm, setProdForm] = useState({
    productName: '',
    sku: '',
    category: '',
    unitPrice: '',
    currentStock: '',
    minimumStockAlertQuantity: '',
    warehouseLocation: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Form states - Stock Adjust
  const [adjustForm, setAdjustForm] = useState({
    quantityChanged: '',
    movementType: 'IN',
    reason: ''
  });
  const [adjustError, setAdjustError] = useState('');
  const [adjustSubmitting, setAdjustSubmitting] = useState(false);

  // Stock Movement Ledger history state
  const [ledgerLogs, setLedgerLogs] = useState([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);

  // Load products catalog list
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await productAPI.getProducts({
        search,
        category,
        lowStock: lowStock,
        page,
        limit: 10
      });
      setProducts(data.products);
      if (data.pagination) {
        setTotalPages(data.pagination.totalPages || 1);
        setTotalRecords(data.pagination.total || 0);
      }
    } catch (err) {
      console.error(err);
      setError('Could not retrieve product catalog.');
    } finally {
      setLoading(false);
    }
  }, [search, category, lowStock, page]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [search, category, lowStock]);

  // Read URL params (e.g. lowStock=true or new=true)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('new') === 'true') {
      setShowAddModal(true);
      navigate('/inventory', { replace: true });
    } else if (params.get('lowStock') === 'true') {
      setLowStock('true');
      navigate('/inventory', { replace: true });
    } else if (params.get('logs') === 'true') {
      loadLedgerLogs();
      navigate('/inventory', { replace: true });
    }
  }, [location, navigate]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Load ledger logs
  const loadLedgerLogs = async (pageNum = 1) => {
    const targetPage = typeof pageNum === 'number' ? pageNum : 1;
    setShowLedgerModal(true);
    setLedgerLoading(true);
    try {
      const data = await productAPI.getStockLogs({ page: targetPage, limit: 10 });
      setLedgerLogs(data.movements);
      setLedgerPage(targetPage);
      if (data.pagination) {
        setLedgerTotalPages(data.pagination.totalPages || 1);
        setLedgerTotalRecords(data.pagination.total || 0);
      }
    } catch (err) {
      console.error(err);
      alert('Could not load transaction logs');
    } finally {
      setLedgerLoading(false);
    }
  };

  // Load single product details
  const loadSingleProduct = async (id) => {
    setSelectedProductLoading(true);
    try {
      const data = await productAPI.getProduct(id);
      setSelectedProduct(data.product);
    } catch (err) {
      console.error(err);
      alert('Failed to get product details.');
    } finally {
      setSelectedProductLoading(false);
    }
  };

  // Create Product handler
  const handleCreateProductSubmit = async (e) => {
    e.preventDefault();
    setFormErrors({});

    // Validate inputs
    const errors = {};
    if (!prodForm.productName.trim()) errors.productName = 'Name is required';
    if (!prodForm.sku.trim() || prodForm.sku.length < 3) errors.sku = 'SKU code is required (min 3 characters)';
    if (!prodForm.category.trim()) errors.category = 'Category label is required';
    if (!prodForm.unitPrice || Number(prodForm.unitPrice) <= 0) errors.unitPrice = 'Must be greater than 0';
    if (prodForm.currentStock === '' || Number(prodForm.currentStock) < 0) {
      errors.currentStock = 'Starting inventory must be non-negative';
    }
    if (prodForm.minimumStockAlertQuantity === '' || Number(prodForm.minimumStockAlertQuantity) < 0) {
      errors.minimumStockAlertQuantity = 'Trigger alert value is required';
    }
    if (!prodForm.warehouseLocation.trim()) errors.warehouseLocation = 'Warehouse shelf marker is required';

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setFormSubmitting(true);
    try {
      const payload = {
        ...prodForm,
        unitPrice: Number(prodForm.unitPrice),
        currentStock: Number(prodForm.currentStock),
        minimumStockAlertQuantity: Number(prodForm.minimumStockAlertQuantity)
      };

      await productAPI.createProduct(payload);
      setShowAddModal(false);
      // Reset form
      setProdForm({
        productName: '',
        sku: '',
        category: '',
        unitPrice: '',
        currentStock: '',
        minimumStockAlertQuantity: '',
        warehouseLocation: ''
      });
      fetchProducts();
    } catch (err) {
      console.error(err);
      setFormErrors({ api: err.message || 'Operation failed' });
    } finally {
      setFormSubmitting(false);
    }
  };

  // Adjust stock handler
  const handleAdjustStockSubmit = async (e) => {
    e.preventDefault();
    setAdjustError('');

    const qty = Number(adjustForm.quantityChanged);
    if (isNaN(qty) || qty <= 0) {
      setAdjustError('Please specify positive whole quantity value.');
      return;
    }
    if (!adjustForm.reason.trim()) {
      setAdjustError('Please document a justification for audits.');
      return;
    }

    setAdjustSubmitting(true);
    try {
      await productAPI.adjustStock(showAdjustModal.id, {
        quantityChanged: qty,
        movementType: adjustForm.movementType,
        reason: adjustForm.reason
      });
      setShowAdjustModal(null);
      setAdjustForm({
        quantityChanged: '',
        movementType: 'IN',
        reason: ''
      });
      fetchProducts();
    } catch (err) {
      console.error(err);
      setAdjustError(err.message || 'Deduction failed');
    } finally {
      setAdjustSubmitting(false);
    }
  };

  const isWarehouseOrAdmin = user?.role === 'Admin' || user?.role === 'Warehouse';
  const categoriesList = ['Grains', 'Essentials', 'Oil & Fats', 'Pulses', 'Beverages', 'Hygiene'];

  return (
    <div>
      {/* Top dashboard action deck */}
      <div className="card-header" style={{ marginBottom: '2rem' }}>
        <div className="interactive-panel" style={{ margin: 0, flex: 1 }}>
          <div className="search-container">
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
            <input
              type="text"
              placeholder="Search SKU or Product Name..."
              className="form-control"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '2.50rem' }}
            />
          </div>

          <div className="filter-select-wrapper">
            <select className="filter-select" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">All Categories</option>
              {categoriesList.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>

          <div className="filter-select-wrapper">
            <select className="filter-select" value={lowStock} onChange={(e) => setLowStock(e.target.value)}>
              <option value="false">All Inventory Ranges</option>
              <option value="true">Warning Alerts Only</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-secondary" onClick={loadLedgerLogs}>
            <History size={18} />
            <span>Audit Ledger</span>
          </button>
          
          {(user?.role === 'Admin' || user?.role === 'Warehouse') && (
            <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
              <Plus size={18} />
              <span>Register Product</span>
            </button>
          )}
        </div>
      </div>

      {/* Main product log catalog display */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
          <RefreshCw size={32} style={{ animation: 'spin 1.5s linear infinite', color: 'var(--color-primary)' }} />
        </div>
      ) : error ? (
        <div className="alert-box alert-danger">{error}</div>
      ) : products.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '4rem' }}>
          <Warehouse size={48} style={{ color: 'var(--text-dim)', marginBottom: '1rem' }} />
          <p style={{ color: 'var(--text-muted)' }}>No products found in the catalog.</p>
        </div>
      ) : (
        <>
          <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th>SKU Code</th>
                <th>Product Name</th>
                <th>Category</th>
                <th>MRP / Unit Price</th>
                <th>Current Stock</th>
                <th>Bay Location</th>
                <th>Stock Operations</th>
              </tr>
            </thead>
            <tbody>
              {products.map((prod) => {
                const isCriticalStock = prod.currentStock <= prod.minimumStockAlertQuantity;
                return (
                  <tr key={prod.id} style={isCriticalStock ? { backgroundColor: 'rgba(239, 68, 68, 0.02)' } : {}}>
                    <td style={{ fontWeight: 800 }}><code>{prod.sku}</code></td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{prod.productName}</div>
                      {isCriticalStock && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '0.2rem', marginTop: '0.2rem', fontWeight: 600 }}>
                          <AlertTriangle size={12} />
                          <span>Needs Restock (Min Alert Threshold: {prod.minimumStockAlertQuantity})</span>
                        </div>
                      )}
                    </td>
                    <td><span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{prod.category}</span></td>
                    <td style={{ fontWeight: 600 }}>₹{Number(prod.unitPrice).toLocaleString()}</td>
                    <td>
                      <span 
                        style={{ fontWeight: 800, fontSize: '1rem', color: isCriticalStock ? 'var(--danger)' : 'var(--success)' }}
                      >
                        {prod.currentStock}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem' }}>
                        <MapPin size={12} style={{ color: 'var(--text-dim)' }} />
                        <span>{prod.warehouseLocation}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button 
                          className="btn btn-secondary" 
                          style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                          onClick={() => loadSingleProduct(prod.id)}
                        >
                          Audit History
                        </button>
                        
                        {isWarehouseOrAdmin && (
                          <button 
                            className="btn btn-primary" 
                            style={{ 
                              padding: '0.4rem 0.8rem', 
                              fontSize: '0.8rem',
                              background: 'linear-gradient(135deg, #4f46e5, #06b6d4)'
                            }}
                            onClick={() => {
                              setShowAdjustModal(prod);
                              setAdjustForm({ ...adjustForm, reason: '' });
                            }}
                          >
                            Adjust Stock
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="pagination-wrapper" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', padding: '0.75rem 1rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Page <strong>{page}</strong> of <strong>{totalPages}</strong> ({totalRecords} records)
            </span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', cursor: page === 1 ? 'not-allowed' : 'pointer' }}
                onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                disabled={page === 1}
              >
                Previous
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', cursor: page === totalPages ? 'not-allowed' : 'pointer' }}
                onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
                disabled={page === totalPages}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </>
    )}

      {/* Product audit details modal */}
      {selectedProduct && (
        <div className="modal-overlay" onClick={() => setSelectedProduct(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 style={{ fontSize: '1.25rem' }}>{selectedProduct.productName}</h3>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>SKU: <code>{selectedProduct.sku}</code></span>
              </div>
              <button className="modal-close" onClick={() => setSelectedProduct(null)}>&times;</button>
            </div>

            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ background: 'var(--bg-tertiary)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Price (INR)</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0.25rem 0' }}>₹{Number(selectedProduct.unitPrice)}</div>
                </div>
                <div style={{ background: 'var(--bg-tertiary)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Current Stock</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0.25rem 0' }}>{selectedProduct.currentStock} units</div>
                </div>
                <div style={{ background: 'var(--bg-tertiary)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Min Limit</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0.25rem 0' }}>{selectedProduct.minimumStockAlertQuantity} units</div>
                </div>
              </div>

              <h4 style={{ fontSize: '0.9rem', marginBottom: '0.75rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                Specific Stock Movements Ledger
              </h4>

              <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {selectedProduct.stockMovements && selectedProduct.stockMovements.length > 0 ? (
                  <div className="timeline" style={{ paddingLeft: '1.25rem' }}>
                    {selectedProduct.stockMovements.map((move) => (
                      <div className="timeline-item" key={move.id}>
                        <div className="timeline-marker" style={{
                          backgroundColor: move.movementType === 'IN' ? 'var(--success)' : 'var(--danger)'
                        }}></div>
                        <div className="timeline-content" style={{ padding: '0.6rem' }}>
                          <div className="timeline-header" style={{ marginBottom: '0.25rem' }}>
                            <span style={{ fontWeight: 600 }}>{move.user?.name} ({move.user?.role})</span>
                            <span>{new Date(move.createdAt).toLocaleDateString()}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{move.reason}</span>
                            <span style={{ fontWeight: 800, color: move.movementType === 'IN' ? 'var(--success)' : 'var(--danger)' }}>
                              {move.movementType === 'IN' ? '+' : '-'}{move.quantityChanged}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: 'var(--text-dim)', textAlign: 'center', padding: '1rem' }}>No individual stock history logged.</p>
                )}
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setSelectedProduct(null)}>Close Auditor</button>
            </div>
          </div>
        </div>
      )}

      {/* Adjust Stock Modal */}
      {showAdjustModal && (
        <div className="modal-overlay" onClick={() => setShowAdjustModal(null)}>
          <div className="modal-dialog" style={{ maxWidth: '450px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.25rem' }}>Adjust Stock: {showAdjustModal.productName}</h3>
              <button className="modal-close" onClick={() => setShowAdjustModal(null)}>&times;</button>
            </div>

            <form onSubmit={handleAdjustStockSubmit}>
              <div className="modal-body">
                {adjustError && <div className="alert-box alert-danger" style={{ padding: '0.75rem', marginBottom: '1rem', fontSize: '0.85rem' }}>{adjustError}</div>}

                <div style={{ background: 'var(--bg-tertiary)', padding: '0.85rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.25rem', border: '1px solid var(--border-color)', fontSize: '0.85rem' }}>
                  <strong>Current Available Inventory:</strong>
                  <span style={{ float: 'right', fontWeight: 800, color: 'var(--color-primary)' }}>{showAdjustModal.currentStock} units</span>
                </div>

                <div className="form-group">
                  <label>Adjustment Direction</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <button
                      type="button"
                      className={`btn ${adjustForm.movementType === 'IN' ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setAdjustForm({ ...adjustForm, movementType: 'IN' })}
                      style={{ padding: '0.5rem' }}
                    >
                      <ListPlus size={16} />
                      <span>Stock IN (Recv)</span>
                    </button>
                    <button
                      type="button"
                      className={`btn ${adjustForm.movementType === 'OUT' ? 'btn-danger' : 'btn-secondary'}`}
                      onClick={() => setAdjustForm({ ...adjustForm, movementType: 'OUT' })}
                      style={{ padding: '0.5rem', border: adjustForm.movementType === 'OUT' ? 'none' : '1px solid var(--border-color)' }}
                    >
                      <ListMinus size={16} />
                      <span>Stock OUT (Deduct)</span>
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label>Quantity to Change*</label>
                  <input
                    type="number"
                    className="form-control"
                    placeholder="Enter whole number"
                    min={1}
                    value={adjustForm.quantityChanged}
                    onChange={(e) => setAdjustForm({ ...adjustForm, quantityChanged: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Reason / Log Details*</label>
                  <textarea
                    rows={2}
                    className="form-control"
                    placeholder="e.g. Received shipment from seller, Damaged returns, Correction..."
                    value={adjustForm.reason}
                    onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
                    style={{ resize: 'none' }}
                    required
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAdjustModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={adjustSubmitting}>
                  {adjustSubmitting ? 'Recording Adjustment...' : 'Confirm Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Complete Audit Ledger Modal */}
      {showLedgerModal && (
        <div className="modal-overlay" onClick={() => setShowLedgerModal(false)}>
          <div className="modal-dialog" style={{ maxWidth: '800px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <History size={20} className="text-secondary" />
                <span>Warehouse Complete Stock Audit Ledger</span>
              </h3>
              <button className="modal-close" onClick={() => setShowLedgerModal(false)}>&times;</button>
            </div>

            <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              {ledgerLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
                  <RefreshCw size={24} style={{ animation: 'spin 1.5s linear infinite' }} />
                </div>
              ) : ledgerLogs.length === 0 ? (
                <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>No inventory transaction records found.</p>
              ) : (
                <>
                  <div className="table-responsive">
                    <table style={{ fontSize: '0.85rem' }}>
                      <thead>
                        <tr>
                          <th>Date & Time</th>
                          <th>Product Info</th>
                          <th>Type</th>
                          <th>Qty Changed</th>
                          <th>Audit Reason</th>
                          <th>Recorded By</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ledgerLogs.map((log) => (
                          <tr key={log.id}>
                            <td>{new Date(log.createdAt).toLocaleString()}</td>
                            <td>
                              <div style={{ fontWeight: 600 }}>{log.product?.productName}</div>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>SKU: {log.product?.sku}</span>
                            </td>
                            <td>
                              <span className={`badge ${log.movementType === 'IN' ? 'badge-active' : 'badge-inactive'}`}>
                                {log.movementType === 'IN' ? 'IN' : 'OUT'}
                              </span>
                            </td>
                            <td style={{ fontWeight: 700, color: log.movementType === 'IN' ? 'var(--success)' : 'var(--danger)' }}>
                              {log.movementType === 'IN' ? '+' : '-'}{log.quantityChanged}
                            </td>
                            <td style={{ color: 'var(--text-muted)' }}>{log.reason}</td>
                            <td>{log.user?.name}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Ledger Pagination Controls */}
                  {ledgerTotalPages > 1 && (
                    <div className="pagination-wrapper" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', padding: '0.75rem 1rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        Page <strong>{ledgerPage}</strong> of <strong>{ledgerTotalPages}</strong> ({ledgerTotalRecords} logs)
                      </span>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', cursor: ledgerPage === 1 ? 'not-allowed' : 'pointer' }}
                          onClick={() => loadLedgerLogs(ledgerPage - 1)}
                          disabled={ledgerPage === 1}
                        >
                          Previous
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', cursor: ledgerPage === ledgerTotalPages ? 'not-allowed' : 'pointer' }}
                          onClick={() => loadLedgerLogs(ledgerPage + 1)}
                          disabled={ledgerPage === ledgerTotalPages}
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowLedgerModal(false)}>Close Ledger</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-dialog" style={{ maxWidth: '600px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Warehouse size={22} className="text-secondary" />
                <span>Register New Warehouse Product</span>
              </h3>
              <button className="modal-close" onClick={() => setShowAddModal(false)}>&times;</button>
            </div>

            <form onSubmit={handleCreateProductSubmit}>
              <div className="modal-body">
                {formErrors.api && <div className="alert-box alert-danger">{formErrors.api}</div>}

                <div className="form-grid">
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label>Product Name*</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Cardamom Pods 1kg"
                      value={prodForm.productName}
                      onChange={(e) => setProdForm({ ...prodForm, productName: e.target.value })}
                    />
                    {formErrors.productName && <span className="error-text">{formErrors.productName}</span>}
                  </div>

                  <div className="form-group">
                    <label>SKU Code*</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. CARD-PODS-01"
                      value={prodForm.sku}
                      onChange={(e) => setProdForm({ ...prodForm, sku: e.target.value })}
                    />
                    {formErrors.sku && <span className="error-text">{formErrors.sku}</span>}
                  </div>

                  <div className="form-group">
                    <label>Product Category*</label>
                    <div className="filter-select-wrapper" style={{ width: '100%' }}>
                      <select 
                        className="filter-select"
                        value={prodForm.category}
                        onChange={(e) => setProdForm({ ...prodForm, category: e.target.value })}
                        style={{ width: '100%', backgroundColor: 'var(--bg-tertiary)' }}
                      >
                        <option value="">Select Category</option>
                        {categoriesList.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                      </select>
                    </div>
                    {formErrors.category && <span className="error-text">{formErrors.category}</span>}
                  </div>

                  <div className="form-group">
                    <label>MRP / Unit Price (INR)*</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-control"
                      placeholder="Pricing value"
                      value={prodForm.unitPrice}
                      onChange={(e) => setProdForm({ ...prodForm, unitPrice: e.target.value })}
                    />
                    {formErrors.unitPrice && <span className="error-text">{formErrors.unitPrice}</span>}
                  </div>

                  <div className="form-group">
                    <label>Shelf Bay Location*</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Aisles D-3"
                      value={prodForm.warehouseLocation}
                      onChange={(e) => setProdForm({ ...prodForm, warehouseLocation: e.target.value })}
                    />
                    {formErrors.warehouseLocation && <span className="error-text">{formErrors.warehouseLocation}</span>}
                  </div>

                  <div className="form-group">
                    <label>Starting Inventory*</label>
                    <input
                      type="number"
                      className="form-control"
                      placeholder="Available count"
                      value={prodForm.currentStock}
                      onChange={(e) => setProdForm({ ...prodForm, currentStock: e.target.value })}
                    />
                    {formErrors.currentStock && <span className="error-text">{formErrors.currentStock}</span>}
                  </div>

                  <div className="form-group">
                    <label>Reorder Alert Threshold*</label>
                    <input
                      type="number"
                      className="form-control"
                      placeholder="Alert when stock <= variable"
                      value={prodForm.minimumStockAlertQuantity}
                      onChange={(e) => setProdForm({ ...prodForm, minimumStockAlertQuantity: e.target.value })}
                    />
                    {formErrors.minimumStockAlertQuantity && <span className="error-text">{formErrors.minimumStockAlertQuantity}</span>}
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={formSubmitting}>
                  {formSubmitting ? 'Registering...' : 'Register Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
