/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { formatINR } from '../../lib/clientProfileFormatters';

interface ClientStats {
  totalBilled?: number;
  pendingPayments?: number;
  overdueAmount?: number;
}

interface ClientProfileBillingTabProps {
  stats: ClientStats | null;
}

/**
 * Displays billing statistics and history for a client
 */
export const ClientProfileBillingTab: React.FC<ClientProfileBillingTabProps> = ({
  stats,
}) => {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 bg-matte-black rounded-lg border border-slate-800">
          <p className="text-xs text-slate-500 mb-1">Total Billed</p>
          <p className="text-lg font-bold text-emerald-400">
            {formatINR(stats?.totalBilled || 0)}
          </p>
        </div>
        <div className="p-4 bg-matte-black rounded-lg border border-slate-800">
          <p className="text-xs text-slate-500 mb-1">Pending</p>
          <p className="text-lg font-bold text-amber-400">
            {formatINR(stats?.pendingPayments || 0)}
          </p>
        </div>
        <div className="p-4 bg-matte-black rounded-lg border border-slate-800">
          <p className="text-xs text-slate-500 mb-1">Overdue</p>
          <p className="text-lg font-bold text-red-400">
            {formatINR(stats?.overdueAmount || 0)}
          </p>
        </div>
      </div>
      <div className="text-center py-8 text-slate-500 text-sm">
        Billing history would be loaded from the billing service
      </div>
    </div>
  );
};
