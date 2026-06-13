/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Bell,
  Search,
  Plus,
  Clock,
  AlertCircle,
  CheckCircle2,
  User,
  FileText,
  X,
  ChevronDown
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import { Modal } from './Modal';
import { useUnsavedChangesGuard } from '../hooks/useUnsavedChangesGuard';
import {
  getNotices,
  getNoticeStats,
  getStaffMembers,
  createNotice,
  assignNotice,
  updateNoticeStatus,
  getNoticeWorkflowSignals,
  NoticeWorkflowSignal,
  NoticeRow,
  NoticeSource,
  NoticeStatus
} from '../services/noticeService';
import { getClients } from '../services/clientService';

export const NoticeCenter: React.FC = () => {
  const { user } = useAuth();
  const [notices, setNotices] = useState<(NoticeRow & { clients?: { name: string } })[]>([]);
  const [stats, setStats] = useState({ new: 0, drafting: 0, upcoming: 0, closed: 0 });
  const [workflowSignals, setWorkflowSignals] = useState<Record<string, NoticeWorkflowSignal>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [staff, setStaff] = useState<{ id: string; name: string }[]>([]);
  const [formData, setFormData] = useState({
    clientId: '',
    source: 'Income Tax' as NoticeSource,
    noticeNumber: '',
    description: '',
    receivedDate: new Date().toISOString().split('T')[0],
    deadline: '',
    assignedTo: ''
  });
  const [saving, setSaving] = useState(false);
  const defaultNoticeForm = {
    clientId: '',
    source: 'Income Tax' as NoticeSource,
    noticeNumber: '',
    description: '',
    receivedDate: new Date().toISOString().split('T')[0],
    deadline: '',
    assignedTo: ''
  };
  const hasUnsavedNoticeChanges = JSON.stringify(formData) !== JSON.stringify(defaultNoticeForm);
  const guardNoticeModalClose = useUnsavedChangesGuard(hasUnsavedNoticeChanges);

  const loadNotices = useCallback(async () => {
    if (!user?.firmId) return;
    setLoading(true);
    try {
      const [noticesData, statsData, signals] = await Promise.all([
        getNotices(user.firmId),
        getNoticeStats(user.firmId),
        getNoticeWorkflowSignals(user.firmId),
      ]);
      setNotices(noticesData);
      setStats(statsData);
      setWorkflowSignals(Object.fromEntries(signals.map((signal) => [signal.noticeId, signal])));
    } catch (error) {
      console.error('Failed to load notices:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.firmId]);

  useEffect(() => {
    loadNotices();
  }, [loadNotices]);

  useEffect(() => {
    if (user?.firmId) {
      getClients(user.firmId).then(c => setClients(c.map(cl => ({ id: cl.id, name: cl.name }))));
      getStaffMembers(user.firmId).then(s => setStaff(s.map(st => ({ id: st.id, name: st.name }))));
    }
  }, [user?.firmId]);

  const handleCreateNotice = async () => {
    if (!user || !formData.clientId) return;
    setSaving(true);
    try {
      await createNotice({
        firmId: user.firmId!,
        clientId: formData.clientId,
        source: formData.source,
        noticeNumber: formData.noticeNumber || undefined,
        description: formData.description || undefined,
        receivedDate: formData.receivedDate,
        deadline: formData.deadline || undefined,
        assignedTo: formData.assignedTo || undefined,
        user
      });
      setShowAddModal(false);
      setFormData(defaultNoticeForm);
      loadNotices();
    } catch (error) {
      console.error('Failed to create notice:', error);
    } finally {
      setSaving(false);
    }
  };

  const filteredNotices = notices.filter(n => {
    const clientName = n.clients?.name || '';
    return clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (n.notice_number || '').toLowerCase().includes(searchTerm.toLowerCase());
  });

  const getStatusColor = (status: NoticeStatus) => {
    switch (status) {
      case 'Received': return 'bg-blue-500';
      case 'Assigned':
      case 'Drafting':
      case 'Drafted': return 'bg-amber-500';
      case 'Under_Review': return 'bg-purple-500';
      case 'Filed': return 'bg-emerald-500';
      case 'Closed': return 'bg-slate-500';
      default: return 'bg-slate-500';
    }
  };

  const getStatusTextColor = (status: NoticeStatus) => {
    switch (status) {
      case 'Filed': return 'text-emerald-500';
      case 'Received': return 'text-blue-500';
      case 'Closed': return 'text-slate-500';
      default: return 'text-amber-500';
    }
  };

  return (
    <div className="p-8 space-y-6 h-full bg-matte-black overflow-y-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gold">Notice Center</h2>
          <p className="text-slate-500">Track and manage legal notices from IT, GST, and MCA portals.</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm font-medium hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/20"
        >
          <Plus className="w-4 h-4" />
          Log New Notice
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="p-6 bg-matte-black-light rounded-2xl border border-slate-800">
          <p className="text-sm font-medium text-slate-500 mb-2">New Notices</p>
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-bold text-white">{stats.new}</h3>
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Bell className="w-4 h-4 text-blue-500" />
            </div>
          </div>
        </div>
        <div className="p-6 bg-matte-black-light rounded-2xl border border-slate-800">
          <p className="text-sm font-medium text-slate-500 mb-2">Drafting Stage</p>
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-bold text-white">{stats.drafting}</h3>
            <div className="p-2 bg-amber-500/10 rounded-lg">
              <FileText className="w-4 h-4 text-amber-500" />
            </div>
          </div>
        </div>
        <div className="p-6 bg-matte-black-light rounded-2xl border border-slate-800">
          <p className="text-sm font-medium text-slate-500 mb-2">Upcoming Deadlines</p>
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-bold text-white">{stats.upcoming}</h3>
            <div className="p-2 bg-red-500/10 rounded-lg">
              <Clock className="w-4 h-4 text-red-500" />
            </div>
          </div>
        </div>
        <div className="p-6 bg-matte-black-light rounded-2xl border border-slate-800">
          <p className="text-sm font-medium text-slate-500 mb-2">Closed This Month</p>
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-bold text-white">{stats.closed}</h3>
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by notice number or client..."
            className="w-full pl-10 pr-4 py-2.5 bg-matte-black-light border border-slate-800 rounded-xl text-sm text-slate-300 placeholder-slate-500 focus:ring-1 focus:ring-gold focus:border-gold transition-all"
          />
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!loading && (
        <div className="grid grid-cols-1 gap-4">
          {filteredNotices.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              No notices found. Log a new notice to get started.
            </div>
          ) : (
            filteredNotices.map((notice) => (
              <motion.div
                key={notice.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="p-6 bg-matte-black-light rounded-2xl border border-slate-800 hover:border-gold/30 transition-colors group relative overflow-hidden"
              >
                {(() => {
                  const signal = workflowSignals[notice.id];
                  if (!signal) return null;
                  return (
                    <div className="mb-4 flex flex-wrap items-center gap-2">
                      <span className="px-2 py-0.5 bg-slate-900 border border-slate-700 text-[10px] font-bold text-slate-300 uppercase tracking-wider">
                        Workflow Task: {signal.taskId ? signal.taskId.slice(0, 8) : 'Not Linked'}
                      </span>
                      <span className={`px-2 py-0.5 border text-[10px] font-bold uppercase tracking-wider ${
                        signal.receivableRisk === 'high'
                          ? 'border-red-500/30 text-red-400'
                          : signal.receivableRisk === 'medium'
                            ? 'border-amber-500/30 text-amber-400'
                            : 'border-emerald-500/30 text-emerald-400'
                      }`}>
                        Receivable Risk: {signal.receivableRisk}
                      </span>
                      {signal.invoiceRecommendation && (
                        <span className="px-2 py-0.5 border border-gold/30 text-[10px] font-bold uppercase tracking-wider text-gold">
                          Invoice Recommended
                        </span>
                      )}
                    </div>
                  );
                })()}
                <div className={cn(
                  "absolute left-0 top-0 bottom-0 w-1.5",
                  getStatusColor(notice.status)
                )} />
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex items-start gap-4">
                    <div className={cn(
                      "p-3 rounded-xl",
                      notice.source === 'Income Tax' ? 'bg-blue-500/10 text-blue-500' :
                      notice.source === 'GST' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
                    )}>
                      <FileText className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-lg font-bold text-white">{notice.clients?.name || 'Unknown Client'}</h4>
                        <span className="px-2 py-0.5 bg-slate-800 text-slate-400 rounded text-[10px] font-bold uppercase tracking-wider">
                          {notice.source}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500 font-medium">Notice #: {notice.notice_number || 'N/A'}</p>
                      <div className="flex items-center gap-4 mt-3">
                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Received: {new Date(notice.received_date).toLocaleDateString()}</span>
                        </div>
                        {notice.deadline && (
                          <div className="flex items-center gap-1.5 text-xs text-red-500 font-bold">
                            <AlertCircle className="w-3.5 h-3.5" />
                            <span>Deadline: {new Date(notice.deadline).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col md:items-end gap-4">
                    <div className="flex items-center gap-3">
                      <div className="text-right hidden md:block">
                        <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">Status</p>
                        <p className={cn("text-sm font-bold", getStatusTextColor(notice.status))}>
                          {notice.status.replace('_', ' ')}
                        </p>
                      </div>
                      <div className="w-px h-8 bg-slate-800 hidden md:block" />
                      <div className="flex items-center gap-2 bg-matte-black px-3 py-1.5 rounded-lg border border-slate-800">
                        <User className="w-4 h-4 text-slate-500" />
                        <span className="text-sm text-slate-400 font-medium">{notice.assigned_to || 'Unassigned'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      )}

      {/* Add Notice Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => guardNoticeModalClose(() => setShowAddModal(false))}
        title="Log New Notice"
        size="lg"
        contentClassName="p-6 space-y-4"
      >
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Client</label>
                <select
                  value={formData.clientId}
                  onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                  className="w-full p-3 bg-matte-black border border-slate-800 rounded-xl text-slate-300 focus:ring-1 focus:ring-gold outline-none"
                >
                  <option value="">Select Client</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Source</label>
                <select
                  value={formData.source}
                  onChange={(e) => setFormData({ ...formData, source: e.target.value as NoticeSource })}
                  className="w-full p-3 bg-matte-black border border-slate-800 rounded-xl text-slate-300 focus:ring-1 focus:ring-gold outline-none"
                >
                  <option value="Income Tax">Income Tax</option>
                  <option value="GST">GST</option>
                  <option value="MCA">MCA</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Notice Number</label>
                <input
                  type="text"
                  value={formData.noticeNumber}
                  onChange={(e) => setFormData({ ...formData, noticeNumber: e.target.value })}
                  placeholder="e.g., IT-2024-001"
                  className="w-full p-3 bg-matte-black border border-slate-800 rounded-xl text-slate-300 placeholder-slate-600 focus:ring-1 focus:ring-gold outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Received Date</label>
                  <input
                    type="date"
                    value={formData.receivedDate}
                    onChange={(e) => setFormData({ ...formData, receivedDate: e.target.value })}
                    className="w-full p-3 bg-matte-black border border-slate-800 rounded-xl text-slate-300 focus:ring-1 focus:ring-gold outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Deadline</label>
                  <input
                    type="date"
                    value={formData.deadline}
                    onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                    className="w-full p-3 bg-matte-black border border-slate-800 rounded-xl text-slate-300 focus:ring-1 focus:ring-gold outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Assign To (Optional)</label>
                <select
                  value={formData.assignedTo}
                  onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                  className="w-full p-3 bg-matte-black border border-slate-800 rounded-xl text-slate-300 focus:ring-1 focus:ring-gold outline-none"
                >
                  <option value="">Unassigned</option>
                  {staff.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Add any notes about this notice..."
                  rows={3}
                  className="w-full p-3 bg-matte-black border border-slate-800 rounded-xl text-slate-300 placeholder-slate-600 focus:ring-1 focus:ring-gold outline-none resize-none"
                />
              </div>
            <div className="pt-2 border-t border-slate-800 flex gap-3 sticky bottom-0 bg-matte-black-light">
              <button
                onClick={() => guardNoticeModalClose(() => setShowAddModal(false))}
                className="flex-1 p-3 rounded-xl bg-slate-800 text-slate-300 font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateNotice}
                disabled={saving || !formData.clientId}
                className="flex-1 p-3 rounded-xl bg-gold text-matte-black font-bold disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Create Notice'}
              </button>
            </div>
      </Modal>
    </div>
  );
};
