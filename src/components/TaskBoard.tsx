/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  User, 
  Calendar,
  Layers,
  LayoutGrid,
  List
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

const MOCK_TASKS = [
  { id: '1', title: 'GSTR-3B Filing - Mar 2026', client: 'Reliance Industries Ltd', priority: 'Urgent', deadline: 'Today', status: 'Todo', assignedTo: 'CA Rahul', category: 'GST' },
  { id: '2', title: 'TDS Payment - Tata Motors', client: 'Tata Motors Ltd', priority: 'High', deadline: 'Tomorrow', status: 'In Progress', assignedTo: 'CA Priya', category: 'Income Tax' },
  { id: '3', title: 'Statutory Audit - HDFC Bank', client: 'HDFC Bank', priority: 'Medium', deadline: '25 Mar', status: 'Review', assignedTo: 'CA Amit', category: 'Audit' },
  { id: '4', title: 'ROC AOC-4 Filing - Infosys', client: 'Infosys Ltd', priority: 'Low', deadline: '30 Mar', status: 'Todo', assignedTo: 'CA Rahul', category: 'ROC' },
  { id: '5', title: 'GSTR-1 Filing - Zomato Ltd', client: 'Zomato Ltd', priority: 'Urgent', deadline: 'Today', status: 'In Progress', assignedTo: 'CA Priya', category: 'GST' },
  { id: '6', title: 'Income Tax Return - Individual', client: 'Mukesh Ambani', priority: 'High', deadline: '31 Jul', status: 'Todo', assignedTo: 'CA Amit', category: 'Income Tax' },
];

const COLUMNS = [
  { id: 'Todo', label: 'To Do', color: 'bg-slate-100 text-slate-600' },
  { id: 'In Progress', label: 'In Progress', color: 'bg-blue-100 text-blue-600' },
  { id: 'Review', label: 'Review', color: 'bg-amber-100 text-amber-600' },
  { id: 'Completed', label: 'Completed', color: 'bg-emerald-100 text-emerald-600' },
];

export const TaskBoard: React.FC = () => {
  const [view, setView] = useState<'board' | 'list'>('board');

  return (
    <div className="p-8 space-y-6 h-full bg-slate-50 overflow-y-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Tasks & Workflows</h2>
          <p className="text-slate-500">Assign tasks, track progress, and manage recurring workflows.</p>
        </div>
        <div className="flex gap-3">
          <div className="flex bg-white border border-slate-200 rounded-lg p-1">
            <button 
              onClick={() => setView('board')}
              className={cn(
                "p-1.5 rounded-md transition-all",
                view === 'board' ? "bg-slate-100 text-slate-900" : "text-slate-400 hover:text-slate-600"
              )}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setView('list')}
              className={cn(
                "p-1.5 rounded-md transition-all",
                view === 'list' ? "bg-slate-100 text-slate-900" : "text-slate-400 hover:text-slate-600"
              )}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm font-medium hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/20">
            <Plus className="w-4 h-4" />
            New Task
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search tasks, clients, or team members..." 
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
          />
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
            <Filter className="w-4 h-4" />
            Filter
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
            <Layers className="w-4 h-4" />
            Automation
          </button>
        </div>
      </div>

      {view === 'board' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 h-[calc(100%-180px)]">
          {COLUMNS.map((column) => (
            <div key={column.id} className="flex flex-col gap-4">
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-2">
                  <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider", column.color)}>
                    {column.label}
                  </span>
                  <span className="text-xs text-slate-400 font-bold">
                    {MOCK_TASKS.filter(t => t.status === column.id).length}
                  </span>
                </div>
                <button className="text-slate-400 hover:text-slate-600">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 space-y-4 overflow-y-auto pb-4 custom-scrollbar">
                {MOCK_TASKS.filter(t => t.status === column.id).map((task) => (
                  <motion.div 
                    key={task.id}
                    layoutId={task.id}
                    className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className={cn(
                        "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
                        task.priority === 'Urgent' ? 'bg-red-500/10 text-red-500' : 
                        task.priority === 'High' ? 'bg-amber-500/10 text-amber-500' : 'bg-blue-500/10 text-blue-500'
                      )}>
                        {task.priority}
                      </span>
                      <button className="text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 mb-1 leading-tight">{task.title}</h4>
                    <p className="text-xs text-slate-500 mb-4">{task.client}</p>
                    <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                      <div className="flex items-center gap-1.5 text-xs text-slate-400">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{task.deadline}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-600 border border-white">
                          {task.assignedTo.split(' ')[1].charAt(0)}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-bottom border-slate-200">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Task Title</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Client</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Priority</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Deadline</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Assigned To</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {MOCK_TASKS.map((task) => (
                <tr key={task.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="text-sm font-bold text-slate-900">{task.title}</p>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">{task.category}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-slate-600">{task.client}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider",
                      task.priority === 'Urgent' ? 'bg-red-500/10 text-red-500' : 
                      task.priority === 'High' ? 'bg-amber-500/10 text-amber-500' : 'bg-blue-500/10 text-blue-500'
                    )}>
                      {task.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "w-2 h-2 rounded-full",
                        task.status === 'Todo' ? 'bg-slate-400' : 
                        task.status === 'In Progress' ? 'bg-blue-500' : 
                        task.status === 'Review' ? 'bg-amber-500' : 'bg-emerald-500'
                      )} />
                      <span className="text-xs font-medium text-slate-600">{task.status}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-slate-600 font-medium">{task.deadline}</p>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <span className="text-xs text-slate-600 font-medium">{task.assignedTo}</span>
                      <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-600">
                        {task.assignedTo.split(' ')[1].charAt(0)}
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
