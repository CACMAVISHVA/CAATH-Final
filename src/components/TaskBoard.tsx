/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Calendar,
  LayoutGrid,
  List,
  Trash2,
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import { Modal } from './Modal';
import { useUnsavedChangesGuard } from '../hooks/useUnsavedChangesGuard';
import {
  createTask,
  updateTaskStatus,
  deleteTask,
  getTasks,
  getMyTasks,
  getClients,
  bulkReassignTasks,
  TaskRow,
  TaskPriority,
  TaskStatus
} from '../services/taskService';
import { RoleBasedAssignment } from './RoleBasedAssignment';
import { TaskDetailDrawer } from './TaskDetailDrawer';
import { TaskAssignmentControls } from './task-board/TaskAssignmentControls';
import { TaskWorkloadAnalytics } from './task-board/TaskWorkloadAnalytics';
import { aiTaskQueueOrchestrator, AITaskQueueItem } from '../domains/ai-task-queue';
import {
  cognitiveExecutionOrchestrator,
  CognitiveExecutionOutput,
  ExecutionObjective,
} from '../domains/cognitive-execution';
import {
  cognitiveCommandCenterOrchestrator,
  CognitiveCommandCenterViewModel,
} from '../domains/cognitive-command-center';
import { CognitiveExecutionPanel } from './CognitiveExecutionPanel';
import {
  ALL_STATUS_OPTIONS,
  COLUMNS,
  normalizeStatusForColumns,
  PRIORITY_COLORS,
} from './task-board/constants';
import { GOVERNMENT_PORTALS } from '../services/governmentPortalService';

interface NewTaskForm {
  title: string;
  description: string;
  priority: TaskPriority;
  category: string;
  portalType: string;
  portalWorkflowType: string;
  deadline: string;
  clientId: string;
  assignedTo: string;
}

