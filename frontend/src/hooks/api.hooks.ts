'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  leadsApi, projectsApi, inventoryApi, quotationsApi, bookingsApi,
  collectionsApi, demandsApi, invoicesApi, usersApi, reportsApi,
  notificationsApi, templatesApi, dashboardApi,
} from '@/lib/api';
import toast from 'react-hot-toast';

// ─── Dashboard ────────────────────────────────────────────────────────────────
export const useDashboard = () =>
  useQuery({ queryKey: ['dashboard'], queryFn: () => dashboardApi.getStats() });

export const useBookingTrend = () =>
  useQuery({ queryKey: ['dashboard', 'booking-trend'], queryFn: () => dashboardApi.getBookingTrend() });

export const useLeadSources = () =>
  useQuery({ queryKey: ['dashboard', 'lead-sources'], queryFn: () => dashboardApi.getLeadSources() });

export const useExecutivePerformance = () =>
  useQuery({ queryKey: ['dashboard', 'executive-performance'], queryFn: () => dashboardApi.getExecutivePerformance() });

export const useSalesFunnel = () =>
  useQuery({ queryKey: ['dashboard', 'sales-funnel'], queryFn: () => dashboardApi.getSalesFunnel() });

// ─── Leads ────────────────────────────────────────────────────────────────────
export const useLeads = (params?: Record<string, unknown>) =>
  useQuery({ queryKey: ['leads', params], queryFn: () => leadsApi.getAll(params) });

export const useLead = (id: string) =>
  useQuery({ queryKey: ['leads', id], queryFn: () => leadsApi.getById(id), enabled: !!id });

export const useCreateLead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: leadsApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['leads'] }); toast.success('Lead created'); },
    onError: (e: Error) => toast.error(e.message),
  });
};

export const useUpdateLead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => leadsApi.update(id, data),
    onSuccess: (_, vars) => { qc.invalidateQueries({ queryKey: ['leads', vars.id] }); qc.invalidateQueries({ queryKey: ['leads'] }); toast.success('Lead updated'); },
    onError: (e: Error) => toast.error(e.message),
  });
};

export const useUpdateLeadStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, notes }: { id: string; status: string; notes?: string }) => leadsApi.updateStatus(id, { status, notes }),
    onSuccess: (_, vars) => { qc.invalidateQueries({ queryKey: ['leads', vars.id] }); qc.invalidateQueries({ queryKey: ['leads'] }); toast.success('Status updated'); },
    onError: (e: Error) => toast.error(e.message),
  });
};

export const useLeadTimeline = (id: string) =>
  useQuery({ queryKey: ['leads', id, 'timeline'], queryFn: () => leadsApi.getTimeline(id), enabled: !!id });

// ─── Projects ─────────────────────────────────────────────────────────────────
export const useProjects = () =>
  useQuery({ queryKey: ['projects'], queryFn: () => projectsApi.getAll() });

export const useProject = (id: string) =>
  useQuery({ queryKey: ['projects', id], queryFn: () => projectsApi.getById(id), enabled: !!id });

export const useCreateProject = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: projectsApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['projects'] }); toast.success('Project created'); },
    onError: (e: Error) => toast.error(e.message),
  });
};

export const useUpdateProject = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => projectsApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['projects'] }); toast.success('Project updated'); },
    onError: (e: Error) => toast.error(e.message),
  });
};

// ─── Inventory ────────────────────────────────────────────────────────────────
export const useInventory = (params?: Record<string, unknown>) =>
  useQuery({ queryKey: ['inventory', params], queryFn: () => inventoryApi.getAll(params) });

export const useInventoryGrid = (projectId: string) =>
  useQuery({ queryKey: ['inventory', 'grid', projectId], queryFn: () => inventoryApi.getGrid(projectId), enabled: !!projectId });

export const useCreateInventory = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: inventoryApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['inventory'] }); toast.success('Unit added'); },
    onError: (e: Error) => toast.error(e.message),
  });
};

export const useUpdateInventory = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => inventoryApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['inventory'] }); toast.success('Unit updated'); },
    onError: (e: Error) => toast.error(e.message),
  });
};

// ─── Quotations ───────────────────────────────────────────────────────────────
export const useQuotations = (params?: Record<string, unknown>) =>
  useQuery({ queryKey: ['quotations', params], queryFn: () => quotationsApi.getAll(params) });

export const useCreateQuotation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: quotationsApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['quotations'] }); toast.success('Quotation created'); },
    onError: (e: Error) => toast.error(e.message),
  });
};

