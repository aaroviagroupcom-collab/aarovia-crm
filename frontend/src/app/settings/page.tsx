'use client';

import { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { templatesApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Plus, X, Edit2, Trash2, Mail, MessageSquare } from 'lucide-react';

type TemplateType = 'EMAIL' | 'WHATSAPP';

export default function SettingsPage() {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<TemplateType>('EMAIL');
  const [showModal, setShowModal] = useState(false);
  const [editTemplate, setEditTemplate] = useState<any>(null);

  const isAdmin = ['SUPER_ADMIN','ADMIN'].includes(user?.role || '');

  const { data: emailTemplates, isLoading: emailLoading } = useQuery({
    queryKey: ['templates-email'],
    queryFn: () => templatesApi.getAll('EMAIL').then(r => r.data),
  });

  const { data: waTemplates, isLoading: waLoading } = useQuery({
    queryKey: ['templates-wa'],
    queryFn: () => templatesApi.getAll('WHATSAPP').then(r => r.data),
  });

  const { register, handleSubmit, reset, setValue } = useForm<any>();

  const saveMutation = useMutation({
    mutationFn: (d: any) => editTemplate ? templatesApi.update(editTemplate.id, d) : templatesApi.create({ ...d, type: activeTab }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`templates-${activeTab === 'EMAIL' ? 'email' : 'wa'}`] });
      toast.success(editTemplate ? 'Template updated' : 'Template created');
      setShowModal(false); setEditTemplate(null); reset();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => templatesApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['templates-email'] });
      qc.invalidateQueries({ queryKey: ['templates-wa'] });
      toast.success('Template deleted');
    },
  });

  const openEdit = (t: any) => {
    setEditTemplate(t);
    setValue('name', t.name); setValue('subject', t.subject); setValue('body', t.body);
    setShowModal(true);
  };

  const templates = activeTab === 'EMAIL' ? (emailTemplates?.templates || []) : (waTemplates?.templates || []);
  const isLoading = activeTab === 'EMAIL' ? emailLoading : waLoading;

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
            <p className="text-gray-500 text-sm mt-0.5">Template & configuration management</p>
          </div>
        </div>

        {/* Sub-tabs */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
          {[
            { id: 'EMAIL' as const, label: 'Email Templates', icon: Mail },
            { id: 'WHATSAPP' as const, label: 'WhatsApp Templates', icon: MessageSquare },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 py-2 px-4 text-sm font-medium rounded-lg transition-colors ${activeTab === tab.id ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
              <tab.icon className="w-4 h-4" />{tab.label}
            </button>
          ))}
        </div>

        {/* Template List */}
        <div className="section-card overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b">
            <h2 className="font-semibold">{activeTab === 'EMAIL' ? 'Email Templates' : 'WhatsApp Templates'}</h2>
            {isAdmin && (
              <button onClick={() => { reset(); setEditTemplate(null); setShowModal(true); }}
                className="btn-primary text-sm flex items-center gap-2">
                <Plus className="w-4 h-4" /> New Template
              </button>
            )}
          </div>
          <div className="divide-y divide-gray-50">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="p-5"><div className="h-4 bg-gray-100 rounded animate-pulse" /></div>
              ))
            ) : templates.length === 0 ? (
              <div className="text-center py-16 text-gray-400">No templates yet</div>
            ) : templates.map((t: any) => (
              <div key={t.id} className="p-5 hover:bg-gray-50/50 flex items-start gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${activeTab === 'EMAIL' ? 'bg-blue-50' : 'bg-green-50'}`}>
                  {activeTab === 'EMAIL' ? <Mail className="w-5 h-5 text-blue-600" /> : <MessageSquare className="w-5 h-5 text-green-600" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900">{t.name}</h3>
                    {isAdmin && (
                      <div className="flex gap-1 ml-4">
                        <button onClick={() => openEdit(t)} className="p-1.5 hover:bg-yellow-50 rounded text-yellow-600">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => { if (confirm('Delete template?')) deleteMutation.mutate(t.id); }}
                          className="p-1.5 hover:bg-red-50 rounded text-red-400">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                  {t.subject && <p className="text-xs text-gray-500 mt-0.5">Subject: {t.subject}</p>}
                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">{t.body}</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {t.variables?.map((v: string) => (
                      <span key={v} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-mono">{`{{${v}}}`}</span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Variable Reference */}
        <div className="section-card p-5">
          <h2 className="font-semibold mb-3">Template Variables Reference</h2>
          <p className="text-sm text-gray-500 mb-3">Use these variables in your templates — they will be auto-filled when sending.</p>
          <div className="flex flex-wrap gap-2">
            {['customerName','mobile','email','projectName','unitNumber','quotationNo','amount','dueDate','executiveName','companyName'].map(v => (
              <span key={v} className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded font-mono">{`{{${v}}}`}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Template Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="font-bold text-lg">{editTemplate ? 'Edit Template' : 'New Template'}</h2>
              <button onClick={() => { setShowModal(false); setEditTemplate(null); reset(); }}><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit(d => saveMutation.mutate(d))} className="p-6 space-y-4">
              <div>
                <label className="form-label">Template Name *</label>
                <input {...register('name', { required: true })} className="form-input" placeholder="e.g. Welcome Email" />
              </div>
              {activeTab === 'EMAIL' && (
                <div>
                  <label className="form-label">Email Subject</label>
                  <input {...register('subject')} className="form-input" placeholder="Email subject line" />
                </div>
              )}
              <div>
                <label className="form-label">Body *</label>
                <textarea {...register('body', { required: true })} className="form-input resize-none" rows={8}
                  placeholder={`Hi {{customerName}},\n\nThank you for your interest in {{projectName}}...\n\nRegards,\n{{executiveName}}`} />
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => { setShowModal(false); reset(); }} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={saveMutation.isPending} className="btn-primary">
                  {saveMutation.isPending ? 'Saving...' : editTemplate ? 'Update Template' : 'Create Template'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
