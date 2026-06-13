import React from 'react';
import { AlertCircle, ArrowUpDown, ClipboardCheck, Clock } from 'lucide-react';

interface ComplianceSummaryCardsProps {
  total: number;
  pending: number;
  late: number;
  completionRate: number;
  latePenalty: string;
  onOpen: (view: 'total' | 'pending' | 'late') => void;
}

export const ComplianceSummaryCards: React.FC<ComplianceSummaryCardsProps> = ({
  total,
  pending,
  late,
  completionRate,
  latePenalty,
  onOpen,
}) => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
    <button onClick={() => onOpen('total')} className="p-4 bg-matte-black-light border border-slate-800 hover:border-gold/50 transition-all text-left group">
      <div className="flex items-start justify-between mb-3"><div className="p-2 bg-blue-500/10"><ClipboardCheck className="w-4 h-4 text-blue-400" /></div><ArrowUpDown className="w-4 h-4 text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" /></div>
      <p className="text-xs text-slate-500 font-bold uppercase mb-1">Total Filings</p><h3 className="text-xl font-bold text-white">{total}</h3><p className="text-xs text-emerald-400 mt-1">{completionRate}% completion rate</p>
    </button>
    <button onClick={() => onOpen('pending')} className="p-4 bg-matte-black-light border border-slate-800 hover:border-gold/50 transition-all text-left group">
      <div className="flex items-start justify-between mb-3"><div className="p-2 bg-amber-500/10"><Clock className="w-4 h-4 text-amber-400" /></div><ArrowUpDown className="w-4 h-4 text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" /></div>
      <p className="text-xs text-slate-500 font-bold uppercase mb-1">Pending Filings</p><h3 className="text-xl font-bold text-white">{pending}</h3><p className="text-xs text-slate-500 mt-1">In progress or awaiting</p>
    </button>
    <button onClick={() => onOpen('late')} className="p-4 bg-matte-black-light border border-slate-800 hover:border-gold/50 transition-all text-left group">
      <div className="flex items-start justify-between mb-3"><div className="p-2 bg-red-500/10"><AlertCircle className="w-4 h-4 text-red-400" /></div><ArrowUpDown className="w-4 h-4 text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" /></div>
      <p className="text-xs text-slate-500 font-bold uppercase mb-1">Late Filings</p><h3 className="text-xl font-bold text-white">{late}</h3><p className="text-xs text-red-400 mt-1">Penalty: {latePenalty}</p>
    </button>
  </div>
);
