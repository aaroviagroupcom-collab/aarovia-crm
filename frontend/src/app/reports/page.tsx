'use client';

import { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useQuery } from '@tanstack/react-query';
import { reportsApi } from '@/lib/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Download, FileBarChart, TrendingUp, Users, CreditCard, Building2 } from 'lucide-react';
import toast from 'react-hot-toast';

const COLORS = ['#3b82f6','#8b5cf6','#10b981','#f59e0b','#ef4444','#06b6d4','#ec4899'];

type ReportType = 'leads' | 'collections' | 'inventory';

export default function ReportsPage() {
  const [activeReport, setActiveReport] = useState<ReportType>('leads');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const { data: leadsReport, isLoading: leadsLoading } = useQuery({
    queryKey: ['report-leads', dateFrom, dateTo],
    queryFn: () => reportsApi.getLeads({ dateFrom, dateTo }).then(r => r.data),
    enabled: activeReport === 'leads',
  });

  const { data: collectionsReport, isLoading: collLoading } = useQuery({
    queryKey: ['report-collections', dateFrom, dateTo],
    queryFn: () => reportsApi.getCollections({ dateFrom, dateTo }).then(r => r.data),
    enabled: activeReport === 'collections',
  });

  const { data: inventoryReport, isLoading: invLoading } = useQuery({
    queryKey: ['report-inventory'],
    queryFn: () => reportsApi.getInventory().then(r => r.data),
    enabled: activeReport === 'inventory',
  });

  const handleExport = async (format: 'excel' | 'csv') => {
    try {
      const res = await reportsApi.export(activeReport, { format, dateFrom, dateTo });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url; a.download = `${activeReport}-report.${format === 'excel' ? 'xlsx' : 'csv'}`; a.click();
    } catch { toast.error('Export failed'); }
  };

  const tabs = [
    { id: 'leads' as const, label: 'Leads Report', icon: Users },
    { id: 'collections' as const, label: 'Collections', icon: CreditCard },
    { id: 'inventory' as const, label: 'Inventory', icon: Building2 },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
            <p className="text-gray-500 text-sm mt-0.5">Analytics & Insights</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => handleExport('excel')} className="btn-secondary flex items-center gap-2 text-sm">
              <Download className="w-4 h-4" /> Excel
            </button>
            <button onClick={() => handleExport('csv')} className="btn-secondary flex items-center gap-2 text-sm">
              <Download className="w-4 h-4" /> CSV
            </button>
          </div>
        </div>

        {/* Report Type Tabs */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveReport(tab.id)}
              className={`flex items-center gap-2 py-2 px-4 text-sm font-medium rounded-lg transition-colors ${activeReport === tab.id ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
              <tab.icon className="w-4 h-4" />{tab.label}
            </button>
          ))}
        </div>

        {/* Date Filter */}
        <div className="section-card p-4 flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-500">From</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400" />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-500">To</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400" />
          </div>
          {(dateFrom || dateTo) && (
            <button onClick={() => { setDateFrom(''); setDateTo(''); }} className="text-sm text-red-500 hover:underline">Clear</button>
          )}
        </div>

        {/* Leads Report */}
        {activeReport === 'leads' && (
          <div className="space-y-4">
            {leadsLoading ? <div className="h-64 bg-gray-100 rounded-2xl animate-pulse" /> : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Total Leads', value: leadsReport?.summary?.total || 0, color: '#3b82f6' },
                    { label: 'Converted', value: leadsReport?.summary?.converted || 0, color: '#10b981' },
                    { label: 'This Month', value: leadsReport?.summary?.thisMonth || 0, color: '#8b5cf6' },
                    { label: 'Conversion Rate', value: `${leadsReport?.summary?.conversionRate || 0}%`, color: '#f59e0b' },
                  ].map(s => (
                    <div key={s.label} className="section-card p-4">
                      <p className="text-xs text-gray-500">{s.label}</p>
                      <p className="text-2xl font-bold mt-1" style={{ color: s.color }}>{s.value}</p>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="section-card p-5">
                    <h3 className="font-semibold mb-4">Leads by Source</h3>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={(leadsReport?.bySource || []).map((s: any) => ({ name: s.source?.replace(/_/g, ' '), count: s._count?.id || 0 }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="section-card p-5">
                    <h3 className="font-semibold mb-4">Leads by Status</h3>
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie data={(leadsReport?.byStatus || []).map((s: any) => ({ name: s.status?.replace(/_/g, ' '), value: s._count?.id || 0 }))}
                          cx="50%" cy="50%" outerRadius={80} dataKey="value">
                          {(leadsReport?.byStatus || []).map((_: any, i: number) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="section-card overflow-hidden">
                  <div className="p-4 border-b"><h3 className="font-semibold">Executive Performance</h3></div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-100 bg-gray-50/50">
                          {['Executive', 'Total Leads', 'Qualified', 'Bookings', 'Conversion'].map(h => (
                            <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {(leadsReport?.byExecutive || []).map((e: any) => (
                          <tr key={e.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                            <td className="px-4 py-3 font-medium text-sm">{e.name}</td>
                            <td className="px-4 py-3 text-sm">{e.totalLeads}</td>
                            <td className="px-4 py-3 text-sm">{e.qualified}</td>
                            <td className="px-4 py-3 text-sm">{e.bookings}</td>
                            <td className="px-4 py-3 text-sm">{e.conversion}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Collections Report */}
        {activeReport === 'collections' && (
          <div className="space-y-4">
            {collLoading ? <div className="h-64 bg-gray-100 rounded-2xl animate-pulse" /> : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Total Collected', value: `₹${(Number(collectionsReport?.summary?.total || 0) / 100000).toFixed(1)}L`, color: '#10b981' },
                    { label: 'Total Due', value: `₹${(Number(collectionsReport?.summary?.due || 0) / 100000).toFixed(1)}L`, color: '#ef4444' },
                    { label: 'This Month', value: `₹${(Number(collectionsReport?.summary?.thisMonth || 0) / 100000).toFixed(1)}L`, color: '#3b82f6' },
                    { label: 'Overdue', value: collectionsReport?.summary?.overdueCount || 0, color: '#f59e0b' },
                  ].map(s => (
                    <div key={s.label} className="section-card p-4">
                      <p className="text-xs text-gray-500">{s.label}</p>
                      <p className="text-2xl font-bold mt-1" style={{ color: s.color }}>{s.value}</p>
                    </div>
                  ))}
                </div>
                <div className="section-card p-5">
                  <h3 className="font-semibold mb-4">Monthly Collection Trend</h3>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={(collectionsReport?.monthly || []).map((m: any) => ({ month: m.month, amount: Number(m.amount) / 100000 }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v: number) => [`₹${v.toFixed(1)}L`, 'Collection']} />
                      <Bar dataKey="amount" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
          </div>
        )}

        {/* Inventory Report */}
        {activeReport === 'inventory' && (
          <div className="space-y-4">
            {invLoading ? <div className="h-64 bg-gray-100 rounded-2xl animate-pulse" /> : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Total Units', value: inventoryReport?.summary?.total || 0, color: '#6366f1' },
                    { label: 'Available', value: inventoryReport?.summary?.available || 0, color: '#22c55e' },
                    { label: 'Sold', value: inventoryReport?.summary?.sold || 0, color: '#ef4444' },
                    { label: 'Blocked', value: inventoryReport?.summary?.blocked || 0, color: '#f59e0b' },
                  ].map(s => (
                    <div key={s.label} className="section-card p-4">
                      <p className="text-xs text-gray-500">{s.label}</p>
                      <p className="text-2xl font-bold mt-1" style={{ color: s.color }}>{s.value}</p>
                    </div>
                  ))}
                </div>
                <div className="section-card p-5">
                  <h3 className="font-semibold mb-4">Inventory by Project</h3>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={inventoryReport?.byProject || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="available" fill="#22c55e" name="Available" stackId="a" />
                      <Bar dataKey="blocked" fill="#f59e0b" name="Blocked" stackId="a" />
                      <Bar dataKey="sold" fill="#ef4444" name="Sold" stackId="a" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
