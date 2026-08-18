'use client';

import { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collectionsApi, bookingsApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { Plus, X, Download, CreditCard, TrendingUp, AlertTriangle } from 'lucide-react';

const PAYMENT_MODES = ['CASH','UPI','NEFT','RTGS','CHEQUE','CARD'];

const collectionSchema = z.object({
  bookingId: z.string().min(1),
  amount: z.number().min(1),
  paymentMode: z.string().min(1),
  paymentDate: z.string().min(1),
  referenceNumber: z.string().optional(),
  chequeNumber: z.string().optional(),
  bankName: z.string().optional(),
  notes: z.string().optional(),
});
type CollectionForm = z.infer<typeof collectionSchema>;

export default function CollectionsPage() {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const [showModal, setShowModal] = useState(false);
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['collections', page],
    queryFn: () => collectionsApi.getAll({ page }).then(r => r.data),
  });

  const { data: bookingsData } = useQuery({
    queryKey: ['bookings-all'],
    queryFn: () => bookingsApi.getAll({ limit: 100 }).then(r => r.data),
    enabled: showModal,
  });

  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm<CollectionForm>({
    resolver: zodResolver(collectionSchema),
    defaultValues: { paymentDate: format(new Date(), 'yyyy-MM-dd') },
  });

  const paymentMode = watch('paymentMode');

  const createMutation = useMutation({
    mutationFn: (d: CollectionForm) => collectionsApi.create(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['collections'] });
      toast.success('Payment recorded'); setShowModal(false); reset();
    },
  });

  const downloadReceipt = async (id: string) => {
    const res = await collectionsApi.generateReceipt(id);
    const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
    const a = document.createElement('a'); a.href = url; a.download = `receipt-${id}.pdf`; a.click();
  };

  const collections = data?.collections || [];
  const total = data?.total || 0;
  const summary = data?.summary || {};

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Collections</h1>
            <p className="text-gray-500 text-sm mt-0.5">{total} transactions</p>
          </div>
          <button onClick={() => { reset(); setShowModal(true); }} className="btn-primary flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" /> Record Payment
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="section-card p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-green-50 flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Total Collected</p>
              <p className="text-xl font-bold text-green-700">₹{(Number(summary.totalCollected || 0) / 100000).toFixed(1)}L</p>
            </div>
          </div>
          <div className="section-card p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-500" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Total Due</p>
              <p className="text-xl font-bold text-red-600">₹{(Number(summary.totalDue || 0) / 100000).toFixed(1)}L</p>
            </div>
          </div>
          <div className="section-card p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">This Month</p>
              <p className="text-xl font-bold text-blue-700">₹{(Number(summary.thisMonth || 0) / 100000).toFixed(1)}L</p>
            </div>
          </div>
        </div>

        {/* Collections Table */}
        <div className="section-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  {['Receipt No', 'Customer', 'Unit', 'Amount', 'Mode', 'Reference', 'Date', 'Actions'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}><td colSpan={8}><div className="h-4 bg-gray-100 rounded m-3 animate-pulse" /></td></tr>
                  ))
                ) : collections.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-12 text-gray-400">No collections recorded</td></tr>
                ) : collections.map((c: any) => (
                  <tr key={c.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-medium text-sm text-blue-600">{c.receiptNo}</td>
                    <td className="px-4 py-3 text-sm">{c.booking?.lead?.customerName}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{c.booking?.inventory?.unitNumber}</td>
                    <td className="px-4 py-3 text-sm font-bold text-green-700">₹{Number(c.amount).toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded-full">{c.paymentMode}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{c.referenceNumber || c.chequeNumber || '—'}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{format(new Date(c.paymentDate), 'dd MMM yyyy')}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => downloadReceipt(c.id)}
                        className="p-1.5 hover:bg-blue-50 rounded text-blue-600" title="Download Receipt">
                        <Download className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {Math.ceil(total / 20) > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <p className="text-sm text-gray-500">Page {page}</p>
              <div className="flex gap-1">
                <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-40">Prev</button>
                <button disabled={page === Math.ceil(total / 20)} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-40">Next</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Record Payment Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="font-bold text-lg">Record Payment</h2>
              <button onClick={() => { setShowModal(false); reset(); }}><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit(d => createMutation.mutate(d))} className="p-6 space-y-4">
              <div>
                <label className="form-label">Booking *</label>
                <select {...register('bookingId')} className="form-input">
                  <option value="">Select booking</option>
                  {(bookingsData?.bookings || []).map((b: any) => (
                    <option key={b.id} value={b.id}>{b.bookingNo} — {b.lead?.customerName} — {b.inventory?.unitNumber}</option>
                  ))}
                </select>
                {errors.bookingId && <p className="form-error">Required</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Amount (₹) *</label>
                  <input {...register('amount', { valueAsNumber: true })} type="number" className="form-input" />
                  {errors.amount && <p className="form-error">Required</p>}
                </div>
                <div>
                  <label className="form-label">Payment Date *</label>
                  <input {...register('paymentDate')} type="date" className="form-input" />
                </div>
              </div>
              <div>
                <label className="form-label">Payment Mode *</label>
                <select {...register('paymentMode')} className="form-input">
                  <option value="">Select mode</option>
                  {PAYMENT_MODES.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              {paymentMode && paymentMode !== 'CASH' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">{paymentMode === 'CHEQUE' ? 'Cheque Number' : 'Reference / UTR'}</label>
                    <input {...register(paymentMode === 'CHEQUE' ? 'chequeNumber' : 'referenceNumber')} className="form-input" />
                  </div>
                  {paymentMode === 'CHEQUE' && (
                    <div>
                      <label className="form-label">Bank Name</label>
                      <input {...register('bankName')} className="form-input" />
                    </div>
                  )}
                </div>
              )}
              <div>
                <label className="form-label">Notes</label>
                <textarea {...register('notes')} className="form-input resize-none" rows={2} />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={createMutation.isPending} className="btn-primary">
                  {createMutation.isPending ? 'Saving...' : 'Record Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
