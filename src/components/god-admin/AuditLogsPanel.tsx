/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

export interface AuditRow {
  id: string;
  firm_id: string | null;
  user_name: string;
  user_role: string;
  action: string;
  entity_type: string;
  details: string;
  created_at: string;
}

interface AuditLogsPanelProps {
  auditLogs: AuditRow[];
}

export const AuditLogsPanel: React.FC<AuditLogsPanelProps> = ({ auditLogs }) => (
  <div className="space-y-4">
    {auditLogs.map((log) => (
      <div key={log.id} className="p-5 bg-matte-black-light rounded-2xl border border-slate-800">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-white">{log.action}</p>
            <p className="text-xs text-slate-500 mt-1">{log.details}</p>
          </div>
          <span className="text-[10px] text-gold font-bold uppercase tracking-wider">{log.user_role}</span>
        </div>
        <p className="text-[10px] text-slate-600 mt-3">{new Date(log.created_at).toLocaleString()} | {log.entity_type}</p>
      </div>
    ))}
  </div>
);
