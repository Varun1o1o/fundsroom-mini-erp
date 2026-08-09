import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { challanAPI, customerAPI, productAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Search,
  Filter,
  Plus,
  RefreshCw,
  FileText,
  Trash2,
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle,
  FileCheck,
  Eye,
  User,
  ShoppingBag,
  Coins,
  Edit3
} from 'lucide-react';

export default function Challans() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [challans, setChallans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Dropdowns for form choices
  const [customersList, setCustomersList] = useState([]);
  const [productsList, setProductsList] = useState([]);
  const [listsLoading, setListsLoading] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');

  // Pagination states
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  // Modals & States
  const [selectedChallan, setSelectedChallan] = useState(null);
  const [selectedChallanLoading, setSelectedChallanLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editChallanId, setEditChallanId] = useState(null); // holds id if editing draft

  const [actionSuccess, setActionSuccess] = useState('');
  const [actionError, setActionError] = useState('');
  const [isConfirmingAction, setIsConfirmingAction] = useState(false);
  const [isCancellingAction, setIsCancellingAction] = useState(false);
  const [actionRunning, setActionRunning] = useState(false);

  useEffect(() => {
    setActionSuccess('');
    setActionError('');
    setIsConfirmingAction(false);
    setIsCancellingAction(false);
    setActionRunning(false);
  }, [selectedChallan]);

  // Form states - Create or Edit Challan
  const [challanForm, setChallanForm] = useState({
    customerId: '',
    items: [{ productId: '', quantity: 1 }],
    status: 'Draft',
  });
  const [formErrors, setFormErrors] = useState({});
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Load sales challans list
  const fetchChallans = useCallback(async () => {
    setLoading(true);
    try {
      const data = await challanAPI.getChallans({ status: statusFilter, page, limit: 10 });
      setChallans(data.challans);
      if (data.pagination) {
        setTotalPages(data.pagination.totalPages || 1);
        setTotalRecords(data.pagination.total || 0);
      }
    } catch (err) {
      console.error(err);
      setError('Could not retrieve Sales Challan timeline.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, page]);

  // Reset page when filter status changes
  useEffect(() => {
    setPage(1);
  }, [statusFilter]);

  // Load backend dependency catalogs for forms
  const fetchFormDropdowns = useCallback(async () => {
    setListsLoading(true);
    try {
      const [custData, prodData] = await Promise.all([
        customerAPI.getCustomers({ status: 'Active' }), // Only active customers can load new billing profiles
        productAPI.getProducts()
      ]);
      setCustomersList(custData.customers);
      setProductsList(prodData.products);
    } catch (err) {
      console.error(err);
      setError('Failed to download dynamic CRM & Warehouse references.');
    } finally {
      setListsLoading(false);
    }
  }, []);

  // Read query parameters
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('new') === 'true') {
      setShowAddModal(true);
      navigate('/challans', { replace: true });
    }
  }, [location, navigate]);

  useEffect(() => {
    fetchChallans();
    fetchFormDropdowns();
  }, [fetchChallans, fetchFormDropdowns]);

  // Load Single Challan details
  const loadSingleChallan = async (id) => {
    setSelectedChallanLoading(true);
    try {
      const data = await challanAPI.getChallan(id);
      setSelectedChallan(data.challan);
    } catch (err) {
      console.error(err);
      alert('Could not details for matching sales challan');
    } finally {
      setSelectedChallanLoading(false);
    }
  };

  // Perform confirm challan operation (atomic inventory check & update)
  const executeConfirmChallan = async (id) => {
    setActionRunning(true);
    setActionError('');
    setActionSuccess('');
    try {
      const res = await challanAPI.confirmChallan(id);
      setActionSuccess(res.message);
      setIsConfirmingAction(false);
      // Refresh current scopes
      if (selectedChallan && selectedChallan.id === id) {
        await loadSingleChallan(id);
      }
      fetchChallans();
    } catch (err) {
      console.error(err);
      setActionError(err.message || 'Confirmation operation failed');
    } finally {
      setActionRunning(false);
    }
  };

  // Perform cancel challan operation (with inventory restoration if confirmed)
  const executeCancelChallan = async (id) => {
    setActionRunning(true);
    setActionError('');
    setActionSuccess('');
    try {
      const res = await challanAPI.cancelChallan(id);
      setActionSuccess(res.message);
      setIsCancellingAction(false);
      if (selectedChallan && selectedChallan.id === id) {
        await loadSingleChallan(id);
      }
      fetchChallans();
    } catch (err) {
      console.error(err);
      setActionError(err.message || 'Cancellation failed');
    } finally {
      setActionRunning(false);
    }
  };

  // Prepopulate edit challan form (only if status is Draft)
  const handleEditChallanClick = async (challan) => {
    if (challan.status !== 'Draft') {
      alert('Only Draft challans can be modified.');
      return;
    }
    setEditChallanId(challan.id);
    setSelectedChallan(null); // Close details modal if open
    
    // Format items details for forms
    const formattedItems = challan.items.map(item => ({
      productId: item.productId,
      quantity: item.quantity
    }));

    setChallanForm({
      customerId: challan.customerId,
      items: formattedItems,
      status: 'Draft'
    });
    setShowAddModal(true);
  };

  // Form items mutations
  const handleAddItemRow = () => {
    setChallanForm({
      ...challanForm,
      items: [...challanForm.items, { productId: '', quantity: 1 }]
    });
  };

  const handleRemoveItemRow = (idx) => {
    const updated = challanForm.items.filter((_, i) => i !== idx);
    setChallanForm({ ...challanForm, items: updated });
  };

  const handleItemFieldChange = (idx, field, value) => {
    const updated = challanForm.items.map((item, i) => {
      if (i === idx) {
        return {
          ...item,
          [field]: field === 'quantity' ? Math.max(1, parseInt(value, 10) || 1) : value
        };
      }
      return item;
    });
    setChallanForm({ ...challanForm, items: updated });
  };

  // Calculate live amount summary on item list
  const runningTotalAmount = useMemo(() => {
    let total = 0;
    challanForm.items.forEach(item => {
      const product = productsList.find(p => p.id === item.productId);
      if (product) {
        total += Number(product.unitPrice) * item.quantity;
      }
    });
    return total;
  }, [challanForm.items, productsList]);

  // Submit new/edited challan
  const handleChallanSubmit = async (e) => {
    e.preventDefault();
    setFormErrors({});

    const errors = {};
    if (!challanForm.customerId) errors.customerId = 'Choosing a Customer account is required';
    
    // Validate rows
    const itemsErrors = [];
    challanForm.items.forEach((item, idx) => {
      if (!item.productId) {
        itemsErrors[idx] = 'Select product';
      } else if (!item.quantity || isNaN(Number(item.quantity)) || Number(item.quantity) <= 0 || !Number.isInteger(Number(item.quantity))) {
        itemsErrors[idx] = 'Must be a positive whole integer';
      } else if (challanForm.status === 'Confirmed') {
        const prod = productsList.find(p => p.id === item.productId);
        if (prod && prod.currentStock < item.quantity) {
          itemsErrors[idx] = `Low Stock. Available: ${prod.currentStock}`;
        }
      }
    });

    if (itemsErrors.length > 0) {
      errors.items = itemsErrors;
      setFormErrors(errors);
      return;
    }

    setFormSubmitting(true);
    try {
      if (editChallanId) {
        // Edit draft
        await challanAPI.updateChallan(editChallanId, {
          customerId: challanForm.customerId,
          items: challanForm.items
        });
        alert('Draft Challan updated successfully.');
      } else {
        // Create new
        await challanAPI.createChallan(challanForm);
        alert(`Sales Challan generated in ${challanForm.status} status.`);
      }
      
      setShowAddModal(false);
      setEditChallanId(null);
      setChallanForm({
        customerId: '',
        items: [{ productId: '', quantity: 1 }],
        status: 'Draft',
      });
      fetchChallans();
    } catch (err) {
      console.error(err);
      setFormErrors({ api: err.message || 'Operation failed' });
    } finally {
      setFormSubmitting(false);
    }
  };

  // Close create modal and reset edit trackers
  const closeAddModal = () => {
    setShowAddModal(false);
    setEditChallanId(null);
    setChallanForm({
      customerId: '',
      items: [{ productId: '', quantity: 1 }],
      status: 'Draft',
    });
    setFormErrors({});
  };

  const isBillingUser = user?.role === 'Admin' || user?.role === 'Sales';
  const isDispatchUser = user?.role === 'Admin' || user?.role === 'Warehouse' || user?.role === 'Sales';

  return (
    <div>
      {/* Search & Filter Top Panel */}
      <div className="card-header" style={{ marginBottom: '2rem' }}>
        <div className="interactive-panel" style={{ margin: 0, flex: 1 }}>
          <div className="filter-select-wrapper">
            <select className="filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All Challan Pipeline States</option>
              <option value="Draft">Draft (Hold)</option>
              <option value="Confirmed">Confirmed (Stock Deducted)</option>
              <option value="Cancelled">Cancelled (Reverted)</option>
            </select>
          </div>
        </div>

        {isBillingUser && (
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            <Plus size={18} />
            <span>Generate Challan</span>
          </button>
        )}
      </div>

      {/* Main timeline listing */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
          <RefreshCw size={32} style={{ animation: 'spin 1.5s linear infinite', color: 'var(--color-primary)' }} />
        </div>
      ) : error ? (
        <div className="alert-box alert-danger">{error}</div>
      ) : challans.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '4rem' }}>
          <FileText size={48} style={{ color: 'var(--text-dim)', marginBottom: '1rem' }} />
          <p style={{ color: 'var(--text-muted)' }}>No sales challans recorded matching pipeline status.</p>
        </div>
      ) : (
        <>
          <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Challan ID</th>
                <th>Client Name</th>
                <th>Units Loaded</th>
                <th>Subtotal Value</th>
                <th>Created Date</th>
                <th>Pipeline State</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {challans.map((ch) => (
                <tr key={ch.id}>
                  <td style={{ fontWeight: 800 }}>{ch.challanNumber}</td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{ch.customer?.customerName}</div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{ch.customer?.businessName}</span>
                  </td>
                  <td>{ch.totalQuantity} items</td>
                  <td style={{ fontWeight: 700 }}>₹{Number(ch.totalAmount).toLocaleString()}</td>
                  <td style={{ fontSize: '0.85rem' }}>{new Date(ch.createdAt).toLocaleDateString()}</td>
                  <td>
                    <span className={`badge badge-${ch.status.toLowerCase()}`}>
                      {ch.status}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.35rem' }}>
                      <button 
                        className="btn btn-secondary" 
                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                        onClick={() => loadSingleChallan(ch.id)}
                      >
                        <Eye size={12} style={{ display: 'inline', marginRight: '0.2rem' }} />
                        <span>View Details</span>
                      </button>

                      {ch.status === 'Draft' && isBillingUser && (
                        <button 
                          className="btn btn-primary" 
                          style={{ 
                            padding: '0.4rem 0.8rem', 
                            fontSize: '0.8rem',
                            background: 'linear-gradient(135deg, #4f46e5, #8b5cf6)'
                          }}
                          onClick={() => handleEditChallanClick(ch)}
                        >
                          <Edit3 size={12} style={{ display: 'inline', marginRight: '0.2rem' }} />
                          <span>Edit</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
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

      {/* View Challan Item Details & Confirmation Overlay */}
      {selectedChallan && (
        <div className="modal-overlay" onClick={() => setSelectedChallan(null)}>
          <div className="modal-dialog" style={{ maxWidth: '700px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 style={{ fontSize: '1.25rem' }}>Sales Challan: {selectedChallan.challanNumber}</h3>
                <span className={`badge badge-${selectedChallan.status.toLowerCase()}`} style={{ marginTop: '0.25rem' }}>
                  {selectedChallan.status}
                </span>
              </div>
              <button className="modal-close" onClick={() => setSelectedChallan(null)}>&times;</button>
            </div>

            <div className="modal-body">
              {actionSuccess && (
                <div className="alert-box alert-success" style={{ padding: '0.75rem', marginBottom: '1rem', fontSize: '0.85rem' }}>
                  {actionSuccess}
                </div>
              )}
              {actionError && (
                <div className="alert-box alert-danger" style={{ padding: '0.75rem', marginBottom: '1rem', fontSize: '0.85rem' }}>
                  {actionError}
                </div>
              )}
              {selectedChallanLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
                  <RefreshCw size={24} style={{ animation: 'spin 1.5s linear infinite' }} />
                </div>
              ) : (
                <div>
                  {/* Summary grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem', background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', fontSize: '0.85rem' }}>
                    <div>
                      <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--color-primary)', marginBottom: '0.5rem' }}>
                        <User size={14} />
                        <span>Client Particulars</span>
                      </h4>
                      <div><strong>Name:</strong> {selectedChallan.customer?.customerName}</div>
                      <div><strong>Trade:</strong> {selectedChallan.customer?.businessName}</div>
                      <div><strong>GST:</strong> <code>{selectedChallan.customer?.gstNumber || 'N/A'}</code></div>
                      <div><strong>Address:</strong> {selectedChallan.customer?.address}</div>
                    </div>
                    <div>
                      <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--color-primary)', marginBottom: '0.5rem' }}>
                        <FileText size={14} />
                        <span>Billing Details</span>
                      </h4>
                      <div><strong>Created Date:</strong> {new Date(selectedChallan.createdAt).toLocaleString()}</div>
                      <div><strong>Account Handler:</strong> {selectedChallan.user?.name} ({selectedChallan.user?.role})</div>
                      <div><strong>Pipeline status:</strong> <strong style={{ color: 'var(--warning)' }}>{selectedChallan.status}</strong></div>
                    </div>
                  </div>

                  {/* Items Snapshots list */}
                  <h4 style={{ fontSize: '0.9rem', marginBottom: '0.75rem', fontWeight: 700 }}>Sales Challan Items Snapshots</h4>
                  <div className="table-responsive" style={{ marginBottom: '1.5rem' }}>
                    <table style={{ fontSize: '0.85rem' }}>
                      <thead>
                        <tr>
                          <th>SKU</th>
                          <th>Product Snap Name</th>
                          <th>Rate Unit</th>
                          <th>Qty</th>
                          <th>Total Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedChallan.items?.map((item) => (
                          <tr key={item.id}>
                            <td><code>{item.skuSnapshot}</code></td>
                            <td style={{ fontWeight: 600 }}>{item.productNameSnapshot}</td>
                            <td>₹{Number(item.unitPriceSnapshot).toLocaleString()}</td>
                            <td style={{ fontWeight: 700 }}>{item.quantity}</td>
                            <td style={{ fontWeight: 700 }}>₹{Number(item.subtotal).toLocaleString()}</td>
                          </tr>
                        ))}
                        <tr style={{ backgroundColor: 'var(--bg-tertiary)', fontWeight: 700 }}>
                          <td colSpan="3" style={{ textAlign: 'right' }}>Grand Total Summary:</td>
                          <td>{selectedChallan.totalQuantity} items</td>
                          <td style={{ color: 'var(--color-primary)', fontSize: '1rem' }}>₹{Number(selectedChallan.totalAmount).toLocaleString()}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Context controls depending on state and user roles */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', background: '#1c1917', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                    <h4 style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Operations Actions Panel</h4>

                    {isConfirmingAction && (
                      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', padding: '1rem', borderRadius: 'var(--radius-sm)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Confirm dispatch and deduct item stocks?</span>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button type="button" className="btn btn-primary" onClick={() => executeConfirmChallan(selectedChallan.id)} style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }} disabled={actionRunning}>
                            {actionRunning ? 'Dispatching...' : 'Yes, Confirm'}
                          </button>
                          <button type="button" className="btn btn-secondary" onClick={() => setIsConfirmingAction(false)} style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }} disabled={actionRunning}>
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    {isCancellingAction && (
                      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', padding: '1rem', borderRadius: 'var(--radius-sm)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--danger)' }}>Void this challan and restore inventory stock?</span>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button type="button" className="btn btn-danger" onClick={() => executeCancelChallan(selectedChallan.id)} style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', border: 'none' }} disabled={actionRunning}>
                            {actionRunning ? 'Voiding...' : 'Yes, Void'}
                          </button>
                          <button type="button" className="btn btn-secondary" onClick={() => setIsCancellingAction(false)} style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }} disabled={actionRunning}>
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    {!isConfirmingAction && !isCancellingAction && (
                      <>
                        {selectedChallan.status === 'Draft' && (
                          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                            {isDispatchUser && (
                              <button 
                                className="btn btn-primary" 
                                style={{ flex: 1, minWidth: '150px' }}
                                onClick={() => setIsConfirmingAction(true)}
                              >
                                <CheckCircle size={16} />
                                <span>Confirm Stock Dispatch</span>
                              </button>
                            )}
                            {isBillingUser && (
                              <button 
                                className="btn btn-secondary" 
                                style={{ flex: 1, minWidth: '120px' }}
                                onClick={() => handleEditChallanClick(selectedChallan)}
                              >
                                <Edit3 size={16} style={{ display: 'inline', marginRight: '0.2rem' }} />
                                <span>Change Draft Items</span>
                              </button>
                            )}
                            {isBillingUser && (
                              <button 
                                className="btn btn-danger" 
                                style={{ minWidth: '100px' }}
                                onClick={() => setIsCancellingAction(true)}
                              >
                                <XCircle size={16} />
                                <span>Cancel Challan</span>
                              </button>
                            )}
                          </div>
                        )}

                        {selectedChallan.status === 'Confirmed' && isBillingUser && (
                          <div>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                              This sales challan was confirmed. If you cancel this confirmed challan, the inventory items will be restored to the warehouse.
                            </p>
                            <button 
                              className="btn btn-danger" 
                              style={{ width: '100%' }}
                              onClick={() => setIsCancellingAction(true)}
                            >
                              <XCircle size={16} />
                              <span>Void & Restore Inventory Stock</span>
                            </button>
                          </div>
                        )}

                        {selectedChallan.status === 'Cancelled' && (
                          <p style={{ fontSize: '0.85rem', color: 'var(--danger)', fontStyle: 'italic', textAlign: 'center', margin: 0 }}>
                            This Sales Challan has been cancelled/voided. No further actions can be performed on this transaction.
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setSelectedChallan(null)}>Close Invoice</button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Challan Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={closeAddModal}>
          <div className="modal-dialog" style={{ maxWidth: '650px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShoppingBag size={22} className="text-secondary" />
                <span>{editChallanId ? 'Update Draft Sales Challan' : 'Generate New Sales Challan'}</span>
              </h3>
              <button className="modal-close" onClick={closeAddModal}>&times;</button>
            </div>

            <form onSubmit={handleChallanSubmit}>
              <div className="modal-body">
                {formErrors.api && <div className="alert-box alert-danger">{formErrors.api}</div>}

                {/* Customer Account Picker */}
                <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                  <label>Select Clientele Account*</label>
                  {listsLoading ? (
                    <span style={{ fontSize: '0.85rem' }}>Syncing CRM...</span>
                  ) : (
                    <div className="filter-select-wrapper" style={{ width: '100%' }}>
                      <select 
                        className="filter-select"
                        value={challanForm.customerId}
                        onChange={(e) => setChallanForm({ ...challanForm, customerId: e.target.value })}
                        style={{ width: '100%', backgroundColor: 'var(--bg-tertiary)' }}
                        required
                      >
                        <option value="">Choose active account</option>
                        {customersList.map(cust => (
                          <option key={cust.id} value={cust.id}>
                            {cust.customerName} ({cust.businessName})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  {formErrors.customerId && <span className="error-text">{formErrors.customerId}</span>}
                </div>

                {/* Items collection rows */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                  <h4 style={{ fontSize: '0.9rem' }}>Invoice Item Particulars*</h4>
                  <button type="button" className="btn btn-secondary" onClick={handleAddItemRow} style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}>
                    + Add Product Line
                  </button>
                </div>

                <div style={{ maxHeight: '30vh', overflowY: 'auto', marginBottom: '1rem', paddingRight: '0.25rem' }}>
                  {challanForm.items.map((item, idx) => {
                    const selectedProd = productsList.find(p => p.id === item.productId);
                    return (
                      <div key={idx} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', alignItems: 'flex-start' }}>
                        <div className="filter-select-wrapper" style={{ flex: 1 }}>
                          <select 
                            className="filter-select"
                            value={item.productId}
                            onChange={(e) => handleItemFieldChange(idx, 'productId', e.target.value)}
                            style={{ width: '100%', backgroundColor: 'var(--bg-tertiary)', fontSize: '0.85rem' }}
                            required
                          >
                            <option value="">Choose item...</option>
                            {productsList.map(prod => (
                              <option key={prod.id} value={prod.id} disabled={prod.currentStock === 0}>
                                {prod.productName} (SKU: {prod.sku}) — ₹{Number(prod.unitPrice)} [Stock: {prod.currentStock}]
                              </option>
                            ))}
                          </select>
                          {formErrors.items?.[idx] && <span className="error-text" style={{ fontSize: '0.7rem' }}>{formErrors.items[idx]}</span>}
                        </div>

                        <div style={{ width: '80px' }}>
                          <input
                            type="number"
                            step="any"
                            min={1}
                            placeholder="Qty"
                            className="form-control"
                            value={item.quantity}
                            onChange={(e) => handleItemFieldChange(idx, 'quantity', e.target.value)}
                            style={{ fontSize: '0.85rem', padding: '0.75rem 0.5rem', textAlign: 'center' }}
                            required
                          />
                        </div>

                        <div style={{ width: '100px', padding: '0.65rem 0', fontSize: '0.85rem', textAlign: 'right', fontWeight: 600, color: 'var(--text-muted)' }}>
                          ₹{selectedProd ? (Number(selectedProd.unitPrice) * item.quantity).toLocaleString() : '0'}
                        </div>

                        <button 
                          type="button" 
                          className="btn btn-secondary" 
                          onClick={() => handleRemoveItemRow(idx)}
                          style={{ padding: '0.6rem', color: 'var(--danger)' }}
                          disabled={challanForm.items.length === 1}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Pre-fill state: only for new entries (Draft vs Confirmed) */}
                {!editChallanId && (
                  <div className="form-group" style={{ marginTop: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                    <label>Save Record State</label>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 500, cursor: 'pointer' }}>
                        <input
                          type="radio"
                          name="challanStatus"
                          value="Draft"
                          checked={challanForm.status === 'Draft'}
                          onChange={() => setChallanForm({ ...challanForm, status: 'Draft' })}
                        />
                        <span>Save as Draft (Stocks Hold)</span>
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 500, cursor: 'pointer' }}>
                        <input
                          type="radio"
                          name="challanStatus"
                          value="Confirmed"
                          checked={challanForm.status === 'Confirmed'}
                          onChange={() => setChallanForm({ ...challanForm, status: 'Confirmed' })}
                        />
                        <span>Confirm Immediately (Deduct Inventory)</span>
                      </label>
                    </div>
                  </div>
                )}

                {/* Total amount helper indicator */}
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '1rem', marginTop: '1rem', fontWeight: 700 }}>
                  <span>Estimated Challan Total Amount:</span>
                  <span style={{ color: 'var(--color-primary)', fontSize: '1.15rem' }}>₹{runningTotalAmount.toLocaleString()}</span>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeAddModal}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={formSubmitting}>
                  {formSubmitting ? 'Saving record...' : editChallanId ? 'Update Draft' : 'Create Sales Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
