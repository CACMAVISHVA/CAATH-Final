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
              ? `Are you sure you want to suspend ${firm?.name}? This will immediately block their access.`
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
            disabled={isLoading}
            className={cn(
              'flex-1 p-3 rounded-xl font-bold disabled:opacity-50',
              action === 'suspend' ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            )}
          >
            {action === 'suspend' ? 'Suspend' : 'Reactivate'}
          </button>
        </div>
      </div>
    </div>
  );
};
