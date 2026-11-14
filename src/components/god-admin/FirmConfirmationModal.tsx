/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { FirmRow } from './FirmOperationsPanel';

interface FirmConfirmationModalProps {
  isOpen: boolean;
  firm: FirmRow | null;
  action: 'suspend' | 'reactivate';
  reason: string;
  onReasonChange: (reason: string) => void;
  immediate: boolean;
  onImmediateChange: (immediate: boolean) => void;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading: boolean;
}

export const FirmConfirmationModal: React.FC<FirmConfirmationModalProps> = ({
  isOpen,
  firm,
  action,
  reason,
  onReasonChange,
  immediate,
  onImmediateChange,
  onConfirm,
  onCancel,
  isLoading,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onCancel}>
      <div className="bg-matte-black-light border border-slate-800 rounded-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-slate-800">
          <h2 className="text-xl font-bold text-white">
            {action === 'suspend' ? 'Suspend Firm' : 'Reactivate Firm'}
          </h2>
          <p className="text-slate-400 mt-1">
            {action === 'suspend'
              ? `Suspend ${firm?.name}? Normal suspension gives 30 days to finish work and export records. No data is deleted.`
              : `Are you sure you want to reactivate ${firm?.name}?`}
          </p>
        </div>
        <div className="p-6 space-y-4">
          {action === 'suspend' && (
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Suspension Reason
              </label>
              <textarea
                value={reason}
                onChange={(e) => onReasonChange(e.target.value)}
                placeholder="Enter reason for suspension..."
                rows={3}
                className="w-full p-3 bg-matte-black border border-slate-800 rounded-xl text-slate-300 placeholder-slate-600 focus:ring-1 focus:ring-gold outline-none resize-none"
              />
              <label className="mt-4 flex items-start gap-3 border border-red-500/20 bg-red-500/5 p-3 text-sm text-slate-300">
                <input type="checkbox" checked={immediate} onChange={(event) => onImmediateChange(event.target.checked)} className="mt-1" />
                <span><strong className="block text-red-300">Immediate security suspension</strong>Use only for fraud, account compromise or serious misuse. Access will be blocked immediately.</span>
              </label>
              {!immediate && <p className="mt-3 text-xs text-amber-200">Grace period: full workspace access continues for 30 days, then access is blocked. Stored data is retained.</p>}
            </div>
          )}
        </div>
        <div className="p-6 border-t border-slate-800 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 p-3 rounded-xl bg-slate-800 text-slate-300 font-bold"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading || (action === 'suspend' && reason.trim().length < 10)}
            className={cn(
              'flex-1 p-3 rounded-xl font-bold disabled:opacity-50',
              action === 'suspend' ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            )}
          >
            {action === 'suspend' ? (immediate ? 'Suspend Now' : 'Start 30-Day Grace') : 'Reactivate'}
          </button>
        </div>
      </div>
    </div>
  );
};
