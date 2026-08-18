'use client';

import DashboardLayout from '@/components/layout/DashboardLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { invoicesApi } from '@/lib/api';
import { useState } from 'react';
import { format } from 'date-fns';
import { Download, FileText } from 'lucide-react';
import toast from 'react-hot-toast';

const INVOICE_TYPE_COLORS: Record<string, string> = {
  BOOKING: 'bg-blue-100 text-blue-700',
  DEMAND: 'bg-yellow-100 text-yellow-700',
  TAX: 'bg-purple-100 text-purple-700',
  FINAL: 'bg-green-100 text-green-700',
};

export default function InvoicesPage() {
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['invoices', page, typeFilter],
    queryFn: () => invoicesApi.getAll({ page, type: typeFilter }).then(r => r.data),
  });

  const downloadPDF = async (id: string, invoiceNo: string) => {
    try {
      const res = await invoicesApi.generatePDF(id);
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a'); a.href = url; a.download = `${invoiceNo}.pdf`; a.click();
    } catch { toast.error('Download failed'); }
  };

  const invoices = data?.invoices || [];
  const total = data?.total || 0;

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
            <p className="text-gray-500 text-sm mt-0.5">{total} invoices</p>
          </div>
        </div>

        <div className="section-card p-4">
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400">
            <option value="">All Types</option>
            {['BOOKING','DEMAND','TAX','FINAL'].map(t => <option key={t} value={t}>{t} Invoice</option>)}
          </select>
        </div>

        <div className="section-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  {['Invoice No', 'Type', 'Customer', 'Unit', 'Amount', 'GST', 'Total', 'Date', 'Actions'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => <tr key={i}><td colSpan={9}><div className="h-4 bg-gray-100 rounded m-3 animate-pulse" /></td></tr>)
                ) : invoices.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-16">
                      <FileText className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                      <p className="text-gray-400 text-sm">No invoices yet</p>
                    </td>
                  </tr>
                ) : invoices.map((inv: any) => (
                  <tr key={inv.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-medium text-sm text-blue-600">{inv.invoiceNo}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${INVOICE_TYPE_COLORS[inv.type] || 'bg-gray-100'}`}>{inv.type}</span>
                    </td>
                    <td className="px-4 py-3 text-sm">{inv.booking?.lead?.customerName}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{inv.booking?.inventory?.unitNumber}</td>
                    <td className="px-4 py-3 text-sm">₹{Number(inv.amount).toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3 text-sm">₹{Number(inv.gstAmount || 0).toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3 text-sm font-bold">₹{Number(inv.totalAmount).toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{format(new Date(inv.createdAt), 'dd MMM yyyy')}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => downloadPDF(inv.id, inv.invoiceNo)}
                        className="p-1.5 hover:bg-blue-50 rounded text-blue-600" title="Download PDF">
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
    </DashboardLayout>
  );
}
