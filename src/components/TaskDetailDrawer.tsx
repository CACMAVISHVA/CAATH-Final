/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Calendar,
  User,
  Edit3,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  Send,
  Tag,
  Building2,
  Plus,
  Check,
  Trash2,
  Paperclip,
  FileText,
  ArrowRight,
  MoreVertical,
  ExternalLink
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import {
  TaskRow,
  TaskPriority,
  TaskStatus,
  TaskReassignmentHistory,
  getTaskReassignmentHistory,
  updateTask,
  updateTaskStatus,
  reassignTask,
  getClients,
} from '../services/taskService';
import {
  TaskActivity,
  TaskComment,
  getTaskActivities,
  getTaskComments,
  addTaskComment,
  logTaskStatusChanged,
  logTaskPriorityChanged,
  logTaskDeadlineChanged,
} from '../services/taskActivityService';
import {
  Subtask,
  getSubtasks,
  createSubtask,
  toggleSubtaskComplete,
  deleteSubtask,
} from '../services/subtaskService';
import { RoleBasedAssignment } from './RoleBasedAssignment';
import { TaskActivityTimeline } from './task-detail/TaskActivityTimeline';
import { useOverlayLifecycle } from '../hooks/useOverlayLifecycle';
import { GOVERNMENT_PORTALS, openOfficialPortal, recordGovernmentPortalAccess } from '../services/governmentPortalService';

interface TaskDetailDrawerProps {
  task: TaskRow | null;
  isOpen: boolean;
  onClose: () => void;
  onTaskUpdated?: () => void;
}

const PRIORITY_OPTIONS: TaskPriority[] = ['Low', 'Medium', 'High', 'Urgent'];
const STATUS_OPTIONS: TaskStatus[] = [
  'Created',
  'Assigned',
  'Accepted',
  'In Progress',
  'Under Review',
  'Escalated',
  'Reassigned',
  'Completed',
  'Archived',
  'Todo',
  'Review',
];

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  Urgent: 'bg-red-500/10 text-red-400 border-red-500/20',
  High: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  Medium: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  Low: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
};

const STATUS_COLORS: Record<TaskStatus, string> = {
  'Todo': 'bg-slate-500/10 text-slate-400',
  'Created': 'bg-slate-500/10 text-slate-400',
  'Assigned': 'bg-blue-500/10 text-blue-400',
  'Accepted': 'bg-blue-600/10 text-blue-400',
  'In Progress': 'bg-sky-500/10 text-sky-400',
  'Under Review': 'bg-amber-500/10 text-amber-400',
  'Review': 'bg-amber-500/10 text-amber-400',
  'Escalated': 'bg-red-500/10 text-red-400',
  'Reassigned': 'bg-violet-500/10 text-violet-400',
  'Completed': 'bg-emerald-500/10 text-emerald-400',
  'Archived': 'bg-slate-700/10 text-slate-300',
};

type DrawerTab = 'details' | 'subtasks' | 'activity' | 'comments';

