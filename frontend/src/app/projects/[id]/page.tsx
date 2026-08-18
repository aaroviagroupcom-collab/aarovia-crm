'use client';

import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useQuery } from '@tanstack/react-query';
import { projectsApi, inventoryApi } from '@/lib/api';
import { ArrowLeft, MapPin, Building2, Layers, Users } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  AVAILABLE: 'bg-green-100 border-green-300 text-green-800',
  BLOCKED: 'bg-yellow-100 border-yellow-300 text-yellow-800',
  SOLD: 'bg-red-100 border-red-300 text-red-800',
  RESERVED: 'bg-purple-100 border-purple-300 text-purple-800',
};

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const { data: project, isLoading } = useQuery({
    queryKey: ['project', id],
    queryFn: () => projectsApi.getById(id).then(r => r.data.project),
  });

  const { data: inventoryData } = useQuery({
    queryKey: ['inventory', id],
    queryFn: () => inventoryApi.getAll({ projectId: id }).then(r => r.data),
  });

  const units = inventoryData?.inventory || [];
  const stats = {
    available: units.filter((u: any) => u.status === 'AVAILABLE').length,
    sold: units.filter((u: any) => u.status === 'SOLD').length,
    blocked: units.filter((u: any) => u.status === 'BLOCKED').length,
  };

  // Group by floor
  const byFloor: Record<number, any[]> = {};
  units.forEach((u: any) => {
    const f = u.floor ?? 0;
    if (!byFloor[f]) byFloor[f] = [];
    byFloor[f].push(u);
  });
  const floors = Object.keys(byFloor).map(Number).sort((a, b) => b - a);

  if (isLoading) return (
    <DashboardLayout>
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/3" />
        <div className="h-48 bg-gray-200 rounded-2xl" />
      </div>
    </DashboardLayout>
  );

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{project?.name}</h1>
            <div className="flex items-center gap-1 text-gray-500 text-sm mt-0.5">
              <MapPin className="w-3 h-3" />{project?.location}
            </div>
          </div>
          <span className="ml-auto text-xs px-3 py-1 bg-blue-50 text-blue-700 rounded-full font-medium">{project?.type?.replace(/_/g, ' ')}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Info */}
          <div className="space-y-4">
            <div className="section-card p-5">
              <h2 className="font-semibold mb-3">Project Details</h2>
              <div className="space-y-2 text-sm">
                {project?.reraNumber && <div className="flex justify-between"><span className="text-gray-500">RERA No.</span><span className="font-medium">{project.reraNumber}</span></div>}
                <div className="flex justify-between"><span className="text-gray-500">Total Units</span><span className="font-medium">{units.length}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Available</span><span className="font-medium text-green-600">{stats.available}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Sold</span><span className="font-medium text-red-600">{stats.sold}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Blocked</span><span className="font-medium text-yellow-600">{stats.blocked}</span></div>
              </div>
              {project?.description && (
                <div className="mt-3 pt-3 border-t">
                  <p className="text-xs text-gray-500 mb-1">Description</p>
                  <p className="text-sm text-gray-700">{project.description}</p>
                </div>
              )}
            </div>

            {project?.amenities?.length > 0 && (
              <div className="section-card p-5">
                <h2 className="font-semibold mb-3">Amenities</h2>
                <div className="flex flex-wrap gap-2">
                  {project.amenities.map((a: string) => (
                    <span key={a} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">{a}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Inventory Grid */}
          <div className="lg:col-span-2 section-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">Inventory Grid</h2>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-400 inline-block" />Available</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-400 inline-block" />Blocked</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-400 inline-block" />Sold</span>
              </div>
            </div>
            {floors.length === 0 ? (
              <div className="text-center py-16 text-gray-400">No inventory added yet</div>
            ) : (
              <div className="space-y-4">
                {floors.map(floor => (
                  <div key={floor}>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                      {floor === 0 ? 'Ground Floor' : `Floor ${floor}`}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {byFloor[floor].map((unit: any) => (
                        <div key={unit.id}
                          className={`w-20 h-14 border-2 rounded-xl text-xs font-bold flex flex-col items-center justify-center ${STATUS_COLORS[unit.status] || 'bg-gray-100 border-gray-200 text-gray-700'}`}
                          title={`${unit.unitNumber} — ${unit.type} — ${unit.area} sqft`}>
                          <span>{unit.unitNumber}</span>
                          <span className="font-normal opacity-70">{unit.type}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
