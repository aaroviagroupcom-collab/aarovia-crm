'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { leadsApi, quotationsApi, callsApi, communicationsApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { format, formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import {
  Phone, Mail, MessageSquare, ArrowLeft, Clock, CheckCircle,
  Plus, Upload, FileText, X, Send, AlertCircle, Building2,
} from 'lucide-react';

const STATUS_OPTIONS = [
  'NEW','FOLLOWUP','RNR','CALL_BACK','INTERESTED','QUALIFIED',
  'SITE_VISIT_FIXED','SITE_VISIT_DONE','OPPORTUNITY','OPPORTUNITY_FOLLOW',
  'OPPORTUNITY_INTERESTED','OPPORTUNITY_NOT_INTERESTED','OPPORTUNITY_CLOSED','BOOKED',
];

const STATUS_COLORS: Record<string, string> = {
  NEW: 'bg-blue-100 text-blue-800', FOLLOWUP: 'bg-yellow-100 text-yellow-800',
  RNR: 'bg-gray-100 text-gray-700', CALL_BACK: 'bg-orange-100 text-orange-800',
  INTERESTED: 'bg-cyan-100 text-cyan-800', QUALIFIED: 'bg-indigo-100 text-indigo-800',
  SITE_VISIT_FIXED: 'bg-purple-100 text-purple-800', SITE_VISIT_DONE: 'bg-violet-100 text-violet-800',
  OPPORTUNITY: 'bg-teal-100 text-teal-800', BOOKED: 'bg-emerald-100 text-emerald-800',
};

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const { user } = useAuthStore();

  const [activeTab, setActiveTab] = useState<'timeline'|'communications'|'calls'|'quotations'|'documents'>('timeline');
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [statusNote, setStatusNote] = useState('');
  const [emailForm, setEmailForm] = useState({ subject: '', body: '', templateId: '' });
  const [waForm, setWaForm] = useState({ message: '' });
  const [reminderForm, setReminderForm] = useState({ message: '', reminderAt: '' });

  const { data: lead, isLoading } = useQuery({
    queryKey: ['lead', id],
    queryFn: () => leadsApi.getById(id).then(r => r.data.lead),
  });

  const { data: timeline } = useQuery({
    queryKey: ['lead-timeline', id],
    queryFn: () => leadsApi.getTimeline(id).then(r => r.data.timeline),
  });

  const { data: quotations } = useQuery({
    queryKey: ['lead-quotations', id],
    queryFn: () => quotationsApi.getAll({ leadId: id }).then(r => r.data),
    enabled: activeTab === 'quotations',
  });

  const updateStatus = useMutation({
    mutationFn: () => leadsApi.updateStatus(id, { status: newStatus, note: statusNote }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lead', id] });
      qc.invalidateQueries({ queryKey: ['lead-timeline', id] });
      toast.success('Status updated'); setShowStatusModal(false); setStatusNote('');
    },
  });

  const sendEmail = useMutation({
    mutationFn: () => communicationsApi.sendEmail({ leadId: id, ...emailForm }),
    onSuccess: () => { toast.success('Email sent'); setShowEmailModal(false); },
    onError: () => toast.error('Failed to send email'),
  });

  const sendWhatsApp = useMutation({
    mutationFn: () => communicationsApi.sendWhatsApp({ leadId: id, message: waForm.message }),
    onSuccess: () => { toast.success('WhatsApp sent'); setShowWhatsAppModal(false); },
    onError: () => toast.error('Failed to send WhatsApp'),
  });

  const initiateCall = useMutation({
    mutationFn: () => callsApi.initiate({ leadId: id, to: lead?.mobile }),
    onSuccess: () => toast.success('Call initiated'),
    onError: () => toast.error('Failed to initiate call'),
  });

  const createReminder = useMutation({
    mutationFn: () => leadsApi.createReminder(id, reminderForm),
    onSuccess: () => { toast.success('Reminder set'); setShowReminderModal(false); },
  });

  if (isLoading) return (
    <DashboardLayout>
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/3" />
        <div className="h-48 bg-gray-200 rounded-2xl" />
      </div>
    </DashboardLayout>
  );

  if (!lead) return (
    <DashboardLayout>
      <div className="text-center py-20 text-gray-400">Lead not found</div>
    </DashboardLayout>
  );

  return (
    <DashboardLayout>
      <div className="space-y-4">
        {/* Back + Header */}
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900">{lead.customerName}</h1>
            <p className="text-sm text-gray-500">{lead.leadId} · Added {formatDistanceToNow(new Date(lead.createdAt), { addSuffix: true })}</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${STATUS_COLORS[lead.status] || 'bg-gray-100'}`}>
            {lead.status?.replace(/_/g, ' ')}
          </span>
          <button onClick={() => { setNewStatus(lead.status); setShowStatusModal(true); }}
            className="btn-primary text-sm">Change Status</button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left: Lead Info */}
          <div className="space-y-4">
            {/* Contact Card */}
            <div className="section-card p-5">
              <h2 className="font-semibold text-gray-900 mb-4">Contact Details</h2>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium">{lead.mobile}</p>
                    {lead.alternateMobile && <p className="text-xs text-gray-500">{lead.alternateMobile}</p>}
                  </div>
                </div>
                {lead.email && (
                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <p className="text-sm">{lead.email}</p>
                  </div>
                )}
                {(lead.city || lead.state) && (
                  <div className="flex items-center gap-3">
                    <Building2 className="w-4 h-4 text-gray-400" />
                    <p className="text-sm">{[lead.city, lead.state].filter(Boolean).join(', ')}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Interest Card */}
            <div className="section-card p-5">
              <h2 className="font-semibold text-gray-900 mb-4">Interest Details</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Source</span><span className="font-medium">{lead.source?.replace(/_/g, ' ')}</span></div>
                {lead.projectInterested && <div className="flex justify-between"><span className="text-gray-500">Project</span><span className="font-medium">{lead.projectInterested.name}</span></div>}
                {lead.budget && <div className="flex justify-between"><span className="text-gray-500">Budget</span><span className="font-medium">₹{Number(lead.budget).toLocaleString('en-IN')}</span></div>}
                {lead.configuration && <div className="flex justify-between"><span className="text-gray-500">Config</span><span className="font-medium">{lead.configuration}</span></div>}
                <div className="flex justify-between"><span className="text-gray-500">Assigned</span><span className="font-medium">{lead.assignedTo?.name || '—'}</span></div>
                {lead.followupDate && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Follow Up</span>
                    <span className="font-medium text-orange-600">{format(new Date(lead.followupDate), 'dd MMM, HH:mm')}</span>
                  </div>
                )}
              </div>
              {lead.notes && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-xs text-gray-500 mb-1">Notes</p>
                  <p className="text-sm text-gray-700">{lead.notes}</p>
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="section-card p-5">
              <h2 className="font-semibold text-gray-900 mb-3">Quick Actions</h2>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => initiateCall.mutate()}
                  className="flex items-center justify-center gap-2 p-3 bg-green-50 hover:bg-green-100 text-green-700 rounded-xl text-sm font-medium transition-colors">
                  <Phone className="w-4 h-4" /> Call
                </button>
                <button onClick={() => setShowWhatsAppModal(true)}
                  className="flex items-center justify-center gap-2 p-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-sm font-medium transition-colors">
                  <MessageSquare className="w-4 h-4" /> WhatsApp
                </button>
                <button onClick={() => setShowEmailModal(true)}
                  className="flex items-center justify-center gap-2 p-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-sm font-medium transition-colors">
                  <Mail className="w-4 h-4" /> Email
                </button>
                <button onClick={() => setShowReminderModal(true)}
                  className="flex items-center justify-center gap-2 p-3 bg-orange-50 hover:bg-orange-100 text-orange-700 rounded-xl text-sm font-medium transition-colors">
                  <Clock className="w-4 h-4" /> Reminder
                </button>
              </div>
            </div>
          </div>

          {/* Right: Tabs */}
          <div className="lg:col-span-2 space-y-4">
            {/* Tabs */}
            <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
              {(['timeline','communications','calls','quotations','documents'] as const).map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-2 px-3 text-sm font-medium rounded-lg capitalize transition-colors ${activeTab === tab ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
                  {tab}
                </button>
              ))}
            </div>

            {/* Timeline Tab */}
            {activeTab === 'timeline' && (
              <div className="section-card p-5">
                <h2 className="font-semibold mb-4">Activity Timeline</h2>
                <div className="space-y-4">
                  {(!timeline || timeline.length === 0) ? (
                    <p className="text-gray-400 text-sm text-center py-8">No activity yet</p>
                  ) : timeline.map((item: any) => (
                    <div key={item.id} className="flex gap-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
                        <CheckCircle className="w-4 h-4 text-blue-500" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{item.action}</p>
                        {item.note && <p className="text-sm text-gray-500 mt-0.5">{item.note}</p>}
                        <p className="text-xs text-gray-400 mt-1">
                          {item.createdBy?.name} · {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Communications Tab */}
            {activeTab === 'communications' && (
              <div className="section-card p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold">Communication History</h2>
                  <div className="flex gap-2">
                    <button onClick={() => setShowEmailModal(true)} className="btn-secondary text-xs flex items-center gap-1">
                      <Mail className="w-3 h-3" /> Email
                    </button>
                    <button onClick={() => setShowWhatsAppModal(true)} className="btn-secondary text-xs flex items-center gap-1">
                      <MessageSquare className="w-3 h-3" /> WhatsApp
                    </button>
                  </div>
                </div>
                <div className="space-y-3">
                  {(!lead.communications || lead.communications.length === 0) ? (
                    <p className="text-gray-400 text-sm text-center py-8">No communications yet</p>
                  ) : lead.communications.map((c: any) => (
                    <div key={c.id} className="p-3 border border-gray-100 rounded-xl">
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.type === 'EMAIL' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                          {c.type}
                        </span>
                        <span className="text-xs text-gray-400">{formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}</span>
                      </div>
                      {c.subject && <p className="text-sm font-medium">{c.subject}</p>}
                      <p className="text-sm text-gray-600 mt-0.5 line-clamp-2">{c.body || c.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Calls Tab */}
            {activeTab === 'calls' && (
              <div className="section-card p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold">Call Logs</h2>
                  <button onClick={() => initiateCall.mutate()} className="btn-primary text-xs flex items-center gap-1">
                    <Phone className="w-3 h-3" /> Call Now
                  </button>
                </div>
                <div className="space-y-3">
                  {(!lead.callLogs || lead.callLogs.length === 0) ? (
                    <p className="text-gray-400 text-sm text-center py-8">No calls yet</p>
                  ) : lead.callLogs.map((c: any) => (
                    <div key={c.id} className="p-3 border border-gray-100 rounded-xl flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center flex-shrink-0">
                        <Phone className="w-4 h-4 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between">
                          <span className={`text-xs font-medium ${c.status === 'completed' ? 'text-green-600' : 'text-red-500'}`}>
                            {c.status}
                          </span>
                          <span className="text-xs text-gray-400">{formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}</span>
                        </div>
                        {c.duration && <p className="text-xs text-gray-500 mt-0.5">Duration: {c.duration}s</p>}
                        {c.notes && <p className="text-sm text-gray-600 mt-1">{c.notes}</p>}
                        {c.recordingUrl && (
                          <audio controls src={c.recordingUrl} className="mt-2 w-full h-8" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quotations Tab */}
            {activeTab === 'quotations' && (
              <div className="section-card p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold">Quotations</h2>
                  <button onClick={() => router.push(`/quotations/create?leadId=${id}`)} className="btn-primary text-xs flex items-center gap-1">
                    <Plus className="w-3 h-3" /> New Quotation
                  </button>
                </div>
                <div className="space-y-3">
                  {(!quotations?.quotations || quotations.quotations.length === 0) ? (
                    <p className="text-gray-400 text-sm text-center py-8">No quotations yet</p>
                  ) : quotations.quotations.map((q: any) => (
                    <div key={q.id} className="p-4 border border-gray-100 rounded-xl hover:border-yellow-200 cursor-pointer transition-colors"
                      onClick={() => router.push(`/quotations/${q.id}`)}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">{q.quotationNo}</p>
                          <p className="text-xs text-gray-500">{q.inventory?.unitNumber} · {q.type}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-sm">₹{Number(q.finalCost).toLocaleString('en-IN')}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${q.status === 'APPROVED' ? 'bg-green-100 text-green-700' : q.status === 'REJECTED' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                            {q.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Documents Tab */}
            {activeTab === 'documents' && (
              <div className="section-card p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold">Documents</h2>
                </div>
                <div className="space-y-3">
                  {(!lead.documents || lead.documents.length === 0) ? (
                    <div className="text-center py-8">
                      <FileText className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                      <p className="text-gray-400 text-sm">No documents uploaded</p>
                    </div>
                  ) : lead.documents.map((d: any) => (
                    <div key={d.id} className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl">
                      <FileText className="w-5 h-5 text-blue-500" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{d.name}</p>
                        <p className="text-xs text-gray-400">{d.type} · {formatDistanceToNow(new Date(d.createdAt), { addSuffix: true })}</p>
                      </div>
                      <a href={d.url} target="_blank" rel="noreferrer" className="text-blue-600 text-xs hover:underline">View</a>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Status Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="font-bold">Update Status</h2>
              <button onClick={() => setShowStatusModal(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="form-label">New Status</label>
                <select value={newStatus} onChange={e => setNewStatus(e.target.value)} className="form-input">
                  {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Note (optional)</label>
                <textarea value={statusNote} onChange={e => setStatusNote(e.target.value)}
                  className="form-input resize-none" rows={3} placeholder="Add a note about this update..." />
              </div>
              <div className="flex justify-end gap-3">
                <button onClick={() => setShowStatusModal(false)} className="btn-secondary">Cancel</button>
                <button onClick={() => updateStatus.mutate()} disabled={updateStatus.isPending} className="btn-primary">
                  {updateStatus.isPending ? 'Updating...' : 'Update Status'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Email Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="font-bold">Send Email</h2>
              <button onClick={() => setShowEmailModal(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="form-label">To</label>
                <input value={lead.email || ''} disabled className="form-input bg-gray-50" />
              </div>
              <div>
                <label className="form-label">Subject</label>
                <input value={emailForm.subject} onChange={e => setEmailForm(f => ({ ...f, subject: e.target.value }))}
                  className="form-input" placeholder="Email subject" />
              </div>
              <div>
                <label className="form-label">Message</label>
                <textarea value={emailForm.body} onChange={e => setEmailForm(f => ({ ...f, body: e.target.value }))}
                  className="form-input resize-none" rows={6} placeholder="Email body..." />
              </div>
              <div className="flex justify-end gap-3">
                <button onClick={() => setShowEmailModal(false)} className="btn-secondary">Cancel</button>
                <button onClick={() => sendEmail.mutate()} disabled={sendEmail.isPending || !lead.email} className="btn-primary flex items-center gap-2">
                  <Send className="w-4 h-4" /> {sendEmail.isPending ? 'Sending...' : 'Send Email'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp Modal */}
      {showWhatsAppModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="font-bold">Send WhatsApp</h2>
              <button onClick={() => setShowWhatsAppModal(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="form-label">To</label>
                <input value={lead.mobile} disabled className="form-input bg-gray-50" />
              </div>
              <div>
                <label className="form-label">Message</label>
                <textarea value={waForm.message} onChange={e => setWaForm({ message: e.target.value })}
                  className="form-input resize-none" rows={5} placeholder="Type your WhatsApp message..." />
              </div>
              <div className="flex justify-end gap-3">
                <button onClick={() => setShowWhatsAppModal(false)} className="btn-secondary">Cancel</button>
                <button onClick={() => sendWhatsApp.mutate()} disabled={sendWhatsApp.isPending} className="btn-primary flex items-center gap-2">
                  <Send className="w-4 h-4" /> {sendWhatsApp.isPending ? 'Sending...' : 'Send'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reminder Modal */}
      {showReminderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="font-bold">Set Reminder</h2>
              <button onClick={() => setShowReminderModal(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="form-label">Reminder Date & Time</label>
                <input type="datetime-local" value={reminderForm.reminderAt}
                  onChange={e => setReminderForm(f => ({ ...f, reminderAt: e.target.value }))}
                  className="form-input" />
              </div>
              <div>
                <label className="form-label">Note</label>
                <textarea value={reminderForm.message} onChange={e => setReminderForm(f => ({ ...f, message: e.target.value }))}
                  className="form-input resize-none" rows={3} placeholder="Reminder note..." />
              </div>
              <div className="flex justify-end gap-3">
                <button onClick={() => setShowReminderModal(false)} className="btn-secondary">Cancel</button>
                <button onClick={() => createReminder.mutate()} disabled={createReminder.isPending} className="btn-primary">
                  {createReminder.isPending ? 'Setting...' : 'Set Reminder'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
