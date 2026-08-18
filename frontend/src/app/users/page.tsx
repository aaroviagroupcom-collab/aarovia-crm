'use client';

import { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '@/lib/api';
import { useAuthStore, ROLE_LABELS } from '@/store/auth.store';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { Plus, X, Edit2, UserX, Shield } from 'lucide-react';

const ROLES = ['SUPER_ADMIN','ADMIN','SALES_MANAGER','TEAM_LEADER','SALES_EXECUTIVE','POST_SALES_EXECUTIVE','ACCOUNTS','MARKETING','CHANNEL_PARTNER'];

const userSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6).optional().or(z.literal('')),
  role: z.string().min(1),
  phone: z.string().optional(),
});
type UserForm = z.infer<typeof userSchema>;

const ROLE_BADGE: Record<string, string> = {
  SUPER_ADMIN: 'bg-red-100 text-red-800',
  ADMIN: 'bg-orange-100 text-orange-800',
  SALES_MANAGER: 'bg-purple-100 text-purple-800',
  TEAM_LEADER: 'bg-indigo-100 text-indigo-800',
  SALES_EXECUTIVE: 'bg-blue-100 text-blue-800',
  POST_SALES_EXECUTIVE: 'bg-cyan-100 text-cyan-800',
  ACCOUNTS: 'bg-green-100 text-green-800',
  MARKETING: 'bg-yellow-100 text-yellow-800',
  CHANNEL_PARTNER: 'bg-gray-100 text-gray-700',
};

export default function UsersPage() {
  const qc = useQueryClient();
  const { user: currentUser } = useAuthStore();
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState<any>(null);

  const isSuperAdmin = ['SUPER_ADMIN','ADMIN'].includes(currentUser?.role || '');

  const { data, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.getAll().then(r => r.data),
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<UserForm>({
    resolver: zodResolver(userSchema),
  });

  const saveMutation = useMutation({
    mutationFn: (d: UserForm) => editUser ? usersApi.update(editUser.id, d) : usersApi.create(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      toast.success(editUser ? 'User updated' : 'User created');
      setShowModal(false); setEditUser(null); reset();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to save user'),
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => usersApi.deactivate(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); toast.success('User deactivated'); },
  });

  const openEdit = (u: any) => {
    setEditUser(u);
    reset({ name: u.name, email: u.email, role: u.role, phone: u.phone || '', password: '' });
    setShowModal(true);
  };

  const users = data?.users || [];

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
            <p className="text-gray-500 text-sm mt-0.5">{users.length} users</p>
          </div>
          {isSuperAdmin && (
            <button onClick={() => { reset(); setEditUser(null); setShowModal(true); }} className="btn-primary flex items-center gap-2 text-sm">
              <Plus className="w-4 h-4" /> Add User
            </button>
          )}
        </div>

        <div className="section-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  {['User', 'Role', 'Phone', 'Status', 'Created', 'Actions'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {isLoading ? (
                  Array.from({ length: 6 }).map((_, i) => <tr key={i}><td colSpan={6}><div className="h-4 bg-gray-100 rounded m-3 animate-pulse" /></td></tr>)
                ) : users.map((u: any) => (
                  <tr key={u.id} className={`hover:bg-gray-50/50 ${!u.isActive ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                          style={{ background: '#FFD70020', color: '#0d1642' }}>
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{u.name}</p>
                          <p className="text-xs text-gray-400">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${ROLE_BADGE[u.role] || 'bg-gray-100'}`}>
                        {ROLE_LABELS[u.role as keyof typeof ROLE_LABELS] || u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{u.phone || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {u.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{format(new Date(u.createdAt), 'dd MMM yyyy')}</td>
                    <td className="px-4 py-3">
                      {isSuperAdmin && u.id !== currentUser?.id && (
                        <div className="flex items-center gap-1">
                          <button onClick={() => openEdit(u)} className="p-1.5 hover:bg-yellow-50 rounded text-yellow-600" title="Edit">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {u.isActive && (
                            <button onClick={() => { if (confirm('Deactivate user?')) deactivateMutation.mutate(u.id); }}
                              className="p-1.5 hover:bg-red-50 rounded text-red-500" title="Deactivate">
                              <UserX className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      )}
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
              <h2 className="font-bold text-lg">{editUser ? 'Edit User' : 'New User'}</h2>
              <button onClick={() => { setShowModal(false); setEditUser(null); reset(); }}><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit(d => saveMutation.mutate(d))} className="p-6 space-y-4">
              <div>
                <label className="form-label">Full Name *</label>
                <input {...register('name')} className="form-input" />
                {errors.name && <p className="form-error">Name required</p>}
              </div>
              <div>
                <label className="form-label">Email *</label>
                <input {...register('email')} type="email" className="form-input" />
                {errors.email && <p className="form-error">Valid email required</p>}
              </div>
              <div>
                <label className="form-label">{editUser ? 'New Password (leave blank to keep)' : 'Password *'}</label>
                <input {...register('password')} type="password" className="form-input" placeholder={editUser ? '••••••••' : 'Min 6 characters'} />
              </div>
              <div>
                <label className="form-label">Role *</label>
                <select {...register('role')} className="form-input">
                  <option value="">Select role</option>
                  {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r as keyof typeof ROLE_LABELS] || r}</option>)}
                </select>
                {errors.role && <p className="form-error">Role required</p>}
              </div>
              <div>
                <label className="form-label">Phone</label>
                <input {...register('phone')} className="form-input" placeholder="Mobile number" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => { setShowModal(false); reset(); }} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={saveMutation.isPending} className="btn-primary">
                  {saveMutation.isPending ? 'Saving...' : editUser ? 'Update' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
