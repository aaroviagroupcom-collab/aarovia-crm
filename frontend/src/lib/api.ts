import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

// Request interceptor - attach token
api.interceptors.request.use(
  (config) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('aarovia_token') : null;
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('aarovia_token');
        localStorage.removeItem('aarovia_user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// =================== AUTH ===================
export const authApi = {
  login: (email: string, password: string) => api.post('/auth/login', { email, password }),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
  changePassword: (data: { currentPassword: string; newPassword: string }) => api.post('/auth/change-password', data),
};

// =================== DASHBOARD ===================
export const dashboardApi = {
  getStats: (params?: { fromDate?: string; toDate?: string }) => api.get('/dashboard', { params }),
  getBookingTrend: () => api.get('/dashboard/booking-trend'),
  getLeadSources: () => api.get('/dashboard/lead-sources'),
  getSalesFunnel: () => api.get('/dashboard/sales-funnel'),
  getExecutivePerformance: () => api.get('/dashboard/executive-performance'),
  getInventoryStatus: () => api.get('/dashboard/inventory-status'),
};

// =================== LEADS ===================
export const leadsApi = {
  getAll: (params?: Record<string, string | number>) => api.get('/leads', { params }),
  getById: (id: string) => api.get(`/leads/${id}`),
  create: (data: unknown) => api.post('/leads', data),
  update: (id: string, data: unknown) => api.put(`/leads/${id}`, data),
  updateStatus: (id: string, data: { status: string; notes?: string }) => api.patch(`/leads/${id}/status`, data),
  assign: (id: string, assignedTo: string) => api.patch(`/leads/${id}/assign`, { assignedTo }),
  delete: (id: string) => api.delete(`/leads/${id}`),
  getTimeline: (id: string) => api.get(`/leads/${id}/timeline`),
  merge: (data: { sourceLeadId: string; targetLeadId: string }) => api.post('/leads/merge', data),
  import: (leads: unknown[]) => api.post('/leads/import', { leads }),
  createReminder: (id: string, data: unknown) => api.post(`/leads/${id}/reminders`, data),
};

// =================== PROJECTS ===================
export const projectsApi = {
  getAll: () => api.get('/projects'),
  getById: (id: string) => api.get(`/projects/${id}`),
  create: (data: unknown) => api.post('/projects', data),
  update: (id: string, data: unknown) => api.put(`/projects/${id}`, data),
  delete: (id: string) => api.delete(`/projects/${id}`),
};

// =================== INVENTORY ===================
export const inventoryApi = {
  getAll: (params?: Record<string, string>) => api.get('/inventory', { params }),
  getGrid: (projectId: string) => api.get(`/inventory/grid/${projectId}`),
  create: (data: unknown) => api.post('/inventory', data),
  bulkCreate: (units: unknown[]) => api.post('/inventory/bulk', { units }),
  update: (id: string, data: unknown) => api.put(`/inventory/${id}`, data),
  updateStatus: (id: string, status: string) => api.patch(`/inventory/${id}/status`, { status }),
};

// =================== QUOTATIONS ===================
export const quotationsApi = {
  getAll: (params?: Record<string, string>) => api.get('/quotations', { params }),
  getById: (id: string) => api.get(`/quotations/${id}`),
  create: (data: unknown) => api.post('/quotations', data),
  approve: (id: string, data: { action: string; notes?: string }) => api.patch(`/quotations/${id}/approve`, data),
  getPDF: (id: string) => api.get(`/quotations/${id}/pdf`, { responseType: 'blob' }),
};

// =================== BOOKINGS ===================
export const bookingsApi = {
  getAll: (params?: Record<string, string>) => api.get('/bookings', { params }),
  getById: (id: string) => api.get(`/bookings/${id}`),
  create: (data: unknown) => api.post('/bookings', data),
  updateStage: (id: string, stage: string) => api.patch(`/bookings/${id}/stage`, { stage }),
  getReceipt: (id: string) => api.get(`/bookings/${id}/receipt`, { responseType: 'blob' }),
};

// =================== COLLECTIONS ===================
export const collectionsApi = {
  getAll: (params?: Record<string, string>) => api.get('/collections', { params }),
  create: (data: unknown) => api.post('/collections', data),
};

// =================== DEMANDS ===================
export const demandsApi = {
  getAll: (params?: Record<string, string>) => api.get('/demands', { params }),
  create: (data: unknown) => api.post('/demands', data),
  send: (id: string, via: string[]) => api.post(`/demands/${id}/send`, { via }),
};

// =================== INVOICES ===================
export const invoicesApi = {
  getAll: (params?: Record<string, string>) => api.get('/invoices', { params }),
  create: (data: unknown) => api.post('/invoices', data),
};

// =================== USERS ===================
export const usersApi = {
  getAll: (params?: Record<string, string>) => api.get('/users', { params }),
  create: (data: unknown) => api.post('/users', data),
  update: (id: string, data: unknown) => api.put(`/users/${id}`, data),
  deactivate: (id: string) => api.delete(`/users/${id}`),
};

// =================== COMMUNICATIONS ===================
export const communicationsApi = {
  sendEmail: (data: unknown) => api.post('/communications/email', data),
  sendWhatsApp: (data: unknown) => api.post('/communications/whatsapp', data),
  getLeadComms: (leadId: string) => api.get(`/communications/lead/${leadId}`),
};

// =================== CALLS ===================
export const callsApi = {
  initiate: (leadId: string, phone: string) => api.post('/calls/initiate', { leadId, phone }),
  getLogs: (leadId: string) => api.get(`/calls/lead/${leadId}`),
  addNotes: (id: string, notes: string) => api.patch(`/calls/${id}/notes`, { notes }),
};

// =================== REPORTS ===================
export const reportsApi = {
  getLeads: (params?: Record<string, string>) => api.get('/reports/leads', { params }),
  getCollections: (params?: Record<string, string>) => api.get('/reports/collections', { params }),
  getInventory: (params?: Record<string, string>) => api.get('/reports/inventory', { params }),
};

// =================== NOTIFICATIONS ===================
export const notificationsApi = {
  getAll: () => api.get('/notifications'),
  markRead: (id: string) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch('/notifications/read-all'),
};

// =================== TEMPLATES ===================
export const templatesApi = {
  getEmailTemplates: () => api.get('/templates/email'),
  createEmailTemplate: (data: unknown) => api.post('/templates/email', data),
  updateEmailTemplate: (id: string, data: unknown) => api.put(`/templates/email/${id}`, data),
  getWhatsAppTemplates: () => api.get('/templates/whatsapp'),
};

export default api;
