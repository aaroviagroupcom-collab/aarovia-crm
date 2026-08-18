'use client';

import { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { demandsApi, bookingsApi } from '@/lib/api';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, X, Download, Send } from 'lucide-react';

const demandSchema = z.object({
  bookingId: z.string().min(1),
  milestoneId: z.string().optional(),
  amount: z.number().min(1),
  dueDate: z.string().min(1),
  description: z.string().optional(),
});
type DemandForm = z.infer<typeof demandSchema>;

export default function DemandsPage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['demands', page],
    queryFn: () => demandsApi.getAll({ page }).then(r => r.data),
  });

  const { data: bookingsData } = useQuery({
    queryKey: ['bookings-all'],
    queryFn: () => bookingsApi.getAll({ limit: 100 }).then(r => r.data),
    enabled: showModal,
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<DemandForm>({
    resolver: zodResolver(demandSchema),
  });

  const createMutation = useMutation({
    mutationFn: (d: DemandForm) => demandsApi.create(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['demands'] });
      toast.success('Demand created'); setShowModal(false); reset();
    },
  });

  const sendDemand = useMutation({
    mutationFn: (id: string) => demandsApi.send(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['demands'] }); toast.success('Demand sent via Email & WhatsApp'); },
    onError: () => toast.error('Send failed'),
  });

  const downloadPDF = async (id: string, ref: string) => {
    const res = await demandsApi.generatePDF(id);
    const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
    const a = document.createElement('a'); a.href = url; a.download = `${ref}.pdf`; a.click();
  };

  const demands = data?.demands || [];
  const total = data?.total || 0;

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Demand Notices</h1>
            <p className="text-gray-500 text-sm mt-0.5">{total} demands</p>
          </div>
          <button onClick={() => { reset(); setShowModal(true); }} className="btn-primary flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" /> New Demand
          </button>
        </div>

        <div className="section-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  {['Demand No', 'Customer', 'Unit', 'Amount', 'Due Date', 'Status', 'Actions'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => <tr key={i}><td colSpan={7}><div className="h-4 bg-gray-100 rounded m-3 animate-pulse" /></td></tr>)
                ) : demands.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-12 text-gray-400">No demands raised</td></tr>
                ) : demands.map((d: any) => (
                  <tr key={d.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-medium text-sm text-blue-600">{d.demandNo}</td>
                    <td className="px-4 py-3 text-sm">{d.booking?.lead?.customerName}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{d.booking?.inventory?.unitNumber}</td>
                    <td className="px-4 py-3 text-sm font-semibold">₹{Number(d.amount).toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3 text-sm text-orange-600">{format(new Date(d.dueDate), 'dd MMM yyyy')}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${d.sent ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                        {d.sent ? 'Sent' : 'Draft'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => downloadPDF(d.id, d.demandNo)} className="p-1.5 hover:bg-blue-50 rounded text-blue-600" title="PDF">
                          <Download className="w-4 h-4" />
                        </button>
                        {!d.sent && (
                          <button onClick={() => sendDemand.mutate(d.id)} className="p-1.5 hover:bg-green-50 rounded text-green-600" title="Send">
                            <Send className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="font-bold text-lg">New Demand Notice</h2>
              <button onClick={() => { setShowModal(false); reset(); }}><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit(d => createMutation.mutate(d))} className="p-6 space-y-4">
              <div>
                <label className="form-label">Booking *</label>
                <select {...register('bookingId')} className="form-input">
                  <option value="">Select booking</option>
                  {(bookingsData?.bookings || []).map((b: any) => (
                    <option key={b.id} value={b.id}>{b.bookingNo} — {b.lead?.customerName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label">Amount (₹) *</label>
                <input {...register('amount', { valueAsNumber: true })} type="number" className="form-input" />
              </div>
              <div>
                <label className="form-label">Due Date *</label>
                <input {...register('dueDate')} type="date" className="form-input" />
              </div>
              <div>
                <label className="form-label">Description</label>
                <textarea {...register('description')} className="form-input resize-none" rows={3} placeholder="Payment milestone details..." />
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={createMutation.isPending} className="btn-primary">
                  {createMutation.isPending ? 'Creating...' : 'Create Demand'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
