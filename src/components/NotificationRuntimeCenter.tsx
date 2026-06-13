import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Archive, Bell, CheckCheck, RefreshCw, RadioTower, Search } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from './Toast';
import { cn } from '../lib/utils';
import { NotificationRow } from '../services/notificationService';
import {
  archiveRuntimeNotification,
  generateRuntimeNotificationsFromCurrentState,
  listRuntimeNotifications,
  markAllRuntimeNotificationsRead,
  markRuntimeNotificationRead,
} from '../services/notificationRuntimeService';

const priorityTone: Record<string, string> = {
  LOW: 'text-slate-400 border-slate-700 bg-slate-800/40',
  MEDIUM: 'text-sky-300 border-sky-500/25 bg-sky-500/10',
  HIGH: 'text-amber-300 border-amber-500/25 bg-amber-500/10',
  CRITICAL: 'text-red-300 border-red-500/25 bg-red-500/10',
};

export const NotificationRuntimeCenter: React.FC = () => {
  const { user } = useAuth();
  const toast = useToast();
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const loadNotifications = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      setNotifications(await listRuntimeNotifications(user));
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : 'Unable to load notifications.';
      setError(message);
      toast.error('Notification Load Failed', message);
    } finally {
      setLoading(false);
    }
  }, [toast, user]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return notifications;
    return notifications.filter((item) => `${item.title} ${item.message} ${item.priority} ${item.status}`.toLowerCase().includes(term));
  }, [notifications, search]);

  const unreadCount = notifications.filter((item) => item.status === 'UNREAD').length;
  const criticalCount = notifications.filter((item) => item.priority === 'CRITICAL').length;

  const handleMarkRead = async (notificationId: string) => {
    if (!user) return;
    const previous = notifications;
    setNotifications((current) => current.map((item) => item.id === notificationId ? { ...item, status: 'READ' } : item));
    try {
      await markRuntimeNotificationRead(notificationId, user);
    } catch (readError) {
      setNotifications(previous);
      toast.error('Update Failed', readError instanceof Error ? readError.message : 'Unable to mark notification as read.');
    }
  };

  const handleArchive = async (notificationId: string) => {
    const previous = notifications;
    setNotifications((current) => current.filter((item) => item.id !== notificationId));
    try {
      await archiveRuntimeNotification(notificationId);
    } catch (archiveError) {
      setNotifications(previous);
      toast.error('Archive Failed', archiveError instanceof Error ? archiveError.message : 'Unable to archive notification.');
    }
  };

  const handleMarkAllRead = async () => {
    if (!user) return;
    try {
      await markAllRuntimeNotificationsRead(user);
      await loadNotifications();
      toast.success('Notifications Updated', 'All visible notifications were marked read.');
    } catch (markError) {
      toast.error('Update Failed', markError instanceof Error ? markError.message : 'Unable to mark notifications read.');
    }
  };

  const handleSyncRuntime = async () => {
    if (!user) return;
    setSyncing(true);
    try {
      const created = await generateRuntimeNotificationsFromCurrentState(user);
      toast.success('Runtime Sync Complete', `${created} notification${created === 1 ? '' : 's'} generated from current workflow state.`);
      await loadNotifications();
    } catch (syncError) {
      toast.error('Runtime Sync Failed', syncError instanceof Error ? syncError.message : 'Unable to generate runtime notifications.');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-matte-black p-6 text-slate-300">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center border border-gold/20 bg-gold/10 text-gold">
            <Bell className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Notification Runtime</h2>
            <p className="text-sm text-slate-500">Event-driven alerts for tasks, compliance, GST, documents, and escalations.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={loadNotifications} disabled={loading} className="flex items-center gap-2 border border-slate-800 px-3 py-2 text-xs font-bold text-slate-300 hover:border-gold/40 disabled:opacity-50">
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
            Refresh
          </button>
          <button onClick={handleMarkAllRead} disabled={unreadCount === 0} className="flex items-center gap-2 border border-slate-800 px-3 py-2 text-xs font-bold text-slate-300 hover:border-gold/40 disabled:opacity-50">
            <CheckCheck className="h-4 w-4" />
            Mark All Read
          </button>
          <button onClick={handleSyncRuntime} disabled={syncing} className="flex items-center gap-2 bg-gold px-3 py-2 text-xs font-bold text-matte-black hover:bg-gold-light disabled:opacity-50">
            <RadioTower className="h-4 w-4" />
            {syncing ? 'Syncing...' : 'Sync Runtime Events'}
          </button>
        </div>
      </div>

      <div className="mb-5 grid gap-3 md:grid-cols-4">
        <Metric label="Visible" value={notifications.length} />
        <Metric label="Unread" value={unreadCount} tone="text-gold" />
        <Metric label="Critical" value={criticalCount} tone="text-red-300" />
        <Metric label="Sources" value="7" tone="text-emerald-300" />
      </div>

      <div className="mb-5 flex items-center gap-3 border border-slate-800 bg-matte-black-light px-3 py-2">
        <Search className="h-4 w-4 text-slate-500" />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search notifications..."
          className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-600"
        />
      </div>

      {error && <div className="mb-5 border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">{error}</div>}

      {loading ? (
        <div className="border border-slate-800 bg-matte-black-light p-12 text-center text-slate-500">Loading runtime notifications...</div>
      ) : filtered.length === 0 ? (
        <div className="border border-dashed border-slate-800 bg-matte-black-light p-12 text-center">
          <Bell className="mx-auto mb-3 h-9 w-9 text-slate-600" />
          <p className="font-bold text-white">No notifications found</p>
          <p className="mt-1 text-sm text-slate-500">Runtime events will appear here as workflow actions occur.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => (
            <article key={item.id} className={cn('border bg-matte-black-light p-4', item.status === 'UNREAD' ? 'border-gold/20' : 'border-slate-800')}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className={cn('border px-2 py-0.5 text-[10px] font-bold uppercase', priorityTone[item.priority || 'MEDIUM'])}>{item.priority || 'MEDIUM'}</span>
                    <span className="text-[10px] font-bold uppercase text-slate-500">{item.status}</span>
                    {item.audience_role && <span className="text-[10px] text-slate-500">Role: {item.audience_role}</span>}
                  </div>
                  <h3 className="text-sm font-bold text-white">{item.title}</h3>
                  <p className="mt-1 text-sm text-slate-400">{item.message}</p>
                  <p className="mt-2 text-[11px] text-slate-600">{new Date(item.created_at).toLocaleString()}</p>
                </div>
                <div className="flex gap-2">
                  {item.status === 'UNREAD' && (
                    <button onClick={() => handleMarkRead(item.id)} className="border border-slate-800 p-2 text-slate-400 hover:text-emerald-300">
                      <CheckCheck className="h-4 w-4" />
                    </button>
                  )}
                  <button onClick={() => handleArchive(item.id)} className="border border-slate-800 p-2 text-slate-400 hover:text-red-300">
                    <Archive className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};

const Metric: React.FC<{ label: string; value: string | number; tone?: string }> = ({ label, value, tone = 'text-white' }) => (
  <div className="border border-slate-800 bg-matte-black-light p-4">
    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">{label}</p>
    <p className={cn('mt-2 text-2xl font-bold', tone)}>{value}</p>
  </div>
);

export default NotificationRuntimeCenter;
