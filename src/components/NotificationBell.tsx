/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Bell, CheckCheck, AlertCircle, FileText, MessageSquare, CheckCircle2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import { getUnreadCount, markAsRead, markAllAsRead, markAsUnread } from '../services/notificationService';
import { EnterpriseNotification, getEnterpriseNotifications } from '../services/notificationEngine';
import { playSound } from '../services/soundService';
import { runtimeKernel } from '../runtime/production';

interface NotificationBellProps {
  className?: string;
}

const NOTIFICATION_ICONS: Record<string, React.FC<{ className?: string }>> = {
  'New Task Assigned': CheckCircle2,
  'Task Overdue': AlertCircle,
  'Approval Required': FileText,
  'Approval Approved': CheckCircle2,
  'Approval Rejected': AlertCircle,
  'New Comment': MessageSquare,
  default: Bell,
};

export const NotificationBell: React.FC<NotificationBellProps> = ({ className }) => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<EnterpriseNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const loadNotifications = useCallback(async () => {
    if (!user?.id) return;

    try {
      const [notifs, count] = await Promise.all([
        getEnterpriseNotifications({ userId: user.id, firmId: user.firmId, role: user.role }),
        getUnreadCount(user.id, user.firmId, user.role),
      ]);
      setNotifications(notifs);
      if (count > unreadCount) playSound('notification');
      setUnreadCount(count);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    }
  }, [user?.id, user?.firmId, unreadCount]);

  useEffect(() => {
    loadNotifications();
    if (!user?.id) return;

    const unsubscribeRealtime = runtimeKernel.subscribeUserNotifications(
      { userId: user.id, firmId: user.firmId, role: user.role },
      loadNotifications,
    );

    // Poll for new notifications every 30 seconds
    const interval = setInterval(loadNotifications, 30000);
    return () => {
      clearInterval(interval);
      unsubscribeRealtime();
    };
  }, [loadNotifications, user?.id, user?.firmId, user?.role]);

  const handleMarkAsRead = async (notificationId: string) => {
    if (!user?.id) return;

    try {
      await markAsRead(notificationId, user.id);
      loadNotifications();
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!user?.id) return;

    try {
      await markAllAsRead(user.id, user.firmId);
      loadNotifications();
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  };

  const getIcon = (title: string) => {
    return NOTIFICATION_ICONS[title] || NOTIFICATION_ICONS.default;
  };

  return (
    <div className={cn("relative", className)}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-400 hover:text-white transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-80 bg-matte-black-light border border-slate-800 rounded-xl shadow-2xl z-50 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b border-slate-800 bg-matte-black">
              <h3 className="text-sm font-bold text-white">Notifications</h3>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="text-xs text-gold hover:underline flex items-center gap-1"
                >
                  <CheckCheck className="w-3 h-3" />
                  Mark all read
                </button>
              )}
            </div>

            {/* Notification List */}
            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-sm">
                  No notifications
                </div>
              ) : (
                notifications.map((notif) => {
                  const Icon = getIcon(notif.title);
                  return (
                    <div
                      key={notif.id}
                      className={cn(
                        "p-3 border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors cursor-pointer",
                        notif.status === 'UNREAD' && "bg-slate-800/20"
                      )}
                      onClick={() => notif.status === 'UNREAD' && handleMarkAsRead(notif.id)}
                    >
                      <div className="flex gap-3">
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center",
                          notif.status === 'UNREAD' ? "bg-gold/10" : "bg-slate-800"
                        )}>
                          <Icon className={cn(
                            "w-4 h-4",
                            notif.status === 'UNREAD' ? "text-gold" : "text-slate-400"
                          )} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-white">{notif.title}</p>
                          <p className="text-xs text-slate-400 truncate">{notif.message}</p>
                          <p className="text-[10px] text-slate-500 mt-1">
                            {formatTime(notif.created_at)}
                          </p>
                        </div>
                        {notif.status === 'UNREAD' && (
                          <div className="w-2 h-2 bg-gold rounded-full mt-2" />
                        )}
                        {notif.status === 'READ' && (
                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              if (user?.id) markAsUnread(notif.id, user.id).then(loadNotifications);
                            }}
                            className="text-[10px] text-slate-500 hover:text-gold"
                          >
                            Unread
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="p-2 border-t border-slate-800 text-center">
                <button className="text-xs text-gold hover:underline">
                  View all notifications
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationBell;
