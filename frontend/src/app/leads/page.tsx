'use client';

import { useState, useRef } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { leadsApi, usersApi, projectsApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import {
  Plus, Search, Filter, Download, Upload, ChevronDown,
  Phone, Mail, Eye, Edit2, Trash2, X, MoreVertical,
  UserPlus, RefreshCw,
} from 'lucide-react';

const LEAD_STATUSES = [
  'NEW','FOLLOWUP','RNR','CALL_BACK','INTERESTED','QUALIFIED',
  'SITE_VISIT_FIXED','SITE_VISIT_DONE','OPPORTUNITY','OPPORTUNITY_FOLLOW',
  'OPPORTUNITY_INTERESTED','OPPORTUNITY_NOT_INTERESTED','OPPORTUNITY_CLOSED','BOOKED',
];
const LEAD_SOURCES = [
  'MAGIC_BRICKS','FACEBOOK','NINETY_NINE_ACRES','WEBSITE','CALL',
  'WALK_IN','REFERRAL','WHATSAPP','GOOGLE_ADS','HOUSING_COM',
];

const STATUS_COLORS: Record<string, string> = {
  NEW: 'bg-blue-100 text-blue-800',
  FOLLOWUP: 'bg-yellow-100 text-yellow-800',
  RNR: 'bg-gray-100 text-gray-700',
  CALL_BACK: 'bg-orange-100 text-orange-800',
  INTERESTED: 'bg-cyan-100 text-cyan-800',
  QUALIFIED: 'bg-indigo-100 text-indigo-800',
  SITE_VISIT_FIXED: 'bg-purple-100 text-purple-800',
  SITE_VISIT_DONE: 'bg-violet-100 text-violet-800',
  OPPORTUNITY: 'bg-teal-100 text-teal-800',
  OPPORTUNITY_FOLLOW: 'bg-lime-100 text-lime-800',
  OPPORTUNITY_INTERESTED: 'bg-green-100 text-green-800',
  OPPORTUNITY_NOT_INTERESTED: 'bg-red-100 text-red-800',
  OPPORTUNITY_CLOSED: 'bg-rose-100 text-rose-800',
  BOOKED: 'bg-emerald-100 text-emerald-800',
};

const leadSchema = z.object({
  customerName: z.string().min(2, 'Name required'),
  mobile: z.string().min(10, 'Valid mobile required'),
  alternateMobile: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  city: z.string().optional(),
  state: z.string().optional(),
  source: z.string().min(1, 'Source required'),
  projectInterestedId: z.string().optional(),
  budget: z.string().optional(),
  configuration: z.string().optional(),
  assignedToId: z.string().optional(),
  notes: z.string().optional(),
  followupDate: z.string().optional(),
});
type LeadForm = z.infer<typeof leadSchema>;

export default function LeadsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editLead, setEditLead] = useState<any>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const { data, isLoading } = useQuery({
    queryKey: ['leads', page, search, statusFilter, sourceFilter],
    queryFn: () => leadsApi.getAll({ page, search, status: statusFilter, source: sourceFilter }).then(r => r.data),
  });

  const { data: usersData } = useQuery({
    queryKey: ['users-exec'],
    queryFn: () => usersApi.getAll().then(r => r.data),
  });
  const { data: projectsData } = useQuery({
    queryKey: ['projects-list'],
    queryFn: () => projectsApi.getAll().then(r => r.data),
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<LeadForm>({
    resolver: zodResolver(leadSchema),
  });

  const createMutation = useMutation({
    mutationFn: (data: LeadForm) => editLead ? leadsApi.update(editLead.id, data) : leadsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leads'] });
      toast.success(editLead ? 'Lead updated' : 'Lead created');
      setShowModal(false); setEditLead(null); reset();
    },
    onError: () => toast.error('Failed to save lead'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => leadsApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['leads'] }); toast.success('Lead deleted'); },
  });

  const importMutation = useMutation({
    mutationFn: (file: File) => {
      const fd = new FormData(); fd.append('file', file);
      return leadsApi.bulkImport(fd);
    },
    onSuccess: (r) => { qc.invalidateQueries({ queryKey: ['leads'] }); toast.success(`Imported ${r.data.count} leads`); },
    onError: () => toast.error('Import failed'),
  });

  const openCreate = () => { reset(); setEditLead(null); setShowModal(true); };
  const openEdit = (lead: any) => {
    setEditLead(lead);
    reset({
      customerName: lead.customerName, mobile: lead.mobile,
      alternateMobile: lead.alternateMobile || '', email: lead.email || '',
      city: lead.city || '', state: lead.state || '', source: lead.source,
      projectInterestedId: lead.projectInterestedId || '',
      budget: lead.budget ? String(lead.budget) : '',
      configuration: lead.configuration || '',
      assignedToId: lead.assignedToId || '',
      notes: lead.notes || '',
      followupDate: lead.followupDate ? format(new Date(lead.followupDate), "yyyy-MM-dd'T'HH:mm") : '',
    });
    setShowModal(true);
  };

  const handleExport = async () => {
    const res = await leadsApi.export({ status: statusFilter, source: sourceFilter });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const a = document.createElement('a'); a.href = url; a.download = 'leads.xlsx'; a.click();
  };

  const leads = data?.leads || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / 20);

  const isAdmin = ['SUPER_ADMIN','ADMIN','SALES_MANAGER'].includes(user?.role || '');

  return (
    <DashboardLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Lead Management</h1>
            <p className="text-gray-500 text-sm mt-0.5">{total.toLocaleString()} total leads</p>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <>
                <button onClick={() => fileRef.current?.click()}
                  className="btn-secondary flex items-center gap-2 text-sm">
                  <Upload className="w-4 h-4" /> Import
                </button>
                <input ref={fileRef} type="file" accept=".xlsx,.csv" className="hidden"
                  onChange={e => e.target.files?.[0] && importMutation.mutate(e.target.files[0])} />
                <button onClick={handleExport} className="btn-secondary flex items-center gap-2 text-sm">
                  <Download className="w-4 h-4" /> Export
                </button>
              </>
            )}
            <button onClick={openCreate} className="btn-primary flex items-center gap-2 text-sm">
              <Plus className="w-4 h-4" /> Add Lead
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="section-card p-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search name, mobile, email..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400" />
            </div>
            <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400">
              <option value="">All Status</option>
              {LEAD_STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
            </select>
            <select value={sourceFilter} onChange={e => { setSourceFilter(e.target.value); setPage(1); }}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400">
              <option value="">All Sources</option>
              {LEAD_SOURCES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
            </select>
            {(statusFilter || sourceFilter || search) && (
              <button onClick={() => { setSearch(''); setStatusFilter(''); setSourceFilter(''); }}
                className="text-sm text-red-500 flex items-center gap-1 hover:underline">
                <X className="w-4 h-4" /> Clear
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="section-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Lead</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Contact</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Source</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Assigned To</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Follow Up</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {isLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i}><td colSpan={7} className="px-4 py-3">
                      <div className="h-4 bg-gray-100 rounded animate-pulse" />
                    </td></tr>
                  ))
                ) : leads.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-12 text-gray-400">No leads found</td></tr>
                ) : leads.map((lead: any) => (
                  <tr key={lead.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{lead.customerName}</p>
                        <p className="text-xs text-gray-400">{lead.leadId}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <a href={`tel:${lead.mobile}`} className="text-sm text-gray-700 flex items-center gap-1 hover:text-blue-600">
                          <Phone className="w-3 h-3" />{lead.mobile}
                        </a>
                      </div>
                      {lead.email && <p className="text-xs text-gray-400 mt-0.5">{lead.email}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-gray-600">{lead.source?.replace(/_/g, ' ')}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[lead.status] || 'bg-gray-100 text-gray-700'}`}>
                        {lead.status?.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-600">{lead.assignedTo?.name || '—'}</span>
                    </td>
                    <td className="px-4 py-3">
                      {lead.followupDate ? (
                        <span className="text-xs text-gray-600">{format(new Date(lead.followupDate), 'dd MMM, HH:mm')}</span>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => router.push(`/leads/${lead.id}`)}
                          className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-600 transition-colors" title="View">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button onClick={() => openEdit(lead)}
                          className="p-1.5 hover:bg-yellow-50 rounded-lg text-yellow-600 transition-colors" title="Edit">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {isAdmin && (
                          <button onClick={() => { if (confirm('Delete this lead?')) deleteMutation.mutate(lead.id); }}
                            className="p-1.5 hover:bg-red-50 rounded-lg text-red-500 transition-colors" title="Delete">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
              <p className="text-sm text-gray-500">Showing {((page - 1) * 20) + 1}–{Math.min(page * 20, total)} of {total}</p>
              <div className="flex gap-1">
                <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                  className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50">Prev</button>
                <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}
                  className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50">Next</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-bold">{editLead ? 'Edit Lead' : 'New Lead'}</h2>
              <button onClick={() => { setShowModal(false); setEditLead(null); reset(); }}
                className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit(d => createMutation.mutate(d))} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 md:col-span-1">
                  <label className="form-label">Customer Name *</label>
                  <input {...register('customerName')} className="form-input" placeholder="Full name" />
                  {errors.customerName && <p className="form-error">{errors.customerName.message}</p>}
                </div>
                <div>
                  <label className="form-label">Mobile *</label>
                  <input {...register('mobile')} className="form-input" placeholder="10-digit mobile" />
                  {errors.mobile && <p className="form-error">{errors.mobile.message}</p>}
                </div>
                <div>
                  <label className="form-label">Alternate Mobile</label>
                  <input {...register('alternateMobile')} className="form-input" placeholder="Optional" />
                </div>
                <div>
                  <label className="form-label">Email</label>
                  <input {...register('email')} type="email" className="form-input" placeholder="Optional" />
                </div>
                <div>
                  <label className="form-label">City</label>
                  <input {...register('city')} className="form-input" placeholder="City" />
                </div>
                <div>
                  <label className="form-label">State</label>
                  <input {...register('state')} className="form-input" placeholder="State" />
                </div>
                <div>
                  <label className="form-label">Lead Source *</label>
                  <select {...register('source')} className="form-input">
                    <option value="">Select source</option>
                    {LEAD_SOURCES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                  </select>
                  {errors.source && <p className="form-error">{errors.source.message}</p>}
                </div>
                <div>
                  <label className="form-label">Project Interested</label>
                  <select {...register('projectInterestedId')} className="form-input">
                    <option value="">Select project</option>
                    {(projectsData?.projects || []).map((p: any) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label">Budget (₹)</label>
                  <input {...register('budget')} type="number" className="form-input" placeholder="e.g. 5000000" />
                </div>
                <div>
                  <label className="form-label">Configuration</label>
                  <input {...register('configuration')} className="form-input" placeholder="e.g. 3BHK" />
                </div>
                {isAdmin && (
                  <div>
                    <label className="form-label">Assign To</label>
                    <select {...register('assignedToId')} className="form-input">
                      <option value="">Auto assign</option>
                      {(usersData?.users || [])
                        .filter((u: any) => ['SALES_EXECUTIVE','TEAM_LEADER'].includes(u.role))
                        .map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                  </div>
                )}
                <div>
                  <label className="form-label">Follow Up Date</label>
                  <input {...register('followupDate')} type="datetime-local" className="form-input" />
                </div>
                <div className="col-span-2">
                  <label className="form-label">Notes</label>
                  <textarea {...register('notes')} className="form-input resize-none" rows={3} placeholder="Additional notes..." />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => { setShowModal(false); reset(); }} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={createMutation.isPending} className="btn-primary">
                  {createMutation.isPending ? 'Saving...' : editLead ? 'Update Lead' : 'Create Lead'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
