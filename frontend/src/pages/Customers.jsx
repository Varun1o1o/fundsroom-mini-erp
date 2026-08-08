import React, { useEffect, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { customerAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Search,
  Filter,
  Plus,
  Phone,
  Mail,
  Briefcase,
  MapPin,
  Calendar,
  Clock,
  UserPlus,
  RefreshCw,
  X,
  FileCheck,
  FileText
} from 'lucide-react';

export default function Customers() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [type, setType] = useState('');

  // Pagination states
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  // Modals & Selections
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedCustomerLoading, setSelectedCustomerLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form states - Create customer
  const [custForm, setCustForm] = useState({
    customerName: '',
    mobileNumber: '',
    email: '',
    businessName: '',
    gstNumber: '',
    customerType: 'Retail',
    address: '',
    status: 'Lead',
    notes: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Form states - Create follow up
  const [followNote, setFollowNote] = useState('');
  const [followDate, setFollowDate] = useState('');
  const [followSubmitting, setFollowSubmitting] = useState(false);

  // Fetch customers list
  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await customerAPI.getCustomers({ search, status, type, page, limit: 10 });
      setCustomers(data.customers);
      if (data.pagination) {
        setTotalPages(data.pagination.totalPages || 1);
        setTotalRecords(data.pagination.total || 0);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to fetch customers list.');
    } finally {
      setLoading(false);
    }
  }, [search, status, type, page]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [search, status, type]);

  // Read URL query parameters to check if they want to open Create Modal directly
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('new') === 'true') {
      setShowAddModal(true);
      // Clean query parameter after trigger
      navigate('/customers', { replace: true });
    }
  }, [location, navigate]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  // Load detailed single customer follow-ups and history
  const loadSingleCustomer = async (id) => {
    setSelectedCustomerLoading(true);
    try {
      const data = await customerAPI.getCustomer(id);
      setSelectedCustomer(data.customer);

      // Prepopulate followUpDate input to tomorrow by default
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setFollowDate(tomorrow.toISOString().split('T')[0]);
      setFollowNote('');
    } catch (err) {
      console.error(err);
      alert('Could not details for matching customer');
    } finally {
      setSelectedCustomerLoading(false);
    }
  };

  // Create customer submission handler
  const handleCreateCustomerSubmit = async (e) => {
    e.preventDefault();
    setFormErrors({});

    // Validate inputs
    const errors = {};
    if (!custForm.customerName.trim()) errors.customerName = 'Name is required';
    if (!custForm.mobileNumber.trim() || custForm.mobileNumber.length < 10) {
      errors.mobileNumber = 'Provide a valid 10-digit mobile number';
    }
    if (!custForm.email.trim() || !/\S+@\S+\.\S+/.test(custForm.email)) {
      errors.email = 'Provide a valid email address';
    }
    if (!custForm.businessName.trim()) errors.businessName = 'Business Name is required';
    if (custForm.gstNumber && custForm.gstNumber.trim().length !== 15) {
      errors.gstNumber = 'GST Number must be exactly 15 characters';
    }
    if (!custForm.address.trim()) errors.address = 'Primary Address is required';

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setFormSubmitting(true);
    try {
      await customerAPI.createCustomer(custForm);
      setShowAddModal(false);
      // Reset form
      setCustForm({
        customerName: '',
        mobileNumber: '',
        email: '',
        businessName: '',
        gstNumber: '',
        customerType: 'Retail',
        address: '',
        status: 'Lead',
        notes: ''
      });
      fetchCustomers();
    } catch (err) {
      console.error(err);
      setFormErrors({ api: err.message || 'Operation failed' });
    } finally {
      setFormSubmitting(false);
    }
  };

  // Add follow-up submission handler
  const handleFollowUpSubmit = async (e) => {
    e.preventDefault();
    if (!followNote.trim() || !followDate) {
      alert('Please enter follow-up comments and pick next deadline');
      return;
    }

    setFollowSubmitting(true);
    try {
      await customerAPI.createFollowUp(selectedCustomer.id, followNote, followDate);
      // Reload customer details and updates lists
      await loadSingleCustomer(selectedCustomer.id);
      fetchCustomers();
    } catch (err) {
      console.error(err);
      alert(err.message || 'Failed to record follow up');
    } finally {
      setFollowSubmitting(false);
    }
  };

  // Checks user role permissions
  const canModify = user?.role === 'Admin' || user?.role === 'Sales';

  return (
    <div>
      {/* Top action layout */}
      <div className="card-header" style={{ marginBottom: '2rem' }}>
        <div className="interactive-panel" style={{ margin: 0, flex: 1 }}>
          <div className="search-container">
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
            <input
              type="text"
              placeholder="Search by name, trade or contact..."
              className="form-control"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '2.50rem' }}
            />
          </div>

          <div className="filter-select-wrapper">
            <select className="filter-select" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All Statuses</option>
              <option value="Lead">Leads</option>
              <option value="Active">Active Customers</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          <div className="filter-select-wrapper">
            <select className="filter-select" value={type} onChange={(e) => setType(e.target.value)}>
              <option value="">All Trade Types</option>
              <option value="Retail">Retail</option>
              <option value="Wholesale">Wholesale</option>
              <option value="Distributor">Distributor</option>
            </select>
          </div>
        </div>

        {canModify && (
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            <Plus size={18} />
            <span>Add Customer</span>
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
          <RefreshCw size={32} style={{ animation: 'spin 1.5s linear infinite', color: 'var(--color-primary)' }} />
        </div>
      ) : error ? (
        <div className="alert-box alert-danger">{error}</div>
      ) : customers.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '4rem' }}>
          <Users size={48} style={{ color: 'var(--text-dim)', marginBottom: '1rem' }} />
          <p style={{ color: 'var(--text-muted)' }}>No customers matching current filters.</p>
        </div>
      ) : (
        <>
          <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Customer / Co.</th>
                <th>Contact details</th>
                <th>Type</th>
                <th>Status</th>
                <th>Next Follow-up</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((cust) => (
                <tr key={cust.id}>
                  <td>
                    <div style={{ fontWeight: 700 }}>{cust.customerName}</div>
                    <div style={{ fontSize: '0.785rem', color: 'var(--text-dim)' }}>
                      {cust.businessName} {cust.gstNumber && `| GST: ${cust.gstNumber}`}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem' }}>
                      <Phone size={12} className="text-dim" />
                      <span>{cust.mobileNumber}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.785rem', color: 'var(--text-dim)', marginTop: '0.15rem' }}>
                      <Mail size={12} className="text-dim" />
                      <span>{cust.email}</span>
                    </div>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{cust.customerType}</span>
                  </td>
                  <td>
                    <span className={`badge badge-${cust.status.toLowerCase()}`}>
                      {cust.status}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.85rem' }}>
                    {cust.followUpDate ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: new Date(cust.followUpDate) <= new Date() ? 'var(--warning)' : 'inherit' }}>
                        <Calendar size={14} />
                        <span>{new Date(cust.followUpDate).toLocaleDateString()}</span>
                      </div>
                    ) : (
                      <span style={{ color: 'var(--text-dim)' }}>No date set</span>
                    )}
                  </td>
                  <td>
                    <button 
                      className="btn btn-secondary" 
                      style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                      onClick={() => loadSingleCustomer(cust.id)}
                    >
                      CRM Logs & Details
                    </button>
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

      {/* CRM Logs and Customer Details Modal */}
      {selectedCustomer && (
        <div className="modal-overlay" onClick={() => setSelectedCustomer(null)}>
          <div className="modal-dialog" style={{ maxWidth: '750px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 style={{ fontSize: '1.25rem' }}>{selectedCustomer.customerName}</h3>
                <span className="badge badge-user-role" style={{ marginTop: '0.25rem' }}>{selectedCustomer.customerType} Profile</span>
              </div>
              <button className="modal-close" onClick={() => setSelectedCustomer(null)}>&times;</button>
            </div>
            
            <div className="modal-body">
              {selectedCustomerLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
                  <RefreshCw size={24} style={{ animation: 'spin 1.5s linear infinite' }} />
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                  {/* Left Column: Profile Particulars */}
                  <div>
                    <h4 style={{ fontSize: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1rem', color: 'var(--color-primary)' }}>
                      Contact Info
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.9rem' }}>
                      <div>
                        <strong>Business Name:</strong>
                        <div>{selectedCustomer.businessName}</div>
                      </div>
                      {selectedCustomer.gstNumber && (
                        <div>
                          <strong>GSTIN:</strong>
                          <div><code>{selectedCustomer.gstNumber}</code></div>
                        </div>
                      )}
                      <div>
                        <strong>Mobile:</strong>
                        <div>{selectedCustomer.mobileNumber}</div>
                      </div>
                      <div>
                        <strong>Email Address:</strong>
                        <div>{selectedCustomer.email}</div>
                      </div>
                      <div>
                        <strong>Delivery Address:</strong>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.15rem' }}>{selectedCustomer.address}</div>
                      </div>
                      <div>
                        <strong>General Notes:</strong>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.15rem' }}>{selectedCustomer.notes || 'None logged.'}</div>
                      </div>
                    </div>

                    {/* Simple Customer Sales Summary */}
                    <div style={{ marginTop: '1.5rem', background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 600 }}>Total Orders</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{selectedCustomer.challans?.length || 0}</div>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Challans created under this profile.</p>
                    </div>
                  </div>

                  {/* Right Column: CRM Timeline & Log Action */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    
                    {/* Add CRM contact follow-up log */}
                    {canModify && (
                      <div style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '1rem' }}>
                        <h4 style={{ fontSize: '0.9rem', marginBottom: '0.75rem', fontWeight: 700 }}>Log CRM Contact Interaction</h4>
                        <form onSubmit={handleFollowUpSubmit}>
                          <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                            <textarea
                              rows={2}
                              className="form-control"
                              placeholder="Describe discussion notes, issues, requirements discussed..."
                              value={followNote}
                              onChange={(e) => setFollowNote(e.target.value)}
                              style={{ resize: 'none', fontSize: '0.85rem' }}
                              required
                            />
                          </div>

                          <div className="form-group" style={{ marginBottom: '1rem' }}>
                            <label style={{ fontSize: '0.75rem' }}>Scheduler Next Follow-up</label>
                            <input
                              type="date"
                              className="form-control"
                              value={followDate}
                              onChange={(e) => setFollowDate(e.target.value)}
                              style={{ fontSize: '0.85rem' }}
                              required
                            />
                          </div>

                          <button 
                            type="submit" 
                            className="btn btn-primary" 
                            style={{ width: '100%', padding: '0.5rem', fontSize: '0.85rem' }}
                            disabled={followSubmitting}
                          >
                            {followSubmitting ? 'Logging...' : 'Save Interaction Log'}
                          </button>
                        </form>
                      </div>
                    )}

                    {/* Interaction entries timeline */}
                    <div style={{ flex: 1, minHeight: '200px', display: 'flex', flexDirection: 'column' }}>
                      <h4 style={{ fontSize: '0.9rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                        Call Log History ({selectedCustomer.followUps?.length || 0})
                      </h4>
                      <div style={{ flex: 1, overflowY: 'auto', maxHeight: '250px', paddingRight: '0.25rem' }}>
                        {selectedCustomer.followUps && selectedCustomer.followUps.length > 0 ? (
                          <div className="timeline">
                            {selectedCustomer.followUps.map((log) => (
                              <div className="timeline-item" key={log.id}>
                                <div className="timeline-marker"></div>
                                <div className="timeline-content" style={{ padding: '0.6rem' }}>
                                  <div className="timeline-header" style={{ marginBottom: '0.25rem' }}>
                                    <span style={{ fontWeight: 600 }}>{log.user?.name} ({log.user?.role})</span>
                                    <span>{new Date(log.createdAt).toLocaleDateString()}</span>
                                  </div>
                                  <p style={{ fontSize: '0.8rem', color: 'var(--text-main)' }}>{log.note}</p>
                                  <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '0.2rem', marginTop: '0.25rem' }}>
                                    <Clock size={10} />
                                    <span>Next contact scheduled: {new Date(log.followUpDate).toLocaleDateString()}</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p style={{ color: 'var(--text-dim)', textAlign: 'center', fontSize: '0.85rem', padding: '1rem' }}>No calls logged.</p>
                        )}
                      </div>
                    </div>

                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setSelectedCustomer(null)}>Close Profile</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Customer Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-dialog" style={{ maxWidth: '650px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <UserPlus size={22} className="text-secondary" />
                <span>Register CRM Customer Account</span>
              </h3>
              <button className="modal-close" onClick={() => setShowAddModal(false)}>&times;</button>
            </div>

            <form onSubmit={handleCreateCustomerSubmit}>
              <div className="modal-body">
                {formErrors.api && (
                  <div className="alert-box alert-danger">{formErrors.api}</div>
                )}

                <div className="form-grid">
                  <div className="form-group">
                    <label>Customer Name*</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Varun Kumar"
                      value={custForm.customerName}
                      onChange={(e) => setCustForm({ ...custForm, customerName: e.target.value })}
                    />
                    {formErrors.customerName && <span className="error-text">{formErrors.customerName}</span>}
                  </div>

                  <div className="form-group">
                    <label>Business / Trade Name*</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Varun Enterprise"
                      value={custForm.businessName}
                      onChange={(e) => setCustForm({ ...custForm, businessName: e.target.value })}
                    />
                    {formErrors.businessName && <span className="error-text">{formErrors.businessName}</span>}
                  </div>

                  <div className="form-group">
                    <label>Contact Number (Mobile)*</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Enter 10-digit number"
                      maxLength={10}
                      value={custForm.mobileNumber}
                      onChange={(e) => setCustForm({ ...custForm, mobileNumber: e.target.value.replace(/\D/g, '') })}
                    />
                    {formErrors.mobileNumber && <span className="error-text">{formErrors.mobileNumber}</span>}
                  </div>

                  <div className="form-group">
                    <label>Email Address*</label>
                    <input
                      type="email"
                      className="form-control"
                      placeholder="client@domain.com"
                      value={custForm.email}
                      onChange={(e) => setCustForm({ ...custForm, email: e.target.value })}
                    />
                    {formErrors.email && <span className="error-text">{formErrors.email}</span>}
                  </div>

                  <div className="form-group">
                    <label>Customer Category</label>
                    <div className="filter-select-wrapper" style={{ width: '100%' }}>
                      <select 
                        className="filter-select" 
                        value={custForm.customerType} 
                        onChange={(e) => setCustForm({ ...custForm, customerType: e.target.value })}
                        style={{ width: '100%', backgroundColor: 'var(--bg-tertiary)' }}
                      >
                        <option value="Retail">Retail Shopkeeper</option>
                        <option value="Wholesale">Wholesale Trader</option>
                        <option value="Distributor">Regional Distributor</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>GST Number (Optional)</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="15-digit AlphaNumeric code"
                      maxLength={15}
                      value={custForm.gstNumber}
                      onChange={(e) => setCustForm({ ...custForm, gstNumber: e.target.value.toUpperCase() })}
                    />
                    {formErrors.gstNumber && <span className="error-text">{formErrors.gstNumber}</span>}
                  </div>

                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label>Correspondence Address*</label>
                    <textarea
                      rows={2}
                      className="form-control"
                      placeholder="Full delivery location details..."
                      value={custForm.address}
                      onChange={(e) => setCustForm({ ...custForm, address: e.target.value })}
                      style={{ resize: 'none' }}
                    />
                    {formErrors.address && <span className="error-text">{formErrors.address}</span>}
                  </div>

                  <div className="form-group">
                    <label>Lead Flow Status</label>
                    <div className="filter-select-wrapper" style={{ width: '100%' }}>
                      <select 
                        className="filter-select" 
                        value={custForm.status} 
                        onChange={(e) => setCustForm({ ...custForm, status: e.target.value })}
                        style={{ width: '100%', backgroundColor: 'var(--bg-tertiary)' }}
                      >
                        <option value="Lead">Potential Lead</option>
                        <option value="Active">Authorized Active</option>
                        <option value="Inactive">Blacklisted / Inactive</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label>Orientation Registration Notes*</label>
                    <textarea
                      rows={2}
                      className="form-control"
                      placeholder="Add primary instructions or credit requirements..."
                      value={custForm.notes}
                      onChange={(e) => setCustForm({ ...custForm, notes: e.target.value })}
                      style={{ resize: 'none' }}
                    />
                    {formErrors.notes && <span className="error-text">{formErrors.notes}</span>}
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={formSubmitting}>
                  {formSubmitting ? 'Registering Account...' : 'Register Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
