'use client';

import { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inventoryApi, projectsApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { Plus, X, Grid, List, Filter } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  AVAILABLE: 'bg-green-100 border-green-300 text-green-800 hover:bg-green-200',
  BLOCKED: 'bg-yellow-100 border-yellow-300 text-yellow-800 hover:bg-yellow-200',
  SOLD: 'bg-red-100 border-red-300 text-red-800 hover:bg-red-200',
  RESERVED: 'bg-purple-100 border-purple-300 text-purple-800 hover:bg-purple-200',
};
const STATUS_DOT: Record<string, string> = {
  AVAILABLE: 'bg-green-500', BLOCKED: 'bg-yellow-500', SOLD: 'bg-red-500', RESERVED: 'bg-purple-500',
};

const unitSchema = z.object({
  unitNumber: z.string().min(1),
  block: z.string().optional(),
  tower: z.string().optional(),
  floor: z.number().optional(),
  area: z.number().min(1),
  facing: z.string().optional(),
  type: z.string().min(1),
  baseRate: z.number().min(1),
  plcCharges: z.number().optional(),
  gstPercent: z.number().optional(),
  projectId: z.string().min(1),
  status: z.string().default('AVAILABLE'),
});
type UnitForm = z.infer<typeof unitSchema>;

export default function InventoryPage() {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const [projectId, setProjectId] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showModal, setShowModal] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<any>(null);

  const isAdmin = ['SUPER_ADMIN','ADMIN','SALES_MANAGER'].includes(user?.role || '');

  const { data: projectsData } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.getAll().then(r => r.data),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['inventory', projectId, statusFilter],
    queryFn: () => inventoryApi.getAll({ projectId, status: statusFilter }).then(r => r.data),
  });

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<UnitForm>({
    resolver: zodResolver(unitSchema),
    defaultValues: { gstPercent: 5, status: 'AVAILABLE' },
  });

  const saveMutation = useMutation({
    mutationFn: (data: UnitForm) => selectedUnit ? inventoryApi.update(selectedUnit.id, data) : inventoryApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory'] });
      toast.success(selectedUnit ? 'Unit updated' : 'Unit added');
      setShowModal(false); setSelectedUnit(null); reset();
    },
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => inventoryApi.updateStatus(id, { status }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['inventory'] }); toast.success('Status updated'); },
  });

  const units = data?.inventory || [];
  const projects = projectsData?.projects || [];

  // Group by floor for grid view
  const byFloor: Record<number, any[]> = {};
  units.forEach((u: any) => {
    const floor = u.floor ?? 0;
    if (!byFloor[floor]) byFloor[floor] = [];
    byFloor[floor].push(u);
  });
  const floors = Object.keys(byFloor).map(Number).sort((a, b) => b - a);

  const stats = {
    available: units.filter((u: any) => u.status === 'AVAILABLE').length,
    blocked: units.filter((u: any) => u.status === 'BLOCKED').length,
    sold: units.filter((u: any) => u.status === 'SOLD').length,
    reserved: units.filter((u: any) => u.status === 'RESERVED').length,
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
            <p className="text-gray-500 text-sm mt-0.5">{units.length} units</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
              <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-white shadow' : ''}`}>
                <Grid className="w-4 h-4" />
              </button>
              <button onClick={() => setViewMode('list')} className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-white shadow' : ''}`}>
                <List className="w-4 h-4" />
              </button>
            </div>
            {isAdmin && (
              <button onClick={() => { reset(); setSelectedUnit(null); setShowModal(true); }} className="btn-primary flex items-center gap-2 text-sm">
                <Plus className="w-4 h-4" /> Add Unit
              </button>
            )}
          </div>
        </div>

        {/* Status Legend + Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Available', value: stats.available, color: 'bg-green-500' },
            { label: 'Blocked', value: stats.blocked, color: 'bg-yellow-500' },
            { label: 'Sold', value: stats.sold, color: 'bg-red-500' },
            { label: 'Reserved', value: stats.reserved, color: 'bg-purple-500' },
          ].map(s => (
            <div key={s.label} className="section-card p-4 flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${s.color}`} />
              <div>
                <p className="text-xs text-gray-500">{s.label}</p>
                <p className="text-lg font-bold">{s.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="section-card p-4 flex flex-wrap gap-3">
          <select value={projectId} onChange={e => setProjectId(e.target.value)} className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400">
            <option value="">All Projects</option>
            {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400">
            <option value="">All Status</option>
            {['AVAILABLE','BLOCKED','SOLD','RESERVED'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Grid View */}
        {viewMode === 'grid' ? (
          <div className="section-card p-5">
            {isLoading ? (
              <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                {Array.from({ length: 24 }).map((_, i) => (
                  <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : floors.length === 0 ? (
              <div className="text-center py-16 text-gray-400">No units found. Add inventory to a project.</div>
            ) : (
              <div className="space-y-4">
                {floors.map(floor => (
                  <div key={floor}>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                      {floor === 0 ? 'Ground Floor' : `Floor ${floor}`}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {byFloor[floor].map((unit: any) => (
                        <button key={unit.id}
                          onClick={() => { setSelectedUnit(unit); setValue('status', unit.status); setShowModal(true); }}
                          className={`w-20 h-14 border-2 rounded-xl text-xs font-bold flex flex-col items-center justify-center transition-all ${STATUS_COLORS[unit.status] || 'bg-gray-100 border-gray-200'}`}
                          title={`${unit.unitNumber} - ${unit.type} - ${unit.area} sq ft - ₹${Number(unit.baseRate).toLocaleString('en-IN')}/sqft`}>
                          <span>{unit.unitNumber}</span>
                          <span className="font-normal opacity-70">{unit.type}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* List View */
          <div className="section-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    {['Unit No', 'Block', 'Floor', 'Area', 'Type', 'Facing', 'Base Rate', 'Final Price', 'Status', 'Actions'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {isLoading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <tr key={i}><td colSpan={10}><div className="h-4 bg-gray-100 rounded m-3 animate-pulse" /></td></tr>
                    ))
                  ) : units.map((u: any) => (
                    <tr key={u.id} className="hover:bg-gray-50/50">
                      <td className="px-4 py-3 font-medium text-sm">{u.unitNumber}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{u.block || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{u.floor ?? '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{u.area} sqft</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{u.type}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{u.facing || '—'}</td>
                      <td className="px-4 py-3 text-sm">₹{Number(u.baseRate).toLocaleString('en-IN')}/sqft</td>
                      <td className="px-4 py-3 text-sm font-medium">₹{(Number(u.area) * Number(u.baseRate) / 100000).toFixed(1)}L</td>
                      <td className="px-4 py-3">
                        <span className={`flex items-center gap-1.5 text-xs font-medium w-fit`}>
                          <div className={`w-2 h-2 rounded-full ${STATUS_DOT[u.status]}`} />
                          {u.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {isAdmin && (
                          <select value={u.status}
                            onChange={e => updateStatus.mutate({ id: u.id, status: e.target.value })}
                            className="text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none">
                            {['AVAILABLE','BLOCKED','RESERVED','SOLD'].map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Unit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="font-bold text-lg">{selectedUnit ? 'Unit Details' : 'Add Unit'}</h2>
              <button onClick={() => { setShowModal(false); setSelectedUnit(null); reset(); }}><X className="w-5 h-5" /></button>
            </div>
            {selectedUnit && !isAdmin ? (
              <div className="p-6 space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {[
                    ['Unit Number', selectedUnit.unitNumber], ['Type', selectedUnit.type],
                    ['Area', `${selectedUnit.area} sqft`], ['Floor', selectedUnit.floor ?? '—'],
                    ['Block', selectedUnit.block || '—'], ['Facing', selectedUnit.facing || '—'],
                    ['Base Rate', `₹${Number(selectedUnit.baseRate).toLocaleString('en-IN')}/sqft`],
                    ['Status', selectedUnit.status],
                  ].map(([k, v]) => (
                    <div key={k}><p className="text-gray-500 text-xs">{k}</p><p className="font-medium">{v}</p></div>
                  ))}
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit(d => saveMutation.mutate(d))} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">Project *</label>
                    <select {...register('projectId')} defaultValue={selectedUnit?.projectId || projectId} className="form-input">
                      <option value="">Select project</option>
                      {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Unit Number *</label>
                    <input {...register('unitNumber')} defaultValue={selectedUnit?.unitNumber} className="form-input" placeholder="e.g. A-101" />
                  </div>
                  <div>
                    <label className="form-label">Block</label>
                    <input {...register('block')} defaultValue={selectedUnit?.block} className="form-input" placeholder="A, B, C..." />
                  </div>
                  <div>
                    <label className="form-label">Tower</label>
                    <input {...register('tower')} defaultValue={selectedUnit?.tower} className="form-input" />
                  </div>
                  <div>
                    <label className="form-label">Floor</label>
                    <input {...register('floor', { valueAsNumber: true })} defaultValue={selectedUnit?.floor} type="number" className="form-input" />
                  </div>
                  <div>
                    <label className="form-label">Area (sqft) *</label>
                    <input {...register('area', { valueAsNumber: true })} defaultValue={selectedUnit?.area} type="number" className="form-input" />
                  </div>
                  <div>
                    <label className="form-label">Type *</label>
                    <input {...register('type')} defaultValue={selectedUnit?.type} className="form-input" placeholder="2BHK, 3BHK, Villa..." />
                  </div>
                  <div>
                    <label className="form-label">Facing</label>
                    <input {...register('facing')} defaultValue={selectedUnit?.facing} className="form-input" placeholder="East, West..." />
                  </div>
                  <div>
                    <label className="form-label">Base Rate (₹/sqft) *</label>
                    <input {...register('baseRate', { valueAsNumber: true })} defaultValue={selectedUnit?.baseRate} type="number" className="form-input" />
                  </div>
                  <div>
                    <label className="form-label">PLC Charges (₹)</label>
                    <input {...register('plcCharges', { valueAsNumber: true })} defaultValue={selectedUnit?.plcCharges} type="number" className="form-input" />
                  </div>
                  <div>
                    <label className="form-label">GST %</label>
                    <input {...register('gstPercent', { valueAsNumber: true })} defaultValue={selectedUnit?.gstPercent ?? 5} type="number" className="form-input" />
                  </div>
                  <div>
                    <label className="form-label">Status</label>
                    <select {...register('status')} defaultValue={selectedUnit?.status || 'AVAILABLE'} className="form-input">
                      {['AVAILABLE','BLOCKED','RESERVED','SOLD'].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => { setShowModal(false); setSelectedUnit(null); reset(); }} className="btn-secondary">Cancel</button>
                  <button type="submit" disabled={saveMutation.isPending} className="btn-primary">
                    {saveMutation.isPending ? 'Saving...' : selectedUnit ? 'Update Unit' : 'Add Unit'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
