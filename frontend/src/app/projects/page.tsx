'use client';

import { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectsApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Plus, Building2, MapPin, X, Edit2, Eye, Layers } from 'lucide-react';

const PROJECT_TYPES = ['APARTMENT','VILLA','PLOT','FARM_LAND','COMMERCIAL','MIXED_DEVELOPMENT'];

const projectSchema = z.object({
  name: z.string().min(2),
  location: z.string().min(2),
  type: z.string().min(1),
  reraNumber: z.string().optional(),
  description: z.string().optional(),
  amenities: z.string().optional(),
});
type ProjectForm = z.infer<typeof projectSchema>;

export default function ProjectsPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const [showModal, setShowModal] = useState(false);
  const [editProject, setEditProject] = useState<any>(null);

  const isAdmin = ['SUPER_ADMIN','ADMIN'].includes(user?.role || '');

  const { data, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.getAll().then(r => r.data),
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ProjectForm>({
    resolver: zodResolver(projectSchema),
  });

  const saveMutation = useMutation({
    mutationFn: (data: ProjectForm) => editProject ? projectsApi.update(editProject.id, data) : projectsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] });
      toast.success(editProject ? 'Project updated' : 'Project created');
      setShowModal(false); setEditProject(null); reset();
    },
  });

  const openEdit = (p: any) => {
    setEditProject(p);
    reset({ name: p.name, location: p.location, type: p.type, reraNumber: p.reraNumber || '', description: p.description || '', amenities: p.amenities?.join(', ') || '' });
    setShowModal(true);
  };

  const projects = data?.projects || [];

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
            <p className="text-gray-500 text-sm mt-0.5">{projects.length} projects</p>
          </div>
          {isAdmin && (
            <button onClick={() => { reset(); setEditProject(null); setShowModal(true); }} className="btn-primary flex items-center gap-2">
              <Plus className="w-4 h-4" /> New Project
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="section-card p-6 animate-pulse">
                <div className="h-5 bg-gray-200 rounded w-3/4 mb-3" />
                <div className="h-4 bg-gray-100 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="section-card p-16 text-center">
            <Building2 className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500">No projects yet. Create your first project.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((p: any) => (
              <div key={p.id} className="section-card hover:shadow-lg transition-shadow cursor-pointer">
                {p.gallery?.[0] ? (
                  <img src={p.gallery[0]} alt={p.name} className="w-full h-40 object-cover rounded-t-2xl" />
                ) : (
                  <div className="w-full h-40 bg-gradient-to-br from-navy-900 to-blue-800 rounded-t-2xl flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, #0d1642 0%, #1a237e 100%)' }}>
                    <Building2 className="w-12 h-12 text-white/30" />
                  </div>
                )}
                <div className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="font-bold text-gray-900">{p.name}</h2>
                      <div className="flex items-center gap-1 mt-1 text-gray-500">
                        <MapPin className="w-3 h-3" />
                        <span className="text-xs">{p.location}</span>
                      </div>
                    </div>
                    <span className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded-full font-medium">{p.type?.replace(/_/g, ' ')}</span>
                  </div>
                  {p.reraNumber && <p className="text-xs text-gray-400 mt-2">RERA: {p.reraNumber}</p>}
                  <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
                    <Layers className="w-4 h-4" />
                    <span>{p._count?.inventory || 0} units</span>
                    <span className="text-gray-300">·</span>
                    <span>{p._count?.leads || 0} leads</span>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <button onClick={() => router.push(`/projects/${p.id}`)}
                      className="flex-1 btn-secondary text-xs flex items-center justify-center gap-1">
                      <Eye className="w-3 h-3" /> View
                    </button>
                    {isAdmin && (
                      <button onClick={() => openEdit(p)}
                        className="flex-1 btn-secondary text-xs flex items-center justify-center gap-1">
                        <Edit2 className="w-3 h-3" /> Edit
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="font-bold text-lg">{editProject ? 'Edit Project' : 'New Project'}</h2>
              <button onClick={() => { setShowModal(false); setEditProject(null); reset(); }}><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit(d => saveMutation.mutate(d))} className="p-6 space-y-4">
              <div>
                <label className="form-label">Project Name *</label>
                <input {...register('name')} className="form-input" placeholder="e.g. Aarovia Heights" />
                {errors.name && <p className="form-error">Name required</p>}
              </div>
              <div>
                <label className="form-label">Location *</label>
                <input {...register('location')} className="form-input" placeholder="City, State" />
              </div>
              <div>
                <label className="form-label">Project Type *</label>
                <select {...register('type')} className="form-input">
                  <option value="">Select type</option>
                  {PROJECT_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">RERA Number</label>
                <input {...register('reraNumber')} className="form-input" placeholder="RERA registration number" />
              </div>
              <div>
                <label className="form-label">Description</label>
                <textarea {...register('description')} className="form-input resize-none" rows={3} />
              </div>
              <div>
                <label className="form-label">Amenities (comma-separated)</label>
                <input {...register('amenities')} className="form-input" placeholder="Swimming Pool, Gym, Club House" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={saveMutation.isPending} className="btn-primary">
                  {saveMutation.isPending ? 'Saving...' : editProject ? 'Update' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
