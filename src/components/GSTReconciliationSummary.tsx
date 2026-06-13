import React, { useEffect, useState } from 'react';
import { FileCheck2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getReconciliationSummary } from '../services/gstReconciliationService';

export const GSTReconciliationSummary: React.FC<{ period?: string }> = ({ period }) => {
  const { user } = useAuth();
  const [summary, setSummary] = useState<any | null>(null);

  useEffect(() => {
    if (!user?.firmId || !user?.assignedClients || user.assignedClients.length === 0) return;
    const clientId = user.assignedClients[0];
    const p = period || new Date().toISOString().slice(0,7);
    getReconciliationSummary(clientId, p).then((r) => setSummary(r?.summary || null)).catch(console.error);
  }, [user?.firmId, user?.assignedClients, period]);

  if (!summary) return null;

  const riskLabel = summary.noticeRiskCategory || 'Low';
  const riskTone = riskLabel === 'High' ? 'text-red-400' : riskLabel === 'Medium' ? 'text-amber-400' : 'text-emerald-400';

  return (
    <div className="p-5 bg-matte-black-light rounded-2xl border border-slate-800">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gold/10 border border-gold/20 flex items-center justify-center text-gold">
            <FileCheck2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm text-slate-500">GST Reconciliation Intelligence</p>
            <h3 className="text-lg font-bold text-white">{summary.period} • {summary.clientId}</h3>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm text-slate-500">Mismatch Risk</p>
          <p className={`text-2xl font-bold ${riskTone}`}>{riskLabel}</p>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 mb-4">
        <div className="rounded-2xl bg-slate-900/70 border border-slate-800 p-4 min-w-0">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Health Score</p>
          <p className="mt-2 text-2xl font-bold text-white">{summary.reconciliationHealthScore ?? 100}</p>
          <p className="text-xs text-slate-400 mt-1">Higher score means stronger filing and reconciliation health.</p>
        </div>
        <div className="rounded-2xl bg-slate-900/70 border border-slate-800 p-4 min-w-0">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Filing Consistency</p>
          <p className="mt-2 text-2xl font-bold text-white">{summary.filingConsistencyScore ?? 100}%</p>
          <p className="text-xs text-slate-400 mt-1">Outward vs GSTR-3B and invoice consistency.</p>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 mb-4">
        <div className="text-sm text-slate-400">Outward ₹{Number(summary.totalOutward || 0).toLocaleString()}</div>
        <div className="text-sm text-slate-400">Outward Tax ₹{Number(summary.totalOutwardTax || 0).toLocaleString()}</div>
        <div className="text-sm text-slate-400">Inward ₹{Number(summary.totalInward || 0).toLocaleString()}</div>
        <div className="text-sm text-slate-400">Inward Tax ₹{Number(summary.totalInwardTax || 0).toLocaleString()}</div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="text-sm text-slate-400">Outward Liability Variance ₹{Number(summary.outwardLiabilityVariance || 0).toLocaleString()}</div>
        <div className="text-sm text-slate-400">High Severity Mismatches {summary.mismatchSeverity?.high ?? 0}</div>
        <div className="text-sm text-slate-400">Medium Severity Mismatches {summary.mismatchSeverity?.medium ?? 0}</div>
        <div className="text-sm text-slate-400">Low Severity Mismatches {summary.mismatchSeverity?.low ?? 0}</div>
      </div>
    </div>
  );
};

export default GSTReconciliationSummary;
