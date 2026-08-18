'use client';

import { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { quotationsApi, leadsApi, inventoryApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { useForm, useFieldArray } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { Plus, X, FileText, Download, CheckCircle, XCircle, Eye, Trash2 } from 'lucide-react';

const QUOTATION_TYPES = ['APARTMENT','VILLA','PLOT','FARM_LAND','COMMERCIAL'];

const milestoneSchema = z.object({
  name: z.string().min(1),
  percentage: z.number().min(0).max(100),
  dueDate: z.string().optional(),
});

const quotationSchema = z.object({
  leadId: z.string().min(1),
  inventoryId: z.string().min(1),
  type: z.string().min(1),
  discount: z.number().default(0),
  otherCharges: z.number().default(0),
  registrationCharges: z.number().default(0),
  notes: z.string().optional(),
  milestones: z.array(milestoneSchema),
});
type QuotationForm = z.infer<typeof quotationSchema>;

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  PENDING_APPROVAL: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  SENT: 'bg-blue-100 text-blue-800',
};

export default function QuotationsPage() {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const [showModal, setShowModal] = useState(false);
  const [selectedInventory, setSelectedInventory] = useState<any>(null);
  const [leadSearch, setLeadSearch] = useState('');
  const [page, setPage] = useState(1);

  const isManager = ['SUPER_ADMIN','ADMIN','SALES_MANAGER'].includes(user?.role || '');

  const { data, isLoading } = useQuery({
    queryKey: ['quotations', page],
    queryFn: () => quotationsApi.getAll({ page }).then(r => r.data),
  });

  const { data: leadsData } = useQuery({
    queryKey: ['leads-search', leadSearch],
    queryFn: () => leadsApi.getAll({ search: leadSearch, limit: 10 }).then(r => r.data),
    enabled: showModal,
  });

  const { data: inventoryData } = useQuery({
    queryKey: ['inventory-available'],
    queryFn: () => inventoryApi.getAll({ status: 'AVAILABLE' }).then(r => r.data),
    enabled: showModal,
  });

  const { register, handleSubmit, watch, reset, control, setValue, formState: { errors } } = useForm<QuotationForm>({
    resolver: zodResolver(quotationSchema),
    defaultValues: { milestones: [], discount: 0, otherCharges: 0, registrationCharges: 0 },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'milestones' });

  const inventoryId = watch('inventoryId');
  const discount = watch('discount') || 0;
  const otherCharges = watch('otherCharges') || 0;
  const regCharges = watch('registrationCharges') || 0;

  const inv = inventoryData?.inventory?.find((i: any) => i.id === inventoryId);
  const basicCost = inv ? Number(inv.area) * Number(inv.baseRate) : 0;
  const plc = inv ? Number(inv.plcCharges || 0) : 0;
  const gst = (basicCost + plc) * (inv ? Number(inv.gstPercent || 5) / 100 : 0.05);
  const finalCost = basicCost + plc + gst - Number(discount) + Number(otherCharges) + Number(regCharges);

  const createMutation = useMutation({
    mutationFn: (d: QuotationForm) => quotationsApi.create({ ...d, basicCost, plc, gst, finalCost }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['quotations'] });
      toast.success('Quotation created'); setShowModal(false); reset();
    },
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => quotationsApi.approve(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['quotations'] }); toast.success('Quotation approved'); },
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => quotationsApi.reject(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['quotations'] }); toast.success('Quotation rejected'); },
  });

  const downloadPDF = async (id: string, quotNo: string) => {
    const res = await quotationsApi.generatePDF(id);
    const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
    const a = document.createElement('a'); a.href = url; a.download = `${quotNo}.pdf`; a.click();
  };

  const quotations = data?.quotations || [];
  const total = data?.total || 0;

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Quotations</h1>
            <p className="text-gray-500 text-sm mt-0.5">{total} quotations</p>
          </div>
          <button onClick={() => { reset(); setShowModal(true); }} className="btn-primary flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" /> New Quotation
          </button>
        </div>

        <div className="section-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  {['Quotation No', 'Customer', 'Unit', 'Basic Cost', 'Final Cost', 'Status', 'Date', 'Actions'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}><td colSpan={8}><div className="h-4 bg-gray-100 rounded m-3 animate-pulse" /></td></tr>
                  ))
                ) : quotations.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-12 text-gray-400">No quotations found</td></tr>
                ) : quotations.map((q: any) => (
                  <tr key={q.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-medium text-sm text-blue-600">{q.quotationNo}</td>
                    <td className="px-4 py-3 text-sm">{q.lead?.customerName}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{q.inventory?.unitNumber}</td>
                    <td className="px-4 py-3 text-sm">₹{Number(q.basicCost).toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3 text-sm font-semibold">₹{Number(q.finalCost).toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[q.status] || 'bg-gray-100'}`}>{q.status}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{format(new Date(q.createdAt), 'dd MMM yyyy')}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => downloadPDF(q.id, q.quotationNo)}
                          className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-600" title="Download PDF">
                          <Download className="w-4 h-4" />
                        </button>
                        {isManager && q.status === 'PENDING_APPROVAL' && (
                          <>
                            <button onClick={() => approveMutation.mutate(q.id)}
                              className="p-1.5 hover:bg-green-50 rounded-lg text-green-600" title="Approve">
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <button onClick={() => rejectMutation.mutate(q.id)}
                              className="p-1.5 hover:bg-red-50 rounded-lg text-red-500" title="Reject">
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
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

      {/* Create Quotation Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="font-bold text-lg">New Quotation</h2>
              <button onClick={() => { setShowModal(false); reset(); }}><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit(d => createMutation.mutate(d))} className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Lead / Customer *</label>
                  <select {...register('leadId')} className="form-input">
                    <option value="">Select lead</option>
                    {(leadsData?.leads || []).map((l: any) => (
                      <option key={l.id} value={l.id}>{l.customerName} — {l.mobile}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label">Unit (Inventory) *</label>
                  <select {...register('inventoryId')} className="form-input">
                    <option value="">Select unit</option>
                    {(inventoryData?.inventory || []).filter((i: any) => i.status === 'AVAILABLE').map((i: any) => (
                      <option key={i.id} value={i.id}>{i.unitNumber} — {i.type} — {i.area}sqft — {i.project?.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label">Type *</label>
                  <select {...register('type')} className="form-input">
                    <option value="">Select type</option>
                    {QUOTATION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Discount (₹)</label>
                  <input {...register('discount', { valueAsNumber: true })} type="number" className="form-input" />
                </div>
                <div>
                  <label className="form-label">Other Charges (₹)</label>
                  <input {...register('otherCharges', { valueAsNumber: true })} type="number" className="form-input" />
                </div>
                <div>
                  <label className="form-label">Registration Charges (₹)</label>
                  <input {...register('registrationCharges', { valueAsNumber: true })} type="number" className="form-input" />
                </div>
              </div>

              {/* Auto Calculations */}
              {inv && (
                <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
                  <h3 className="font-semibold text-gray-700 mb-3">Cost Breakdown</h3>
                  <div className="flex justify-between"><span className="text-gray-500">Basic Cost ({inv.area} sqft × ₹{Number(inv.baseRate).toLocaleString('en-IN')})</span><span className="font-medium">₹{basicCost.toLocaleString('en-IN')}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">PLC Charges</span><span className="font-medium">₹{plc.toLocaleString('en-IN')}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">GST ({inv.gstPercent || 5}%)</span><span className="font-medium">₹{Math.round(gst).toLocaleString('en-IN')}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Discount</span><span className="font-medium text-red-500">-₹{Number(discount).toLocaleString('en-IN')}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Other Charges</span><span className="font-medium">₹{Number(otherCharges).toLocaleString('en-IN')}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Registration</span><span className="font-medium">₹{Number(regCharges).toLocaleString('en-IN')}</span></div>
                  <div className="border-t pt-2 flex justify-between font-bold text-base"><span>Final Cost</span><span className="text-green-700">₹{Math.round(finalCost).toLocaleString('en-IN')}</span></div>
                </div>
              )}

              {/* Payment Milestones */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-sm">Payment Milestones</h3>
                  <button type="button" onClick={() => append({ name: '', percentage: 0, dueDate: '' })}
                    className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                    <Plus className="w-3 h-3" /> Add Milestone
                  </button>
                </div>
                <div className="space-y-2">
                  {fields.map((field, i) => (
                    <div key={field.id} className="flex gap-2 items-start">
                      <input {...register(`milestones.${i}.name`)} placeholder="Milestone name" className="form-input flex-1 text-sm py-1.5" />
                      <input {...register(`milestones.${i}.percentage`, { valueAsNumber: true })} type="number" placeholder="%" className="form-input w-20 text-sm py-1.5" />
                      <input {...register(`milestones.${i}.dueDate`)} type="date" className="form-input w-36 text-sm py-1.5" />
                      <button type="button" onClick={() => remove(i)} className="p-1.5 hover:bg-red-50 rounded text-red-400">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="form-label">Notes</label>
                <textarea {...register('notes')} className="form-input resize-none" rows={2} />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={createMutation.isPending} className="btn-primary">
                  {createMutation.isPending ? 'Creating...' : 'Create Quotation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
