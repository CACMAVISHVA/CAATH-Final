/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { cn } from '../../lib/utils';
import { formatTenantDisplayId } from '../../lib/tenantIdentity';

export interface SubscriptionRow {
  id: string;
  firm_id: string;
  plan: string;
  status: string;
  amount: number;
  starts_at: string | null;
  expires_at: string | null;
  created_at?: string | null;
}

interface SubscriptionManagementPanelProps {
  subscriptions: SubscriptionRow[];
  busyAction: string | null;
  onApprove: (subscription: SubscriptionRow) => void;
  onMarkPaid: (subscription: SubscriptionRow) => void;
  onPause: (subscription: SubscriptionRow) => void;
  onResume: (subscription: SubscriptionRow) => void;
  onReactivate: (subscription: SubscriptionRow) => void;
  onSuspend: (subscription: SubscriptionRow) => void;
}

export const SubscriptionManagementPanel: React.FC<SubscriptionManagementPanelProps> = ({
  subscriptions,
  busyAction,
  onApprove,
  onMarkPaid,
  onPause,
  onResume,
  onReactivate,
  onSuspend,
}) => (
  <div className="bg-matte-black-light rounded-2xl border border-slate-800 overflow-hidden">
    <table className="w-full text-left">
      <thead className="bg-matte-black border-b border-slate-800">
        <tr>
          {['Firm', 'Plan', 'Amount', 'Status', 'Expiry', 'Action'].map((head) => (
            <th key={head} className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">{head}</th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-800">
        {subscriptions.map((subscription) => (
          <tr key={subscription.id} className="hover:bg-matte-black">
            <td className="px-6 py-4">
              <p className="text-sm font-bold text-white whitespace-nowrap">{formatTenantDisplayId(subscription.firm_id)}</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">Tenant ID</p>
            </td>
            <td className="px-6 py-4 text-sm text-slate-400">{subscription.plan}</td>
            <td className="px-6 py-4 text-sm text-slate-400">Rs {Number(subscription.amount || 0).toLocaleString()}</td>
            <td className="px-6 py-4">
              <span className={cn(
                'px-2 py-1 rounded-lg border text-[10px] font-bold uppercase tracking-wider',
                subscription.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-300 border-amber-500/20'
              )}>
                {subscription.status}
              </span>
            </td>
            <td className="px-6 py-4 text-sm text-slate-400">{subscription.expires_at ? new Date(subscription.expires_at).toLocaleDateString() : '-'}</td>
            <td className="px-6 py-4">
              <div className="flex items-center gap-2">
                {subscription.status === 'Pending' && (
                  <>
                    <button
                      onClick={() => onApprove(subscription)}
                      disabled={busyAction === `subscription-${subscription.id}`}
                      className="px-3 py-1.5 bg-gold text-matte-black rounded-lg text-xs font-bold hover:bg-gold/90 disabled:opacity-40"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => onMarkPaid(subscription)}
                      disabled={busyAction === `payment-${subscription.id}`}
                      className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 disabled:opacity-40"
                    >
                      Mark Paid
                    </button>
                  </>
                )}
                {subscription.status === 'Active' && (
                  <>
                    <button
                      onClick={() => onPause(subscription)}
                      disabled={busyAction === `pause-${subscription.id}`}
                      className="px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-bold hover:bg-amber-700 disabled:opacity-40"
                    >
                      Pause
                    </button>
                    <button
                      onClick={() => onSuspend(subscription)}
                      disabled={busyAction === `suspend-${subscription.id}`}
                      className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 disabled:opacity-40"
                    >
                      Suspend
                    </button>
                  </>
                )}
                {subscription.status === 'Paused' && (
                  <button
                    onClick={() => onResume(subscription)}
                    disabled={busyAction === `resume-${subscription.id}`}
                    className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 disabled:opacity-40"
                  >
                    Resume
                  </button>
                )}
                {(subscription.status === 'Suspended' || subscription.status === 'Cancelled') && (
                  <button
                    onClick={() => onReactivate(subscription)}
                    disabled={busyAction === `reactivate-${subscription.id}`}
                    className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 disabled:opacity-40"
                  >
                    Reactivate
                  </button>
                )}
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);
