const API_BASE = 'http://localhost:5000/api';

export async function apiCall(endpoint, options = {}) {
  const token = localStorage.getItem('erp_token');
  
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const config = {
    ...options,
    headers,
  };

  if (options.body && typeof options.body === 'object') {
    config.body = JSON.stringify(options.body);
  }

  const response = await fetch(`${API_BASE}${endpoint}`, config);
  const data = await response.json();

  if (!response.ok) {
    const errorMsg = data.message || 'API request failed';
    const error = new Error(errorMsg);
    error.status = response.status;
    error.errors = data.errors || null;
    throw error;
  }

  return data;
}

export const authAPI = {
  login: (email, password) => apiCall('/auth/login', { method: 'POST', body: { email, password } }),
  getMe: () => apiCall('/auth/me', { method: 'GET' }),
};

export const customerAPI = {
  getCustomers: (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.type) params.append('type', filters.type);
    if (filters.search) params.append('search', filters.search);
    if (filters.page) params.append('page', filters.page);
    if (filters.limit) params.append('limit', filters.limit);
    const queryStr = params.toString() ? `?${params.toString()}` : '';
    return apiCall(`/customers${queryStr}`, { method: 'GET' });
  },
  getCustomer: (id) => apiCall(`/customers/${id}`, { method: 'GET' }),
  createCustomer: (data) => apiCall('/customers', { method: 'POST', body: data }),
  updateCustomer: (id, data) => apiCall(`/customers/${id}`, { method: 'PUT', body: data }),
  createFollowUp: (id, note, followUpDate) => 
    apiCall(`/customers/${id}/followups`, { method: 'POST', body: { note, followUpDate } }),
};

export const productAPI = {
  getProducts: (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.category) params.append('category', filters.category);
    if (filters.search) params.append('search', filters.search);
    if (filters.lowStock) params.append('lowStock', filters.lowStock);
    if (filters.page) params.append('page', filters.page);
    if (filters.limit) params.append('limit', filters.limit);
    const queryStr = params.toString() ? `?${params.toString()}` : '';
    return apiCall(`/products${queryStr}`, { method: 'GET' });
  },
  getProduct: (id) => apiCall(`/products/${id}`, { method: 'GET' }),
  createProduct: (data) => apiCall('/products', { method: 'POST', body: data }),
  updateProduct: (id, data) => apiCall(`/products/${id}`, { method: 'PUT', body: data }),
  adjustStock: (id, adjustment) => 
    apiCall(`/products/${id}/adjust`, { method: 'POST', body: adjustment }),
  getStockLogs: (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.page) params.append('page', filters.page);
    if (filters.limit) params.append('limit', filters.limit);
    const queryStr = params.toString() ? `?${params.toString()}` : '';
    return apiCall(`/products/movements/log${queryStr}`, { method: 'GET' });
  },
};

export const challanAPI = {
  getChallans: (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.customerId) params.append('customerId', filters.customerId);
    if (filters.page) params.append('page', filters.page);
    if (filters.limit) params.append('limit', filters.limit);
    const queryStr = params.toString() ? `?${params.toString()}` : '';
    return apiCall(`/challans${queryStr}`, { method: 'GET' });
  },
  getChallan: (id) => apiCall(`/challans/${id}`, { method: 'GET' }),
  createChallan: (data) => apiCall('/challans', { method: 'POST', body: data }),
  updateChallan: (id, data) => apiCall(`/challans/${id}`, { method: 'PUT', body: data }),
  confirmChallan: (id) => apiCall(`/challans/${id}/confirm`, { method: 'POST' }),
  cancelChallan: (id) => apiCall(`/challans/${id}/cancel`, { method: 'POST' }),
};

export const analyticsAPI = {
  getDashboard: () => apiCall('/analytics/dashboard', { method: 'GET' }),
};
