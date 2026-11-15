import React, { useEffect, useState } from 'react';
import { Activity } from 'lucide-react';
import { FirmErrorSummaryRow, getFirmErrorSummary, isMonitoringUnavailable } from '../services/errorMonitoringService';

/**
 * Workspace administrators see the technical issues that affected their own organisation:
 * a plain description, status and reference only. Stack traces and other organisations'
 * reports are never returned by the database function behind this list.
 */
export const WorkspaceIssuesPanel: React.FC = () => {
  const [rows, setRows] = useState<FirmErrorSummaryRow[] | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'hidden' | 'failed'>('loading');

  useEffect(() => {
    let live = true;
    getFirmErrorSummary()
      .then((data) => { if (live) { setRows(data); setState('ready'); } })
      .catch((error) => { if (live) setState(isMonitoringUnavailable(error) ? 'hidden' : 'failed'); });
    return () => { live = false; };
  }, []);

  if (state === 'hidden') return null;
  return (
    <section aria-labelledby="workspace-issues-heading" className="border border-slate-800 bg-matte-black-light p-5">
      <div className="flex items-start gap-3">
        <Activity className="mt-0.5 h-5 w-5 shrink-0 text-gold" />
        <div>
          <h3 id="workspace-issues-heading" className="font-bold text-white">Technical issues in your workspace</h3>
          <p className="mt-1 text-sm text-slate-400">Problems CAATH detected automatically in the last 30 days. The CAATH team already has the technical details — quote the reference if you contact support.</p>
        </div>
      </div>
      {state === 'loading' && <div className="mt-4 h-10 animate-pulse bg-white/[0.05]" />}
      {state === 'failed' && <p className="mt-4 text-sm text-slate-500">The issue list could not be loaded right now.</p>}
      {state === 'ready' && rows?.length === 0 && <p className="mt-4 text-sm text-slate-500">No technical issues were detected in your workspace.</p>}
      {state === 'ready' && rows && rows.length > 0 && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[36rem] text-left text-sm">
            <thead className="text-[11px] uppercase tracking-wider text-slate-500">
              <tr><th className="py-2 pr-3 font-semibold">Reference</th><th className="py-2 pr-3 font-semibold">Issue</th><th className="py-2 pr-3 font-semibold">Area</th><th className="py-2 pr-3 font-semibold">Status</th><th className="py-2 font-semibold">Last seen</th></tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.reference} className="border-t border-slate-800">
                  <td className="py-2 pr-3 font-mono text-xs text-slate-300">{row.reference}</td>
                  <td className="max-w-[20rem] truncate py-2 pr-3 text-slate-200" title={row.message}>{row.message}</td>
                  <td className="py-2 pr-3 capitalize text-slate-400">{row.module.replace(/[-_]/g, ' ')}</td>
                  <td className="py-2 pr-3 text-slate-300">{row.status === 'New' ? 'Reported' : row.status === 'Investigating' ? 'Being investigated' : row.status}</td>
                  <td className="whitespace-nowrap py-2 text-slate-400">{new Date(row.last_seen_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};
