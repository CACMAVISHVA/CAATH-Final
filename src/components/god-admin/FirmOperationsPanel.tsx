/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { cn } from '../../lib/utils';
import { formatTenantDisplayId } from '../../lib/tenantIdentity';

export interface FirmRow {
  id: string;
  name?: string;
  status: string;
  created_at: string;
  updated_at?: string | null;
}

interface FirmOperationsPanelProps {
  firms: FirmRow[];
  busyAction: string | null;
  onSuspendClick: (firm: FirmRow, action: 'suspend' | 'reactivate') => void;
}

export const FirmOperationsPanel: React.FC<FirmOperationsPanelProps> = ({
  firms,
  busyAction,
  onSuspendClick,
}) => (
  <div className="bg-matte-black-light rounded-2xl border border-slate-800 overflow-hidden">
    <table className="w-full text-left">
      <thead className="bg-matte-black border-b border-slate-800">
        <tr>
          {['Firm', 'Status', 'Created', 'Action'].map((head) => (
            <th key={head} className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">{head}</th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-800">
        {firms.map((firm) => (
          <tr key={firm.id} className="hover:bg-matte-black">
            <td className="px-6 py-4">
              <p className="text-sm font-bold text-white">{firm.name || 'Tenant Workspace'}</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider whitespace-nowrap">Tenant ID: {formatTenantDisplayId(firm.id)}</p>
            </td>
            <td className="px-6 py-4">
              <span className={cn(
                'px-2 py-1 rounded-lg border text-[10px] font-bold uppercase tracking-wider',
                firm.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'
              )}>
                {firm.status}
              </span>
            </td>
            <td className="px-6 py-4 text-sm text-slate-400">{new Date(firm.created_at).toLocaleDateString()}</td>
            <td className="px-6 py-4">
              <button
                onClick={() => onSuspendClick(firm, firm.status === 'Suspended' ? 'reactivate' : 'suspend')}
                disabled={busyAction === `firm-${firm.id}`}
                className={cn(
                  'px-4 py-2 rounded-xl border text-xs font-bold transition-all disabled:opacity-50',
                  firm.status === 'Suspended'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : 'bg-red-500/10 text-red-400 border-red-500/20'
                )}
              >
                {firm.status === 'Suspended' ? 'Reactivate' : 'Suspend'}
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);