export const TaskBoard: React.FC = () => {
  const { user } = useAuth();
  const [view, setView] = useState<'board' | 'list'>('board');
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewTask, setShowNewTask] = useState(false);
  const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null);
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTask, setSelectedTask] = useState<TaskRow | null>(null);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [showBulkReassign, setShowBulkReassign] = useState(false);
  const [bulkAssignee, setBulkAssignee] = useState('');
  const [bulkReason, setBulkReason] = useState('');
  const [aiQueue, setAiQueue] = useState<AITaskQueueItem[]>([]);
  const [executionOutput, setExecutionOutput] = useState<CognitiveExecutionOutput | null>(null);
  const [commandCenterView, setCommandCenterView] = useState<CognitiveCommandCenterViewModel | null>(null);
  const [showAiQueue, setShowAiQueue] = useState(false);

  const [formData, setFormData] = useState<NewTaskForm>({
    title: '',
    description: '',
    priority: 'Medium',
    category: '',
    portalType: '',
    portalWorkflowType: '',
    deadline: '',
    clientId: '',
    assignedTo: '',
  });
  const defaultTaskForm: NewTaskForm = {
    title: '',
    description: '',
    priority: 'Medium',
    category: '',
    portalType: '',
    portalWorkflowType: '',
    deadline: '',
    clientId: '',
    assignedTo: '',
  };
  const hasTaskFormChanges = JSON.stringify(formData) !== JSON.stringify(defaultTaskForm);
  const guardTaskModalClose = useUnsavedChangesGuard(hasTaskFormChanges);

  const loadTasks = useCallback(async () => {
    if (!user?.firmId) return;

    setLoading(true);
    try {
      const data = user.role === 'Staff'
        ? await getMyTasks(user.id, user.firmId)
        : await getTasks(user.firmId);
      setTasks(data);
    } catch (error) {
      console.error('Failed to load tasks:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.firmId]);

  const loadClients = useCallback(async () => {
    if (!user?.firmId) return;

    try {
      const clientList = await getClients(user.firmId);
      setClients(clientList);
    } catch (error) {
      console.error('Failed to load clients:', error);
    }
  }, [user?.firmId]);

  useEffect(() => {
    loadTasks();
    loadClients();
  }, [loadTasks, loadClients]);

  useEffect(() => {
    const onQuickAction = (event: Event) => {
      const customEvent = event as CustomEvent<{ action?: string }>;
      if (customEvent.detail?.action === 'create-task') {
        setShowNewTask(true);
      }
      if (customEvent.detail?.action === 'reassign-work') {
        setShowBulkReassign(true);
      }
      if (customEvent.detail?.action === 'open-ai-queue') {
        setShowAiQueue(true);
      }
    };
    window.addEventListener('caath:quick-action', onQuickAction);
    return () => window.removeEventListener('caath:quick-action', onQuickAction);
  }, []);

  const handleCreateTask = async () => {
    if (!formData.title.trim() || !user) return;

    try {
      await createTask({
        firmId: user.firmId!,
        clientId: formData.clientId || undefined,
        assignedTo: formData.assignedTo || undefined,
        title: formData.title,
        description: formData.description,
        priority: formData.priority,
        category: formData.category as 'GST' | 'Income Tax' | 'Audit' | 'ROC' | 'MCA' | 'TDS' | 'Other' | undefined,
        portalType: formData.portalType || undefined,
        portalWorkflowType: formData.portalWorkflowType || undefined,
        deadline: formData.deadline || undefined,
        user,
      });

      setFormData(defaultTaskForm);
      setShowNewTask(false);
      loadTasks();
    } catch (error) {
      console.error('Failed to create task:', error);
      alert(error instanceof Error ? error.message : 'Failed to create task');
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    if (!user) return;

    try {
      await updateTaskStatus(taskId, newStatus, user);
      loadTasks();
    } catch (error) {
      console.error('Failed to update task status:', error);
    }
  };

  const handleDeleteTask = async () => {
    if (!deleteTaskId || !user) return;

    try {
      await deleteTask(deleteTaskId, user);
      setDeleteTaskId(null);
      loadTasks();
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  };

  const filteredTasks = tasks.filter((task) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      task.title.toLowerCase().includes(term) ||
      task.category?.toLowerCase().includes(term) ||
      task.description?.toLowerCase().includes(term)
    );
  });

  useEffect(() => {
    const loadQueue = async () => {
      if (!user || !user.firmId) return;
      const queue = await aiTaskQueueOrchestrator.getPrioritizedQueue(user);
      const execution = cognitiveExecutionOrchestrator.execute({
        tenantId: user.firmId,
        queue,
        objectives: buildExecutionObjectives(tasks, queue),
        actorRole: user.role,
      });
      setExecutionOutput(execution);
      setCommandCenterView(cognitiveCommandCenterOrchestrator.toViewModel({ output: execution }));
      setAiQueue(execution.influencedQueue);
    };
    loadQueue();
  }, [user, tasks]);

  const getTaskCounts = () => {
    return COLUMNS.map((col) => ({
      ...col,
      count: filteredTasks.filter((t) => normalizeStatusForColumns(t.status) === col.id).length,
    }));
  };

  const selectedCount = selectedTaskIds.length;
  const toggleSelection = (taskId: string) => {
    setSelectedTaskIds((current) =>
      current.includes(taskId)
        ? current.filter((id) => id !== taskId)
        : [...current, taskId]
    );
  };

  const clearBulkSelection = () => {
    setSelectedTaskIds([]);
    setBulkAssignee('');
    setBulkReason('');
  };

  const handleBulkReassignSubmit = async () => {
    if (!user || !bulkAssignee || selectedTaskIds.length === 0) return;
    try {
      await bulkReassignTasks(selectedTaskIds, bulkAssignee, bulkReason || undefined, user);
      clearBulkSelection();
      setShowBulkReassign(false);
      loadTasks();
    } catch (error) {
      console.error('Bulk reassignment failed:', error);
    }
  };

  return (
    <div className="p-8 space-y-6 h-full bg-matte-black text-slate-300 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold gold-text-gradient">Tasks & Workflows</h2>
          <p className="text-slate-500">Assign tasks, track progress, and manage recurring workflows.</p>
          {executionOutput && (
            <p className="mt-1 text-xs text-slate-400 uppercase tracking-wider">
              Cognitive handoffs: {executionOutput.handoffActions.length} • Review required:{' '}
              {executionOutput.handoffActions.filter((action) => action.governanceStatus === 'needs-review').length}
            </p>
          )}
        </div>
        <div className="flex gap-3">
          <div className="flex bg-matte-black-light border border-slate-800 rounded-lg p-1">
            <button
              onClick={() => setView('board')}
              className={cn(
                "p-1.5 rounded-md transition-all",
                view === 'board' ? "bg-gold/10 text-gold" : "text-slate-400 hover:text-slate-200"
              )}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setView('list')}
              className={cn(
                "p-1.5 rounded-md transition-all",
                view === 'list' ? "bg-gold/10 text-gold" : "text-slate-400 hover:text-slate-200"
              )}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
          <button
            onClick={() => setShowNewTask(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gold text-matte-black rounded-lg text-sm font-bold hover:bg-gold-light transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Task
          </button>
        </div>
      </div>

      <TaskAssignmentControls
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        selectedCount={selectedCount}
        onOpenBulkReassign={() => setShowBulkReassign(true)}
      />
      <TaskWorkloadAnalytics
        total={filteredTasks.length}
        overdue={filteredTasks.filter((t) => t.deadline && new Date(t.deadline) < new Date() && t.status !== 'Completed').length}
        escalated={filteredTasks.filter((t) => t.status === 'Escalated').length}
        completed={filteredTasks.filter((t) => normalizeStatusForColumns(t.status) === 'Completed').length}
      />
      {commandCenterView && (
        <CognitiveExecutionPanel viewModel={commandCenterView} />
      )}
      {showAiQueue && (
        <div className="rounded-2xl border border-slate-800 bg-matte-black-light p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">AI Task Queue</p>
            <button onClick={() => setShowAiQueue(false)} className="text-xs text-slate-400 hover:text-white">Hide</button>
          </div>
          {aiQueue.length === 0 ? (
            <p className="text-sm text-slate-500">No AI-prioritized queue items available.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {aiQueue.slice(0, 8).map((item) => (
                <div key={item.taskId} className="p-3 rounded-xl border border-slate-800 bg-slate-950/60">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-white">{item.title}</p>
                    <span className="text-[10px] text-gold uppercase">{item.recommendedAction}</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{item.explanation}</p>
                  <div className="mt-2 flex gap-2 text-[11px]">
                    <span className="px-2 py-1 bg-slate-900 text-slate-300 rounded">Urgency {item.urgencyScore}</span>
                    <span className="px-2 py-1 bg-slate-900 text-amber-300 rounded">SLA {item.slaBreachProbability}%</span>
                    <span className="px-2 py-1 bg-slate-900 text-red-300 rounded">Esc {item.escalationScore}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Board View */}
      {!loading && view === 'board' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {getTaskCounts().map((column) => (
            <div key={column.id} className="flex flex-col gap-4">
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-2">
                  <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider", column.color)}>
                    {column.label}
                  </span>
                  <span className="text-xs text-slate-400 font-bold">{column.count}</span>
                </div>
              </div>
              <div className="flex-1 space-y-4 overflow-y-auto pb-4 custom-scrollbar max-h-[500px]">
                {filteredTasks.filter((t) => normalizeStatusForColumns(t.status) === column.id).map((task) => (
                  <motion.div
                    key={task.id}
                    layoutId={task.id}
                    onClick={() => setSelectedTask(task)}
                  className="p-4 bg-matte-black-light rounded-xl border border-slate-800 hover:border-gold/30 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className={cn(
                        "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
                        PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.Medium
                      )}>
                        {task.priority}
                      </span>
                      <div className="flex items-center gap-1">
                        <select
                          value={task.status}
                          onChange={(e) => handleStatusChange(task.id, e.target.value as TaskStatus)}
                          onClick={(e) => e.stopPropagation()}
                          className="text-[10px] bg-matte-black border border-slate-700 rounded px-1 py-0.5 text-slate-400"
                        >
                          {ALL_STATUS_OPTIONS.map((statusOption) => (
                            <option key={statusOption} value={statusOption}>{statusOption}</option>
                          ))}
                        </select>
                        <button
                          onClick={(e) => { e.stopPropagation(); setDeleteTaskId(task.id); }}
                          className="text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <h4 className="text-sm font-bold text-white mb-1 leading-tight">{task.title}</h4>
                    {task.description && (
                      <p className="text-xs text-slate-500 mb-3 line-clamp-2">{task.description}</p>
                    )}
                    <div className="flex flex-wrap gap-1 mb-3">
                      {task.category && (
                        <span className="px-2 py-0.5 bg-slate-800 text-slate-400 rounded text-[10px]">{task.category}</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                      <div className="flex items-center gap-1.5 text-xs text-slate-400">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{task.deadline ? new Date(task.deadline).toLocaleDateString() : 'No deadline'}</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
                {filteredTasks.filter((t) => t.status === column.id).length === 0 && (
                  <div className="p-4 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
                    No tasks
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* List View */}
      {!loading && view === 'list' && (
        <div className="bg-matte-black-light rounded-2xl border border-slate-800 shadow-2xl overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-matte-black border-b border-slate-800">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <input
                    type="checkbox"
                    checked={selectedTaskIds.length === filteredTasks.length && filteredTasks.length > 0}
                    onChange={(event) => {
                      if (event.target.checked) {
                        setSelectedTaskIds(filteredTasks.map((task) => task.id));
                      } else {
                        setSelectedTaskIds([]);
                      }
                    }}
                    className="text-gold"
                  />
                </th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Task Title</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Priority</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Deadline</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredTasks.map((task) => (
                <tr key={task.id} className="hover:bg-matte-black transition-colors cursor-pointer">
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedTaskIds.includes(task.id)}
                      onChange={(event) => {
                        event.stopPropagation();
                        toggleSelection(task.id);
                      }}
                      className="text-gold"
                    />
                  </td>
                  <td className="px-6 py-4" onClick={() => setSelectedTask(task)}>
                    <p className="text-sm font-bold text-white">{task.title}</p>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">{task.category || 'Uncategorized'}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider",
                      PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.Medium
                    )}>
                      {task.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "w-2 h-2 rounded-full",
                        task.status === 'Todo' || task.status === 'Created' ? 'bg-slate-400' :
                        task.status === 'Assigned' || task.status === 'Accepted' ? 'bg-blue-500' :
                        task.status === 'In Progress' ? 'bg-sky-500' :
                        task.status === 'Under Review' || task.status === 'Review' ? 'bg-amber-500' :
                        task.status === 'Escalated' ? 'bg-red-500' :
                        task.status === 'Reassigned' ? 'bg-violet-500' :
                        task.status === 'Completed' ? 'bg-emerald-500' :
                        task.status === 'Archived' ? 'bg-slate-500' : 'bg-slate-400'
                      )} />
                      <span className="text-xs font-medium text-slate-300">{task.status}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-slate-400 font-medium">
                      {task.deadline ? new Date(task.deadline).toLocaleDateString() : '-'}
                    </p>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => setDeleteTaskId(task.id)}
                      className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredTasks.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    No tasks found. Click "New Task" to create one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* New Task Modal */}
      <Modal
        isOpen={showNewTask}
        onClose={() => guardTaskModalClose(() => setShowNewTask(false))}
        title="Create New Task"
        size="lg"
      >
            <div className="space-y-4">
              <div>
                <label className="text-sm text-slate-400 mb-2 block">Task Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., GSTR-3B Filing - March 2026"
                  className="w-full p-3 rounded-xl bg-matte-black border border-slate-700 text-white"
                />
              </div>

              <div>
                <label className="text-sm text-slate-400 mb-2 block">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Task details..."
                  rows={3}
                  className="w-full p-3 rounded-xl bg-matte-black border border-slate-700 text-white resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-slate-400 mb-2 block">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as TaskPriority })}
                    className="w-full p-3 rounded-xl bg-matte-black border border-slate-700 text-white"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm text-slate-400 mb-2 block">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full p-3 rounded-xl bg-matte-black border border-slate-700 text-white"
                  >
                    <option value="">Select Category</option>
                    <option value="GST">GST</option>
                    <option value="Income Tax">Income Tax</option>
                    <option value="Audit">Audit</option>
                    <option value="ROC">ROC</option>
                    <option value="MCA">MCA</option>
                    <option value="TDS">TDS</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-slate-400 mb-2 block">Government Portal</label>
                  <select
                    value={formData.portalType}
                    onChange={(e) => {
                      const portal = GOVERNMENT_PORTALS.find((item) => item.type === e.target.value);
                      setFormData({
                        ...formData,
                        portalType: e.target.value,
                        portalWorkflowType: portal?.workflowTypes[0] || '',
                      });
                    }}
                    className="w-full p-3 rounded-xl bg-matte-black border border-slate-700 text-white"
                  >
                    <option value="">No portal link</option>
                    {GOVERNMENT_PORTALS.map((portal) => (
                      <option key={portal.type} value={portal.type}>{portal.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm text-slate-400 mb-2 block">Workflow Type</label>
                  <select
                    value={formData.portalWorkflowType}
                    onChange={(e) => setFormData({ ...formData, portalWorkflowType: e.target.value })}
                    className="w-full p-3 rounded-xl bg-matte-black border border-slate-700 text-white"
                    disabled={!formData.portalType}
                  >
                    <option value="">Select workflow</option>
                    {GOVERNMENT_PORTALS.find((portal) => portal.type === formData.portalType)?.workflowTypes.map((workflow) => (
                      <option key={workflow} value={workflow}>{workflow}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-slate-400 mb-2 block">Client</label>
                  <select
                    value={formData.clientId}
                    onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                    className="w-full p-3 rounded-xl bg-matte-black border border-slate-700 text-white"
                  >
                    <option value="">No Client</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm text-slate-400 mb-2 block">Assign To</label>
                  <RoleBasedAssignment
                    value={formData.assignedTo}
                    onChange={(userId) => setFormData({ ...formData, assignedTo: userId })}
                    firmId={user?.firmId || ''}
                    placeholder="Select assignee..."
                  />
                </div>
              </div>

              <div>
                <label className="text-sm text-slate-400 mb-2 block">Deadline</label>
                <input
                  type="date"
                  value={formData.deadline}
                  onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                  className="w-full p-3 rounded-xl bg-matte-black border border-slate-700 text-white"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => guardTaskModalClose(() => setShowNewTask(false))}
                  className="flex-1 p-3 rounded-xl bg-slate-800 text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateTask}
                  disabled={!formData.title.trim()}
                  className="flex-1 p-3 rounded-xl bg-gold text-matte-black font-bold disabled:opacity-50"
                >
                  Create Task
                </button>
              </div>
            </div>
      </Modal>

      <Modal
        isOpen={showBulkReassign}
        onClose={() => setShowBulkReassign(false)}
        title="Bulk Reassign Tasks"
        description="Reassign selected work items across the enterprise and capture the reason for audit."
        size="lg"
      >
            <div className="space-y-4">
              <div>
                <p className="text-sm text-slate-400 mb-2">Selected tasks</p>
                <div className="rounded-2xl bg-slate-900/70 p-4 text-sm text-slate-300">
                  {selectedCount} selected task{selectedCount === 1 ? '' : 's'}
                </div>
              </div>

              <div>
                <label className="text-sm text-slate-400 mb-2 block">Reassign To</label>
                <RoleBasedAssignment
                  value={bulkAssignee}
                  onChange={setBulkAssignee}
                  firmId={user?.firmId || ''}
                  placeholder="Choose assignee for selected tasks"
                />
              </div>

              <div>
                <label className="text-sm text-slate-400 mb-2 block">Reason for Reassignment</label>
                <textarea
                  value={bulkReason}
                  onChange={(e) => setBulkReason(e.target.value)}
                  rows={3}
                  className="w-full p-3 rounded-xl bg-matte-black border border-slate-700 text-white resize-none"
                  placeholder="Enter rationale for audit and governance"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowBulkReassign(false)}
                  className="flex-1 p-3 rounded-xl bg-slate-800 text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkReassignSubmit}
                  disabled={!bulkAssignee || selectedCount === 0}
                  className="flex-1 p-3 rounded-xl bg-gold text-matte-black font-bold disabled:opacity-50"
                >
                  Reassign Tasks
                </button>
              </div>
            </div>
      </Modal>

      {/* Delete Confirmation */}
      <Modal isOpen={!!deleteTaskId} onClose={() => setDeleteTaskId(null)} title="Delete Task" size="sm">
            <h3 className="text-xl font-bold text-white mb-3">Delete Task</h3>
            <p className="text-slate-400 mb-6">Are you sure you want to delete this task? This action cannot be undone.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTaskId(null)}
                className="flex-1 p-3 rounded-xl bg-slate-800 text-slate-300 font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteTask}
                className="flex-1 p-3 rounded-xl bg-red-600 text-white font-bold"
              >
                Delete
              </button>
            </div>
      </Modal>

      {/* Task Detail Drawer */}
      <TaskDetailDrawer
        task={selectedTask}
        isOpen={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        onTaskUpdated={loadTasks}
      />
    </div>
  );
};

const buildExecutionObjectives = (tasks: TaskRow[], queue: AITaskQueueItem[]): ExecutionObjective[] => {
  const openTasks = tasks.filter((task) => task.status !== 'Completed');
  const overdue = openTasks.filter((task) => task.deadline && new Date(task.deadline) < new Date()).length;
  const highRiskQueue = queue.filter((item) => item.slaBreachProbability >= 70).length;
  const escalations = openTasks.filter((task) => task.status === 'Escalated').length;

  return [
    {
      id: 'sla-stabilization',
      name: 'SLA Stabilization',
      target: 95,
      current: Math.max(0, 100 - overdue * 6 - highRiskQueue * 3),
      weight: 0.45,
    },
    {
      id: 'escalation-reduction',
      name: 'Escalation Reduction',
      target: 92,
      current: Math.max(0, 100 - escalations * 14),
      weight: 0.35,
    },
    {
      id: 'workflow-flow-efficiency',
      name: 'Workflow Flow Efficiency',
      target: 90,
      current: Math.max(0, 100 - Math.max(0, openTasks.length - 25) * 2),
      weight: 0.2,
    },
  ];
};
