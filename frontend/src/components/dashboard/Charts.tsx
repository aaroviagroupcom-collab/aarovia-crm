'use client';
import React from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend,
} from 'recharts';

const GOLD = '#C9A84C';
const NAVY = '#0A1628';
const COLORS = ['#C9A84C', '#0A1628', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

// ─── Area Chart: Booking & Revenue Trend ─────────────────────────────────────
export function BookingTrendChart({ data }: { data: { month: string; bookings: number; revenue: number }[] }) {
  return (
    <div className="section-card">
      <h3 className="text-base font-semibold text-navy-900 mb-4">Booking & Revenue Trend</h3>
      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <defs>
            <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={GOLD} stopOpacity={0.3} />
              <stop offset="95%" stopColor={GOLD} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="navyGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={NAVY} stopOpacity={0.2} />
              <stop offset="95%" stopColor={NAVY} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="month" tick={{ fontSize: 11 }} />
          <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
          <Tooltip
            contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '12px' }}
            formatter={(value: number, name: string) =>
              name === 'revenue' ? [`₹ ${value.toLocaleString('en-IN')}`, 'Revenue'] : [value, 'Bookings']
            }
          />
          <Legend />
          <Area yAxisId="left" type="monotone" dataKey="bookings" stroke={GOLD} fill="url(#goldGrad)" strokeWidth={2} name="Bookings" />
          <Area yAxisId="right" type="monotone" dataKey="revenue" stroke={NAVY} fill="url(#navyGrad)" strokeWidth={2} name="Revenue (₹)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Pie Chart: Lead Sources ─────────────────────────────────────────────────
export function LeadSourceChart({ data }: { data: { source: string; count: number }[] }) {
  const formatted = data.map((d) => ({ name: d.source.replace(/_/g, ' '), value: d.count }));

  return (
    <div className="section-card">
      <h3 className="text-base font-semibold text-navy-900 mb-4">Lead Sources</h3>
      <ResponsiveContainer width="100%" height={240}>
        <PieChart>
          <Pie
            data={formatted}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={90}
            paddingAngle={3}
            dataKey="value"
          >
            {formatted.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '12px' }}
          />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Funnel: Sales Pipeline ───────────────────────────────────────────────────
export function SalesFunnelChart({ data }: {
  data: { status: string; count: number; color?: string }[];
}) {
  const max = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="section-card">
      <h3 className="text-base font-semibold text-navy-900 mb-4">Sales Funnel</h3>
      <div className="space-y-2">
        {data.map((item, i) => {
          const width = Math.max((item.count / max) * 100, 8);
          const colors = [GOLD, '#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444'];
          const bg = item.color ?? colors[i % colors.length];
          return (
            <div key={item.status} className="flex items-center gap-3">
              <div className="w-28 text-xs text-gray-600 font-medium text-right truncate">
                {item.status.replace(/_/g, ' ')}
              </div>
              <div className="flex-1 h-7 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full flex items-center justify-end pr-2 transition-all duration-700"
                  style={{ width: `${width}%`, backgroundColor: bg }}
                >
                  <span className="text-xs text-white font-semibold">{item.count}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Bar Chart: Executive Performance ────────────────────────────────────────
export function ExecutivePerformanceChart({ data }: {
  data: { name: string; leads: number; bookings: number; revenue: number }[];
}) {
  return (
    <div className="section-card">
      <h3 className="text-base font-semibold text-navy-900 mb-4">Executive Performance</h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '12px' }} />
          <Legend />
          <Bar dataKey="leads" fill="#3B82F6" name="Leads" radius={[3, 3, 0, 0]} />
          <Bar dataKey="bookings" fill={GOLD} name="Bookings" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Inventory Status Grid ────────────────────────────────────────────────────
export function InventoryStatusCards({ data }: {
  data: { status: string; count: number; percentage: number }[];
}) {
  const statusColors: Record<string, string> = {
    AVAILABLE: 'bg-green-50 border-green-200 text-green-700',
    BLOCKED: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    SOLD: 'bg-red-50 border-red-200 text-red-700',
    UNDER_CONSTRUCTION: 'bg-blue-50 border-blue-200 text-blue-700',
  };

  return (
    <div className="section-card">
      <h3 className="text-base font-semibold text-navy-900 mb-4">Inventory Status</h3>
      <div className="grid grid-cols-2 gap-3">
        {data.map((item) => (
          <div
            key={item.status}
            className={`border rounded-xl p-3 ${statusColors[item.status] ?? 'bg-gray-50 border-gray-200 text-gray-700'}`}
          >
            <p className="text-2xl font-bold">{item.count}</p>
            <p className="text-xs font-medium mt-0.5">{item.status.replace(/_/g, ' ')}</p>
            <p className="text-xs opacity-70 mt-0.5">{item.percentage.toFixed(1)}%</p>
          </div>
        ))}
      </div>
    </div>
  );
}
