/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Calendar as CalendarIcon,
  Clock,
  Download,
  FilePlus2,
  RefreshCw,
  Search,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import { useToast } from './Toast';
import { ExportModal, ExportOptions, exportData } from './ExportModal';
import { getClients } from '../services/clientService';
import { getStaffMembers } from '../services/taskService';
import {
  ComplianceCategory,
  ComplianceLifecycleStatus,
  ComplianceTaskRow,
  createComplianceTask,
  listComplianceTasks,
  syncComplianceDueNotifications,
  updateComplianceStatus,
} from '../services/complianceProductionService';

const CATEGORIES: Array<'All' | ComplianceCategory> = ['All', 'GST', 'Income Tax', 'ROC', 'Audit', 'Custom'];
const STATUS_OPTIONS: ComplianceLifecycleStatus[] = [
  'Pending',
  'In Progress',
  'Awaiting Documents',
  'Under Review',
  'Approved',
  'Filed',
  'Late',
  'Escalated',
  'Closed',
];

type ClientOption = { id: string; name: string };
type StaffOption = { id: string; name: string; email: string; role: string };

type NewComplianceForm = {
  clientId: string;
  name: string;
  category: ComplianceCategory;
  period: string;
  dueDate: string;
  assignedTo: string;
};

const defaultForm: NewComplianceForm = {
  clientId: '',
  name: '',
  category: 'GST',
  period: '',
  dueDate: '',
  assignedTo: '',
};

const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('en-IN', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

const statusTone: Record<ComplianceLifecycleStatus, string> = {
  Pending: 'text-slate-300 border-slate-700 bg-slate-800/40',
  'In Progress': 'text-sky-300 border-sky-500/25 bg-sky-500/10',
  'Awaiting Documents': 'text-amber-300 border-amber-500/25 bg-amber-500/10',
  'Under Review': 'text-blue-300 border-blue-500/25 bg-blue-500/10',
  Approved: 'text-emerald-300 border-emerald-500/25 bg-emerald-500/10',
  Filed: 'text-emerald-300 border-emerald-500/25 bg-emerald-500/10',
  Late: 'text-red-300 border-red-500/25 bg-red-500/10',
  Escalated: 'text-orange-300 border-orange-500/25 bg-orange-500/10',
  Closed: 'text-slate-400 border-slate-700 bg-slate-900/60',
};

const getDaysUntilDue = (dueDate: string) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  return Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
};

