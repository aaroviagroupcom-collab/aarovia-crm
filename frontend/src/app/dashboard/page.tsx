'use client';

import DashboardLayout from '@/components/layout/DashboardLayout';
import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '@/lib/api';
import {
  Users, UserPlus, PhoneCall, CheckCircle, MapPin, Eye,
  TrendingUp, BookOpen, CreditCard, AlertTriangle, Building2, BarChart2,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, FunnelChart, Funnel, LabelList,
} from 'recharts';
import { formatDistanceToNow } from 'date-fns';

const COLORS = ['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#84cc16'];

const FUNNEL_COLORS = ['#dbeafe', '#bfdbfe', '#93c5fd', '#60a5fa', '#3b82f6', '#2563eb', '#1d4ed8', '#1e40af'];

function StatCard({ icon: Icon, label, value, color, change }: {
  icon: React.ElementType; label: string; value: string | number; color: string; change?: string;
}) {
  return (
    <div className="stat-card animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <p className="stat-label">{label}</p>
          <p className="stat-value mt-2" style={{ color }}>{typeof value === 'number' ? value.toLocaleString('en-IN') : value}</p>
          {change && <p className="text-xs text-green-600 font-medium mt-1">{change}</p>}
        </div>
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: `${color}15` }}>
          <Icon className="w-6 h-6" style={{ color }} />
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => dashboardApi.getStats().then((r) => r.data),
    refetchInterval: 60000,
  });

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="stat-card animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-3" />
              <div className="h-8 bg-gray-200 rounded w-1/2" />
            </div>
          ))}
        </div>
      </DashboardLayout>
    );
  }

  const widgets = data?.widgets || {};
  const charts = data?.charts || {};
  const recentBookings = data?.recentBookings || [];

  const statCards = [
    { icon: Users, label: 'Total Leads', value: widgets.totalLeads || 0, color: '#3b82f6' },
    { icon: UserPlus, label: 'New Leads', value: widgets.newLeads || 0, color: '#8b5cf6' },
    { icon: PhoneCall, label: 'Follow Ups', value: widgets.followupLeads || 0, color: '#f59e0b' },
    { icon: CheckCircle, label: 'Qualified', value: widgets.qualifiedLeads || 0, color: '#10b981' },
    { icon: MapPin, label: 'Site Visit Fixed', value: widgets.siteVisitFixed || 0, color: '#06b6d4' },
    { icon: Eye, label: 'Site Visit Done', value: widgets.siteVisitDone || 0, color: '#6366f1' },
    { icon: TrendingUp, label: 'Opportunities', value: widgets.opportunities || 0, color: '#ec4899' },
    { icon: BookOpen, label: 'Bookings', value: widgets.bookings || 0, color: '#14b8a6' },
    { icon: CreditCard, label: 'Collections', value: `₹${(Number(widgets.collections || 0) / 100000).toFixed(1)}L`, color: '#22c55e' },
    { icon: AlertTriangle, label: 'Due Payments', value: `₹${(Number(widgets.duePayments || 0) / 100000).toFixed(1)}L`, color: '#ef4444' },
    { icon: Building2, label: 'Available Units', value: widgets.inventoryAvailable || 0, color: '#84cc16' },
    { icon: BarChart2, label: 'Sold Units', value: widgets.inventorySold || 0, color: '#f97316' },
  ];

  const sourceData = (charts.leadsBySource || []).map((s: { source: string; _count: { id: number } }) => ({
    name: s.source.replace(/_/g, ' '),
    value: s._count.id,
  }));

  const funnelData = (charts.salesFunnel || []).map((f: { status: string; count: number }, i: number) => ({
    name: f.status.replace(/_/g, ' '),
    value: f.count,
    fill: FUNNEL_COLORS[i % FUNNEL_COLORS.length],
  }));

  const bookingTrend = (charts.bookingTrend || []).map((b: { month: string; count: string; revenue: string }) => ({
    month: b.month,
    bookings: parseInt(b.count),
    revenue: parseFloat(b.revenue || '0') / 100000,
  }));

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Welcome back — here's what's happening today</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {statCards.map((card) => (
            <StatCard key={card.label} {...card} />
          ))}
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Booking Trend */}
          <div className="section-card lg:col-span-2">
            <div className="p-6 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Booking & Revenue Trend</h2>
              <p className="text-xs text-gray-500 mt-1">Last 12 months</p>
            </div>
            <div className="p-6">
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={bookingTrend}>
                  <defs>
                    <linearGradient id="bookGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number, name: string) => [
                    name === 'revenue' ? `₹${v.toFixed(1)}L` : v, name
                  ]} />
                  <Area type="monotone" dataKey="bookings" stroke="#3b82f6" fill="url(#bookGrad)" strokeWidth={2} name="Bookings" />
                  <Area type="monotone" dataKey="revenue" stroke="#10b981" fill="url(#revGrad)" strokeWidth={2} name="Revenue (L)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Lead Source Pie */}
          <div className="section-card">
            <div className="p-6 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Lead Sources</h2>
            </div>
            <div className="p-6">
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={sourceData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                    {sourceData.map((_: unknown, index: number) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number, name: string) => [v, name]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-2">
                {sourceData.slice(0, 5).map((s: { name: string; value: number }, i: number) => (
                  <div key={s.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                      <span className="text-gray-600">{s.name}</span>
                    </div>
                    <span className="font-semibold">{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Sales Funnel */}
          <div className="section-card">
            <div className="p-6 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Sales Funnel</h2>
            </div>
            <div className="p-6 space-y-2">
              {funnelData.map((f: { name: string; value: number; fill: string }, i: number) => (
                <div key={f.name} className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 w-32 truncate">{f.name}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                    <div
                      className="h-full rounded-full flex items-center px-3 transition-all duration-500"
                      style={{
                        width: `${Math.max((f.value / (funnelData[0]?.value || 1)) * 100, 5)}%`,
                        background: f.fill,
                      }}
                    >
                      <span className="text-xs font-semibold text-white/80">{f.value}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Inventory Status */}
          <div className="section-card">
            <div className="p-6 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Inventory Overview</h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-3 gap-4 mb-6">
                {[
                  { label: 'Available', value: widgets.inventoryAvailable || 0, color: '#22c55e' },
                  { label: 'Blocked', value: widgets.inventoryBlocked || 0, color: '#f59e0b' },
                  { label: 'Sold', value: widgets.inventorySold || 0, color: '#ef4444' },
                ].map((s) => (
                  <div key={s.label} className="text-center p-4 rounded-xl" style={{ background: `${s.color}15` }}>
                    <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
                    <p className="text-xs text-gray-500 mt-1">{s.label}</p>
                  </div>
                ))}
              </div>
              {/* Recent Bookings */}
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Recent Bookings</h3>
              <div className="space-y-2">
                {recentBookings.slice(0, 4).map((b: { bookingNo: string; lead: { customerName: string }; inventory: { unitNumber: string } }) => (
                  <div key={b.bookingNo} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium">{b.lead.customerName}</p>
                      <p className="text-xs text-gray-500">Unit {b.inventory.unitNumber}</p>
                    </div>
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full font-medium">Booked</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