export const TaskDetailDrawer: React.FC<TaskDetailDrawerProps> = ({
  task,
  isOpen,
  onClose,
  onTaskUpdated,
}) => {
  const { user } = useAuth();
  const [activities, setActivities] = useState<TaskActivity[]>([]);
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [newComment, setNewComment] = useState('');
  const [newSubtask, setNewSubtask] = useState('');
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [activeTab, setActiveTab] = useState<DrawerTab>('details');

  // Edit mode states
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPriority, setEditPriority] = useState<TaskPriority>('Medium');
  const [editStatus, setEditStatus] = useState<TaskStatus>('Todo');
  const [editDeadline, setEditDeadline] = useState('');
  const [editAssignee, setEditAssignee] = useState('');
  const [editReason, setEditReason] = useState('');
  const [editClientId, setEditClientId] = useState('');
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [reassignmentHistory, setReassignmentHistory] = useState<TaskReassignmentHistory[]>([]);
  const drawerRef = React.useRef<HTMLDivElement | null>(null);
  useOverlayLifecycle({ isOpen: Boolean(isOpen && task), onClose, initialFocusRef: drawerRef });

  // Load all task data
  const loadTaskData = useCallback(async () => {
    if (!task) return;

    setLoadingActivities(true);
    try {
      const [acts, coms, subs, history] = await Promise.all([
        getTaskActivities(task.id),
        getTaskComments(task.id),
        getSubtasks(task.id),
        getTaskReassignmentHistory(task.id),
      ]);
      setActivities(acts);
      setComments(coms);
      setSubtasks(subs);
      setReassignmentHistory(history);
    } catch (error) {
      console.error('Failed to load task data:', error);
    } finally {
      setLoadingActivities(false);
    }
  }, [task]);

  // Initialize edit form when task changes
  useEffect(() => {
    if (task) {
      setEditTitle(task.title);
      setEditDescription(task.description || '');
      setEditPriority(task.priority);
      setEditStatus(task.status);
      setEditDeadline(task.deadline ? task.deadline.split('T')[0] : '');
      setEditAssignee(task.assigned_to || '');
      setEditClientId(task.client_id || '');
      loadTaskData();

      if (user?.firmId) {
        getClients(user.firmId).then(setClients).catch(console.error);
      }
    }
  }, [task, loadTaskData, user?.firmId]);

  // Quick action handlers
  const handleStatusChange = async (newStatus: TaskStatus) => {
    if (!task || !user) return;
    try {
      const previousStatus = task.status;
      await updateTaskStatus(task.id, newStatus, user);
      await logTaskStatusChanged(task.id, user, previousStatus, newStatus);
      onTaskUpdated?.();
      loadTaskData();
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const handlePriorityChange = async (newPriority: TaskPriority) => {
    if (!task || !user) return;
    try {
      const previousPriority = task.priority;
      await updateTask(task.id, { priority: newPriority }, user);
      await logTaskPriorityChanged(task.id, user, previousPriority, newPriority);
      onTaskUpdated?.();
      loadTaskData();
    } catch (error) {
      console.error('Failed to update priority:', error);
    }
  };

  const handleDeadlineChange = async (newDeadline: string) => {
    if (!task || !user) return;
    try {
      const previousDeadline = task.deadline ? task.deadline.split('T')[0] : '';
      await updateTask(task.id, { deadline: newDeadline || undefined }, user);
      await logTaskDeadlineChanged(task.id, user, previousDeadline, newDeadline);
      onTaskUpdated?.();
      loadTaskData();
    } catch (error) {
      console.error('Failed to update deadline:', error);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !task || !user) return;
    try {
      await addTaskComment(task.id, user, newComment);
      setNewComment('');
      loadTaskData();
    } catch (error) {
      console.error('Failed to add comment:', error);
    }
  };

  const handleAddSubtask = async () => {
    if (!newSubtask.trim() || !task || !user) return;
    try {
      await createSubtask({
        taskId: task.id,
        title: newSubtask.trim(),
        user,
      });
      setNewSubtask('');
      loadTaskData();
    } catch (error) {
      console.error('Failed to add subtask:', error);
    }
  };

  const handleToggleSubtask = async (subtaskId: string, completed: boolean) => {
    try {
      await toggleSubtaskComplete(subtaskId, !completed, user?.id || '');
      loadTaskData();
    } catch (error) {
      console.error('Failed to toggle subtask:', error);
    }
  };

  const handleDeleteSubtask = async (subtaskId: string) => {
    try {
      await deleteSubtask(subtaskId);
      loadTaskData();
    } catch (error) {
      console.error('Failed to delete subtask:', error);
    }
  };

  const handleSaveEdit = async () => {
    if (!task || !user) return;
    try {
      await updateTask(task.id, {
        title: editTitle,
        description: editDescription || undefined,
        priority: editPriority,
        category: task.category || undefined,
        deadline: editDeadline || undefined,
        client_id: editClientId || undefined,
      }, user);

      if (editAssignee !== task.assigned_to) {
        await reassignTask(task.id, editAssignee || null, user, editReason || 'Reassigned by task owner');
        setEditReason('');
      }

      setIsEditing(false);
      onTaskUpdated?.();
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  };

  const getSubtaskProgress = () => {
    const completed = subtasks.filter(s => s.completed).length;
    const total = subtasks.length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { completed, total, percentage };
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const isOverdue = (deadline: string | null) => {
    if (!deadline) return false;
    return new Date(deadline) < new Date();
  };

  if (!isOpen || !task) return null;

  const progress = getSubtaskProgress();
  const linkedPortal = GOVERNMENT_PORTALS.find((portal) => {
    if (task.portal_type === portal.type) return true;
    if (portal.type === 'GST') return task.category === 'GST';
    if (portal.type === 'IncomeTax') return task.category === 'Income Tax';
    if (portal.type === 'MCA') return task.category === 'MCA' || task.category === 'ROC';
    if (portal.type === 'TRACES') return task.category === 'TDS';
    return false;
  });

  const handlePortalLaunch = async () => {
    if (!linkedPortal || !user) return;
    await recordGovernmentPortalAccess({ user, portal: linkedPortal, task, action: 'portal_launch' });
    openOfficialPortal(linkedPortal);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div ref={drawerRef} tabIndex={-1} role="dialog" aria-modal="true" className="relative w-[650px] max-w-full bg-matte-black-light border-l border-slate-800 flex flex-col h-full animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 bg-matte-black">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold uppercase", PRIORITY_COLORS[task.priority])}>
                  {task.priority}
                </span>
                <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold uppercase", STATUS_COLORS[task.status])}>
                  {task.status}
                </span>
                {isOverdue(task.deadline) && task.status !== 'Completed' && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-red-500/10 text-red-400 border border-red-500/20">
                    Overdue
                  </span>
                )}
              </div>
              {isEditing ? (
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full bg-matte-black border border-slate-700 rounded px-2 py-1 text-white font-bold text-lg"
                />
              ) : (
                <h2 className="text-lg font-bold text-white truncate pr-4">{task.title}</h2>
              )}
              <p className="text-xs text-slate-500 mt-1">Task ID: {task.id.slice(0, 8)}</p>
            </div>
            <div className="flex items-center gap-2">
              {!isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-2 text-slate-400 hover:text-gold transition-colors"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
              )}
              <button onClick={onClose} className="p-2 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Quick Actions Bar */}
          <div className="flex flex-wrap gap-2 mt-4">
            <select
              value={task.status}
              onChange={(e) => handleStatusChange(e.target.value as TaskStatus)}
              className="text-xs bg-matte-black border border-slate-700 rounded px-2 py-1 text-slate-300"
            >
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select
              value={task.priority}
              onChange={(e) => handlePriorityChange(e.target.value as TaskPriority)}
              className="text-xs bg-matte-black border border-slate-700 rounded px-2 py-1 text-slate-300"
            >
              {PRIORITY_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <input
              type="date"
              value={task.deadline ? task.deadline.split('T')[0] : ''}
              onChange={(e) => handleDeadlineChange(e.target.value)}
              className="text-xs bg-matte-black border border-slate-700 rounded px-2 py-1 text-slate-300"
            />
            {task.status !== 'Completed' && (
              <button
                onClick={() => handleStatusChange('Completed')}
                className="flex items-center gap-1 text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded px-2 py-1 hover:bg-emerald-500/20"
              >
                <CheckCircle2 className="w-3 h-3" />
                Mark Complete
              </button>
            )}
            {linkedPortal && (
              <button
                onClick={handlePortalLaunch}
                className="flex items-center gap-1 text-xs bg-gold/10 text-gold border border-gold/20 rounded px-2 py-1 hover:bg-gold/20"
              >
                <ExternalLink className="w-3 h-3" />
                {linkedPortal.shortName}
              </button>
            )}
          </div>
        </div>

        {/* Subtask Progress Bar */}
        {subtasks.length > 0 && (
          <div className="px-4 py-2 bg-matte-black border-b border-slate-800">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-slate-500">Progress</span>
              <span className="text-slate-400">{progress.completed}/{progress.total} ({progress.percentage}%)</span>
            </div>
            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gold transition-all duration-300"
                style={{ width: `${progress.percentage}%` }}
              />
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-slate-800">
          {([
            { id: 'details', label: 'Details' },
            { id: 'subtasks', label: `Subtasks (${subtasks.length})` },
            { id: 'activity', label: 'Activity' },
            { id: 'comments', label: `Comments (${comments.length})` },
          ] as const).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors",
                activeTab === tab.id
                  ? "text-gold border-b-2 border-gold bg-matte-black/50"
                  : "text-slate-500 hover:text-white"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'details' && (
            <div className="p-4 space-y-4">
              <div>
                <label className="text-xs text-slate-500 uppercase font-bold mb-2 block">Description</label>
                {isEditing ? (
                  <textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    rows={4}
                    className="w-full bg-matte-black border border-slate-700 rounded p-3 text-sm text-white"
                    placeholder="Add description..."
                  />
                ) : (
                  <p className="text-sm text-slate-300">{task.description || 'No description'}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-500 uppercase font-bold mb-2 block">Category</label>
                  <span className="inline-block px-3 py-1 bg-slate-800 text-slate-400 rounded text-sm">
                    {task.category || 'Uncategorized'}
                  </span>
                </div>
                <div>
                  <label className="text-xs text-slate-500 uppercase font-bold mb-2 block">Deadline</label>
                  <div className={cn(
                    "flex items-center gap-2 text-sm",
                    isOverdue(task.deadline) && task.status !== 'Completed' ? "text-red-400" : "text-slate-300"
                  )}>
                    <Calendar className="w-4 h-4" />
                    {formatDate(task.deadline)}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-500 uppercase font-bold mb-2 block">Assigned To</label>
                {isEditing ? (
                  <RoleBasedAssignment
                    value={editAssignee}
                    onChange={setEditAssignee}
                    firmId={user?.firmId || ''}
                  />
                ) : (
                  <div className="flex items-center gap-2 text-sm text-slate-300">
                    <User className="w-4 h-4" />
                    {task.assigned_to ? 'Assigned' : 'Unassigned'}
                  </div>
                )}
              </div>

              {isEditing && editAssignee !== task.assigned_to && (
                <div>
                  <label className="text-xs text-slate-500 uppercase font-bold mb-2 block">Reassignment Reason</label>
                  <textarea
                    value={editReason}
                    onChange={(e) => setEditReason(e.target.value)}
                    rows={3}
                    className="w-full bg-matte-black border border-slate-700 rounded-xl p-3 text-sm text-white resize-none"
                    placeholder="Provide a reason for this reassignment"
                  />
                </div>
              )}

              <div className="pt-4 border-t border-slate-800 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Created</span>
                  <span className="text-slate-400">{formatDate(task.created_at)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Last Updated</span>
                  <span className="text-slate-400">{formatDate(task.updated_at)}</span>
                </div>
              </div>

              {reassignmentHistory.length > 0 && (
                <div className="pt-4 border-t border-slate-800 space-y-3">
                  <h3 className="text-sm font-bold text-white">Reassignment History</h3>
                  <div className="space-y-2">
                    {reassignmentHistory.map((entry) => (
                      <div key={entry.id} className="rounded-2xl bg-slate-900/60 border border-slate-800 p-3 text-sm text-slate-300">
                        <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                          <span>{entry.previous_assignee_name || entry.previous_assignee || 'Unassigned'} → {entry.new_assignee_name || entry.new_assignee || 'Unassigned'}</span>
                          <span>{new Date(entry.created_at).toLocaleDateString()}</span>
                        </div>
                        <p>{entry.reason || 'No reason provided'}</p>
                        <p className="text-xs text-slate-500">By {entry.reassigned_by_name || entry.reassigned_by}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {isEditing && (
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setIsEditing(false)}
                    className="flex-1 py-2 bg-slate-800 text-slate-300 rounded font-bold text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    className="flex-1 py-2 bg-gold text-matte-black rounded font-bold text-sm"
                  >
                    Save Changes
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'subtasks' && (
            <div className="p-4 space-y-4">
              {/* Add Subtask */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newSubtask}
                  onChange={(e) => setNewSubtask(e.target.value)}
                  placeholder="Add a subtask..."
                  className="flex-1 bg-matte-black border border-slate-700 rounded px-3 py-2 text-sm text-white"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddSubtask()}
                />
                <button
                  onClick={handleAddSubtask}
                  disabled={!newSubtask.trim()}
                  className="p-2 bg-gold text-matte-black rounded disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Subtask List */}
              {subtasks.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-sm">
                  No subtasks yet. Add checklist items to this task.
                </div>
              ) : (
                <div className="space-y-2">
                  {subtasks.map((subtask) => (
                    <div
                      key={subtask.id}
                      className={cn(
                        "flex items-center gap-3 p-3 bg-matte-black rounded-lg border border-slate-800",
                        subtask.completed && "opacity-60"
                      )}
                    >
                      <button
                        onClick={() => handleToggleSubtask(subtask.id, subtask.completed)}
                        className={cn(
                          "w-5 h-5 rounded border-2 flex items-center justify-center transition-colors",
                          subtask.completed
                            ? "bg-emerald-500 border-emerald-500"
                            : "border-slate-600 hover:border-gold"
                        )}
                      >
                        {subtask.completed && <Check className="w-3 h-3 text-white" />}
                      </button>
                      <span className={cn(
                        "flex-1 text-sm",
                        subtask.completed ? "text-slate-500 line-through" : "text-white"
                      )}>
                        {subtask.title}
                      </span>
                      <button
                        onClick={() => handleDeleteSubtask(subtask.id)}
                        className="p-1 text-slate-500 hover:text-red-400"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Progress Summary */}
              {subtasks.length > 0 && (
                <div className="pt-4 border-t border-slate-800">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Subtask Progress</span>
                    <span className="text-gold font-bold">{progress.percentage}%</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="p-4">
              <TaskActivityTimeline activities={activities} loading={loadingActivities} formatDate={formatDate} />
            </div>
          )}

          {activeTab === 'comments' && (
            <div className="p-4 space-y-4">
              {comments.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-sm">No comments yet</div>
              ) : (
                <div className="space-y-3">
                  {comments.map((comment) => (
                    <div key={comment.id} className="p-3 bg-matte-black rounded-lg border border-slate-800">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-gold/10 flex items-center justify-center">
                            <span className="text-[10px] font-bold text-gold">{comment.user_name.charAt(0)}</span>
                          </div>
                          <span className="text-sm font-bold text-white">{comment.user_name}</span>
                          <span className="text-[10px] text-slate-500">({comment.user_role})</span>
                        </div>
                        <span className="text-[10px] text-slate-500">{formatDate(comment.created_at)}</span>
                      </div>
                      <p className="text-sm text-slate-300 pl-8">{comment.content}</p>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2 pt-4 border-t border-slate-800">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  className="flex-1 bg-matte-black border border-slate-700 rounded px-3 py-2 text-sm text-white"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                />
                <button
                  onClick={handleAddComment}
                  disabled={!newComment.trim()}
                  className="p-2 bg-gold text-matte-black rounded disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskDetailDrawer;

