'use client';

import { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bookingsApi, leadsApi, inventoryApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { Plus, X, Download, ChevronRight, BookOpen } from 'lucide-react';

const PAYMENT_MODES = ['CASH','UPI','NEFT','RTGS','CHEQUE','CARD'];
const STAGES = ['BOOKING','AGREEMENT_PENDING','AGREEMENT_INITIATED','AGREEMENT_SIGNED','REGISTRATION_PENDING','REGISTERED','HANDOVER_PENDING','HANDOVER_COMPLETE'];

const bookingSchema = z.object({
  leadId: z.string().min(1),
  inventoryId: z.string().min(1),
  bookingAmount: z.number().min(1),
  paymentMode: z.string().min(1),
  bookingDate: z.string().min(1),
  chequeNumber: z.string().optional(),
  bankName: z.string().optional(),
  notes: z.string().optional(),
});
type BookingForm = z.infer<typeof bookingSchema>;

const STAGE_COLORS: Record<string, string> = {
  BOOKING: 'bg-blue-100 text-blue-800',
  AGREEMENT_PENDING: 'bg-yellow-100 text-yellow-800',
  AGREEMENT_INITIATED: 'bg-orange-100 text-orange-800',
  AGREEMENT_SIGNED: 'bg-indigo-100 text-indigo-800',
  REGISTRATION_PENDING: 'bg-purple-100 text-purple-800',
  REGISTERED: 'bg-teal-100 text-teal-800',
  HANDOVER_PENDING: 'bg-cyan-100 text-cyan-800',
  HANDOVER_COMPLETE: 'bg-green-100 text-green-800',
};

export default function BookingsPage() {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const [showModal, setShowModal] = useState(false);
  const [page, setPage] = useState(1);
  const [stageFilter, setStageFilter] = useState('');

  const isAdmin = ['SUPER_ADMIN','ADMIN','SALES_MANAGER'].includes(user?.role || '');

  const { data, isLoading } = useQuery({
    queryKey: ['bookings', page, stageFilter],
    queryFn: () => bookingsApi.getAll({ page: String(page), stage: stageFilter }).then(r => r.data),
  });

  const { data: leadsData } = useQuery({
    queryKey: ['leads-qualified'],
    queryFn: () => leadsApi.getAll({ status: 'OPPORTUNITY', limit: 50 }).then(r => r.data),
    enabled: showModal,
  });

  const { data: inventoryData } = useQuery({
    queryKey: ['inventory-available'],
    queryFn: () => inventoryApi.getAll({ status: 'AVAILABLE' }).then(r => r.data),
    enabled: showModal,
  });

  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm<BookingForm>({
    resolver: zodResolver(bookingSchema),
    defaultValues: { bookingDate: format(new Date(), 'yyyy-MM-dd') },
  });

  const paymentMode = watch('paymentMode');

  const createMutation = useMutation({
    mutationFn: (d: BookingForm) => bookingsApi.create(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bookings'] });
      toast.success('Booking created successfully!');
      setShowModal(false); reset();
    },
    onError: () => toast.error('Failed to create booking'),
  });

  const updateStage = useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: string }) => bookingsApi.updateStage(id, { stage }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['bookings'] }); toast.success('Stage updated'); },
  });

  const downloadReceipt = async (id: string, bookingNo: string) => {
    const res = await bookingsApi.generateReceipt(id);
    const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
    const a = document.createElement('a'); a.href = url; a.download = `${bookingNo}-receipt.pdf`; a.click();
  };

  const bookings = data?.bookings || [];
  const total = data?.total || 0;

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Bookings</h1>
            <p className="text-gray-500 text-sm mt-0.5">{total} bookings</p>
          </div>
          <button onClick={() => { reset(); setShowModal(true); }} className="btn-primary flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" /> New Booking
          </button>
        </div>

        {/* Filter */}
        <div className="section-card p-4 flex gap-3">
          <select value={stageFilter} onChange={e => setStageFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400">
            <option value="">All Stages</option>
            {STAGES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
          </select>
        </div>

        {/* Bookings Table */}
        <div className="section-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  {['Booking No', 'Customer', 'Unit', 'Booking Amt', 'Stage', 'Date', 'Actions'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}><td colSpan={7}><div className="h-4 bg-gray-100 rounded m-3 animate-pulse" /></td></tr>
                  ))
                ) : bookings.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12">
                      <BookOpen className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                      <p className="text-gray-400 text-sm">No bookings found</p>
                    </td>
                  </tr>
                ) : bookings.map((b: any) => (
                  <tr key={b.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-medium text-sm text-blue-600">{b.bookingNo}</td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium">{b.lead?.customerName}</p>
                      <p className="text-xs text-gray-400">{b.lead?.mobile}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm">{b.inventory?.unitNumber}</p>
                      <p className="text-xs text-gray-400">{b.inventory?.project?.name}</p>
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold">₹{Number(b.bookingAmount).toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${STAGE_COLORS[b.stage] || 'bg-gray-100'}`}>
                        {b.stage?.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{format(new Date(b.bookingDate), 'dd MMM yyyy')}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => downloadReceipt(b.id, b.bookingNo)}
                          className="p-1.5 hover:bg-blue-50 rounded text-blue-600" title="Download Receipt">
                          <Download className="w-4 h-4" />
                        </button>
                        {isAdmin && (
                          <select value={b.stage}
                            onChange={e => updateStage.mutate({ id: b.id, stage: e.target.value })}
                            className="text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none">
                            {STAGES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                          </select>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {Math.ceil(total / 20) > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <p className="text-sm text-gray-500">Page {page} of {Math.ceil(total / 20)}</p>
              <div className="flex gap-1">
                <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-40">Prev</button>
                <button disabled={page === Math.ceil(total / 20)} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-40">Next</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Booking Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="font-bold text-lg">New Booking</h2>
              <button onClick={() => { setShowModal(false); reset(); }}><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit(d => createMutation.mutate(d))} className="p-6 space-y-4">
              <div>
                <label className="form-label">Lead / Customer *</label>
                <select {...register('leadId')} className="form-input">
                  <option value="">Select lead</option>
                  {(leadsData?.leads || []).map((l: any) => (
                    <option key={l.id} value={l.id}>{l.customerName} — {l.mobile}</option>
                  ))}
                </select>
                {errors.leadId && <p className="form-error">Required</p>}
              </div>
              <div>
                <label className="form-label">Unit *</label>
                <select {...register('inventoryId')} className="form-input">
                  <option value="">Select unit</option>
                  {(inventoryData?.inventory || []).filter((i: any) => i.status === 'AVAILABLE').map((i: any) => (
                    <option key={i.id} value={i.id}>{i.unitNumber} — {i.type} — {i.project?.name}</option>
                  ))}
                </select>
                {errors.inventoryId && <p className="form-error">Required</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Booking Amount (₹) *</label>
                  <input {...register('bookingAmount', { valueAsNumber: true })} type="number" className="form-input" placeholder="100000" />
                  {errors.bookingAmount && <p className="form-error">Required</p>}
                </div>
                <div>
                  <label className="form-label">Booking Date *</label>
                  <input {...register('bookingDate')} type="date" className="form-input" />
                </div>
              </div>
              <div>
                <label className="form-label">Payment Mode *</label>
                <select {...register('paymentMode')} className="form-input">
                  <option value="">Select mode</option>
                  {PAYMENT_MODES.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              {paymentMode === 'CHEQUE' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">Cheque Number</label>
                    <input {...register('chequeNumber')} className="form-input" />
                  </div>
                  <div>
                    <label className="form-label">Bank Name</label>
                    <input {...register('bankName')} className="form-input" />
                  </div>
                </div>
              )}
              <div>
                <label className="form-label">Notes</label>
                <textarea {...register('notes')} className="form-input resize-none" rows={2} />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={createMutation.isPending} className="btn-primary">
                  {createMutation.isPending ? 'Creating...' : 'Create Booking'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