export const useApproveQuotation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action, reason }: { id: string; action: 'approve' | 'reject'; reason?: string }) =>
      quotationsApi.approve(id, { action, notes: reason }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['quotations'] }); toast.success('Quotation updated'); },
    onError: (e: Error) => toast.error(e.message),
  });
};

// ─── Bookings ─────────────────────────────────────────────────────────────────
export const useBookings = (params?: Record<string, unknown>) =>
  useQuery({ queryKey: ['bookings', params], queryFn: () => bookingsApi.getAll(params) });

export const useCreateBooking = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: bookingsApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['bookings'] }); toast.success('Booking created'); },
    onError: (e: Error) => toast.error(e.message),
  });
};

export const useUpdateBookingStage = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: string }) => bookingsApi.updateStage(id, stage),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['bookings'] }); toast.success('Booking stage updated'); },
    onError: (e: Error) => toast.error(e.message),
  });
};

// ─── Collections ──────────────────────────────────────────────────────────────
export const useCollections = (params?: Record<string, unknown>) =>
  useQuery({ queryKey: ['collections', params], queryFn: () => collectionsApi.getAll(params) });

export const useCreateCollection = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: collectionsApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['collections'] }); qc.invalidateQueries({ queryKey: ['bookings'] }); toast.success('Payment recorded'); },
    onError: (e: Error) => toast.error(e.message),
  });
};

// ─── Demands ──────────────────────────────────────────────────────────────────
export const useDemands = (params?: Record<string, unknown>) =>
  useQuery({ queryKey: ['demands', params], queryFn: () => demandsApi.getAll(params) });

export const useCreateDemand = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: demandsApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['demands'] }); toast.success('Demand notice created'); },
    onError: (e: Error) => toast.error(e.message),
  });
};

export const useSendDemand = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, via }: { id: string; via: string[] }) => demandsApi.send(id, via),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['demands'] }); toast.success('Demand notice sent'); },
    onError: (e: Error) => toast.error(e.message),
  });
};

// ─── Invoices ─────────────────────────────────────────────────────────────────
export const useInvoices = (params?: Record<string, unknown>) =>
  useQuery({ queryKey: ['invoices', params], queryFn: () => invoicesApi.getAll(params) });

// ─── Users ────────────────────────────────────────────────────────────────────
export const useUsers = () =>
  useQuery({ queryKey: ['users'], queryFn: () => usersApi.getAll() });

export const useCreateUser = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: usersApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); toast.success('User created'); },
    onError: (e: Error) => toast.error(e.message),
  });
};

export const useUpdateUser = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => usersApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); toast.success('User updated'); },
    onError: (e: Error) => toast.error(e.message),
  });
};

export const useDeactivateUser = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => usersApi.deactivate(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); toast.success('User deactivated'); },
    onError: (e: Error) => toast.error(e.message),
  });
};

// ─── Reports ──────────────────────────────────────────────────────────────────
export const useLeadsReport = (params?: Record<string, unknown>) =>
  useQuery({ queryKey: ['reports', 'leads', params], queryFn: () => reportsApi.leads(params), enabled: false });

export const useCollectionsReport = (params?: Record<string, unknown>) =>
  useQuery({ queryKey: ['reports', 'collections', params], queryFn: () => reportsApi.collections(params), enabled: false });

export const useInventoryReport = (params?: Record<string, unknown>) =>
  useQuery({ queryKey: ['reports', 'inventory', params], queryFn: () => reportsApi.inventory(params), enabled: false });

// ─── Notifications ────────────────────────────────────────────────────────────
export const useNotifications = () =>
  useQuery({ queryKey: ['notifications'], queryFn: () => notificationsApi.getAll(), refetchInterval: 60000 });

export const useMarkAllNotificationsRead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: notificationsApi.markAllRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
};

// ─── Templates ────────────────────────────────────────────────────────────────
export const useEmailTemplates = () =>
  useQuery({ queryKey: ['templates', 'email'], queryFn: () => templatesApi.getEmailTemplates() });

export const useCreateEmailTemplate = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: templatesApi.createEmailTemplate,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['templates', 'email'] }); toast.success('Template created'); },
    onError: (e: Error) => toast.error(e.message),
  });
};

export const useUpdateEmailTemplate = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => templatesApi.updateEmailTemplate(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['templates', 'email'] }); toast.success('Template updated'); },
    onError: (e: Error) => toast.error(e.message),
  });
};

export const useWhatsAppTemplates = () =>
  useQuery({ queryKey: ['templates', 'whatsapp'], queryFn: () => templatesApi.getWhatsAppTemplates() });
