import React from 'react';

interface TaskWorkloadAnalyticsProps {
  total: number;
  overdue: number;
  escalated: number;
  completed: number;
}

export const TaskWorkloadAnalytics: React.FC<TaskWorkloadAnalyticsProps> = ({ total, overdue, escalated, completed }) => (
  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
    <div className="p-3 bg-matte-black-light border border-slate-800 rounded-xl">
      <p className="text-[10px] text-slate-500 uppercase tracking-wider">Total</p>
      <p className="text-lg font-bold text-white">{total}</p>
    </div>
    <div className="p-3 bg-matte-black-light border border-slate-800 rounded-xl">
      <p className="text-[10px] text-slate-500 uppercase tracking-wider">Overdue</p>
      <p className="text-lg font-bold text-red-400">{overdue}</p>
    </div>
    <div className="p-3 bg-matte-black-light border border-slate-800 rounded-xl">
      <p className="text-[10px] text-slate-500 uppercase tracking-wider">Escalated</p>
      <p className="text-lg font-bold text-amber-400">{escalated}</p>
    </div>
    <div className="p-3 bg-matte-black-light border border-slate-800 rounded-xl">
      <p className="text-[10px] text-slate-500 uppercase tracking-wider">Completed</p>
      <p className="text-lg font-bold text-emerald-400">{completed}</p>
    </div>
  </div>
);