const ComplianceTracker: React.FC = () => {
  const { user } = useAuth();
  const toast = useToast();
  const [items, setItems] = useState<ComplianceTaskRow[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<'All' | ComplianceCategory>('All');
  const [showCreate, setShowCreate] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [form, setForm] = useState<NewComplianceForm>(defaultForm);

  const loadData = useCallback(async () => {
    if (!user?.firmId) return;
    setLoading(true);
    setError(null);
    try {
      const [complianceRows, clientRows, staffRows] = await Promise.all([
        listComplianceTasks(user.firmId),
        getClients(user.firmId),
        getStaffMembers(user.firmId),
      ]);
      setItems(complianceRows);
      setClients(clientRows);
      setStaff(staffRows);
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : 'Unable to load compliance records.';
      setError(message);
      toast.error('Compliance Load Failed', message);
    } finally {
      setLoading(false);
    }
  }, [toast, user?.firmId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase();
    return items.filter((item) => {
      const matchesCategory = activeCategory === 'All' || item.category === activeCategory;
      const haystack = `${item.name} ${item.client_name || ''} ${item.period || ''} ${item.filing_status}`.toLowerCase();
      return matchesCategory && (!term || haystack.includes(term));
    });
  }, [activeCategory, items, search]);

  const metrics = useMemo(() => {
    const open = items.filter((item) => !['Filed', 'Closed'].includes(item.filing_status));
    const late = items.filter((item) => item.filing_status === 'Late' || (getDaysUntilDue(item.due_date) < 0 && !['Filed', 'Closed'].includes(item.filing_status)));
    const filed = items.filter((item) => item.filing_status === 'Filed' || item.filing_status === 'Closed');
    const dueSeven = open.filter((item) => {
      const days = getDaysUntilDue(item.due_date);
      return days >= 0 && days <= 7;
    });
    return {
      total: items.length,
      open: open.length,
      late: late.length,
      dueSeven: dueSeven.length,
      completionRate: items.length ? Math.round((filed.length / items.length) * 100) : 0,
      penalty: late.reduce((sum, item) => sum + Number(item.penalty_amount || 0), 0),
    };
  }, [items]);

  const handleCreate = async () => {
    if (!user) return;
    setSaving(true);
    setError(null);
    try {
      await createComplianceTask({
        clientId: form.clientId,
        name: form.name,
        category: form.category,
        period: form.period,
        dueDate: form.dueDate,
        assignedTo: form.assignedTo || undefined,
      }, user);
      setForm(defaultForm);
      setShowCreate(false);
      toast.success('Compliance Created', 'The compliance obligation is now tracked.');
      await loadData();
    } catch (createError) {
      const message = createError instanceof Error ? createError.message : 'Unable to create compliance record.';
      setError(message);
      toast.error('Create Failed', message);
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (item: ComplianceTaskRow, status: ComplianceLifecycleStatus) => {
    if (!user) return;
    const previous = items;
    setItems((current) => current.map((row) => row.id === item.id ? { ...row, filing_status: status } : row));
    try {
      await updateComplianceStatus(item.id, status, user);
      toast.success('Compliance Updated', `${item.name} moved to ${status}.`);
      await loadData();
    } catch (statusError) {
      setItems(previous);
      const message = statusError instanceof Error ? statusError.message : 'Unable to update compliance status.';
      toast.error('Update Failed', message);
    }
  };

  const handleSyncDueNotifications = async () => {
    if (!user?.firmId) return;
    setSyncing(true);
    try {
      const count = await syncComplianceDueNotifications(user.firmId, user);
      toast.success('Notification Sync Complete', `${count} compliance notification${count === 1 ? '' : 's'} created.`);
    } catch (syncError) {
      toast.error('Notification Sync Failed', syncError instanceof Error ? syncError.message : 'Unable to sync compliance notifications.');
    } finally {
      setSyncing(false);
    }
  };

  const handleExport = (options: ExportOptions) => {
    const records = filteredItems.map((item) => ({
      client: item.client_name || item.client_id,
      compliance: item.name,
      category: item.category,
      period: item.period || '',
      dueDate: item.due_date,
      status: item.filing_status,
      assignedTo: item.assigned_to_name || '',
      penalty: item.penalty_amount,
    }));
    exportData(records, options, [
      { key: 'client', label: 'Client' },
      { key: 'compliance', label: 'Compliance' },
      { key: 'category', label: 'Category' },
      { key: 'period', label: 'Period' },
      { key: 'dueDate', label: 'Due Date' },
      { key: 'status', label: 'Status' },
      { key: 'assignedTo', label: 'Assigned To' },
      { key: 'penalty', label: 'Penalty' },
    ], 'Compliance Report');
  };

  return (
    <div className="h-full overflow-y-auto bg-matte-black p-6 text-slate-300">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold gold-text-gradient">Compliance Tracker</h2>
          <p className="text-sm text-slate-500">Persisted compliance obligations, lifecycle status, due dates, and escalation signals.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-2 border border-slate-800 px-3 py-2 text-xs font-bold text-slate-300 hover:border-gold/40 disabled:opacity-50"
          >
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
            Refresh
          </button>
          <button
            onClick={handleSyncDueNotifications}
            disabled={syncing || items.length === 0}
            className="flex items-center gap-2 border border-slate-800 px-3 py-2 text-xs font-bold text-gold hover:border-gold/40 disabled:opacity-50"
          >
            <Clock className="h-4 w-4" />
            {syncing ? 'Syncing...' : 'Sync Due Alerts'}
          </button>
          <button
            onClick={() => setShowExportModal(true)}
            disabled={filteredItems.length === 0}
            className="flex items-center gap-2 border border-slate-800 px-3 py-2 text-xs font-bold text-slate-300 hover:border-gold/40 disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            Export
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 bg-gold px-3 py-2 text-xs font-bold text-matte-black hover:bg-gold-light"
          >
            <FilePlus2 className="h-4 w-4" />
            New Compliance
          </button>
        </div>
      </div>

      <div className="mb-5 grid gap-3 md:grid-cols-5">
        <Metric label="Total" value={metrics.total} />
        <Metric label="Open" value={metrics.open} tone="text-sky-300" />
        <Metric label="Due 7 Days" value={metrics.dueSeven} tone="text-amber-300" />
        <Metric label="Overdue" value={metrics.late} tone="text-red-300" />
        <Metric label="Completion" value={`${metrics.completionRate}%`} tone="text-emerald-300" />
      </div>

      <div className="mb-5 flex flex-col gap-3 md:flex-row">
        <div className="flex gap-2 overflow-x-auto">
          {CATEGORIES.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={cn(
                'whitespace-nowrap px-3 py-2 text-xs font-bold uppercase',
                activeCategory === category ? 'bg-gold text-matte-black' : 'border border-slate-800 text-slate-400 hover:text-white',
              )}
            >
              {category}
            </button>
          ))}
        </div>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search client, compliance, period, status..."
            className="w-full border border-slate-800 bg-matte-black-light py-2 pl-10 pr-3 text-sm text-white outline-none focus:border-gold/40"
          />
        </div>
      </div>

      {error && (
        <div className="mb-5 flex items-start gap-3 border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="border border-slate-800 bg-matte-black-light p-12 text-center text-slate-500">
          Loading persisted compliance records...
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="border border-dashed border-slate-800 bg-matte-black-light p-12 text-center">
          <CalendarIcon className="mx-auto mb-3 h-9 w-9 text-slate-600" />
          <p className="font-bold text-white">No compliance records found</p>
          <p className="mt-1 text-sm text-slate-500">
            {items.length === 0 ? 'Create the first real compliance obligation for this firm.' : 'No records match the current filters.'}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden border border-slate-800 bg-matte-black-light">
          <table className="w-full text-left">
            <thead className="bg-matte-black">
              <tr>
                <th className="px-4 py-3 text-[10px] font-bold uppercase text-slate-500">Client & Compliance</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase text-slate-500">Category</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase text-slate-500">Due Date</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase text-slate-500">Owner</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase text-slate-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredItems.map((item) => {
                const dueDays = getDaysUntilDue(item.due_date);
                const isOpen = !['Filed', 'Closed'].includes(item.filing_status);
                return (
                  <tr key={item.id} className="hover:bg-slate-900/40">
                    <td className="px-4 py-3">
                      <p className="text-sm font-bold text-white">{item.name}</p>
                      <p className="text-xs text-slate-500">{item.client_name || item.client_id} {item.period ? `| ${item.period}` : ''}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="border border-slate-700 bg-slate-900 px-2 py-1 text-[10px] font-bold uppercase text-slate-300">{item.category}</span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-white">{formatDate(item.due_date)}</p>
                      {isOpen && (
                        <p className={cn('text-[11px]', dueDays < 0 ? 'text-red-300' : dueDays <= 7 ? 'text-amber-300' : 'text-slate-500')}>
                          {dueDays < 0 ? `${Math.abs(dueDays)} days overdue` : `${dueDays} days left`}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-400">{item.assigned_to_name || 'Unassigned'}</td>
                    <td className="px-4 py-3">
                      <select
                        value={item.filing_status}
                        onChange={(event) => handleStatusChange(item, event.target.value as ComplianceLifecycleStatus)}
                        className={cn('border px-2 py-1 text-xs font-bold uppercase outline-none', statusTone[item.filing_status])}
                      >
                        {STATUS_OPTIONS.map((status) => <option key={status} value={status}>{status}</option>)}
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setShowCreate(false)}>
          <div className="w-full max-w-2xl border border-slate-800 bg-matte-black-light p-6" onClick={(event) => event.stopPropagation()}>
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-white">Create Compliance Obligation</h3>
                <p className="text-sm text-slate-500">Persist a real due date and owner for this firm.</p>
              </div>
              <button onClick={() => setShowCreate(false)} className="text-sm text-slate-500 hover:text-white">Close</button>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Client">
                <select value={form.clientId} onChange={(event) => setForm({ ...form, clientId: event.target.value })} className="w-full border border-slate-700 bg-matte-black p-3 text-sm text-white outline-none focus:border-gold/40">
                  <option value="">Select client</option>
                  {clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
                </select>
              </Field>
              <Field label="Category">
                <select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value as ComplianceCategory })} className="w-full border border-slate-700 bg-matte-black p-3 text-sm text-white outline-none focus:border-gold/40">
                  {CATEGORIES.filter((item) => item !== 'All').map((category) => <option key={category} value={category}>{category}</option>)}
                </select>
              </Field>
              <Field label="Compliance Name">
                <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="w-full border border-slate-700 bg-matte-black p-3 text-sm text-white outline-none focus:border-gold/40" placeholder="GSTR-3B filing" />
              </Field>
              <Field label="Period">
                <input value={form.period} onChange={(event) => setForm({ ...form, period: event.target.value })} className="w-full border border-slate-700 bg-matte-black p-3 text-sm text-white outline-none focus:border-gold/40" placeholder="Apr 2026" />
              </Field>
              <Field label="Due Date">
                <input type="date" value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} className="w-full border border-slate-700 bg-matte-black p-3 text-sm text-white outline-none focus:border-gold/40" />
              </Field>
              <Field label="Assigned To">
                <select value={form.assignedTo} onChange={(event) => setForm({ ...form, assignedTo: event.target.value })} className="w-full border border-slate-700 bg-matte-black p-3 text-sm text-white outline-none focus:border-gold/40">
                  <option value="">Unassigned</option>
                  {staff.map((member) => <option key={member.id} value={member.id}>{member.name} ({member.role})</option>)}
                </select>
              </Field>
            </div>
            <div className="mt-6 flex gap-3">
              <button onClick={() => setShowCreate(false)} className="flex-1 bg-slate-800 p-3 text-sm font-bold text-slate-300">Cancel</button>
              <button onClick={handleCreate} disabled={saving || !form.clientId || !form.name.trim() || !form.dueDate} className="flex-1 bg-gold p-3 text-sm font-bold text-matte-black disabled:opacity-50">
                {saving ? 'Saving...' : 'Create Compliance'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        title="Compliance Report"
        onExport={handleExport}
        recordCount={filteredItems.length}
      />
    </div>
  );
};

const Metric: React.FC<{ label: string; value: string | number; tone?: string }> = ({ label, value, tone = 'text-white' }) => (
  <div className="border border-slate-800 bg-matte-black-light p-4">
    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">{label}</p>
    <p className={cn('mt-2 text-2xl font-bold', tone)}>{value}</p>
  </div>
);

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <label className="block">
    <span className="mb-2 block text-xs font-bold uppercase text-slate-500">{label}</span>
    {children}
  </label>
);

export default ComplianceTracker;
