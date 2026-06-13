/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { X, Search, Download } from 'lucide-react';
import { FirmRow } from './FirmOperationsPanel';
import { SubscriptionRow } from './SubscriptionManagementPanel';
import { formatTenantDisplayId } from '../../lib/tenantIdentity';

type DrilldownType = 'active' | 'suspended' | 'pending' | 'revenue';

interface DrilldownModalsProps {
  isOpen: boolean;
  drilldownType: DrilldownType;
  title: string;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onClose: () => void;
  onExportCSV: () => void;
  onReactivate?: (firm: FirmRow) => void;
  onApprove?: (subscription: SubscriptionRow) => void;
  firms: FirmRow[];
  subscriptions: SubscriptionRow[];
}

export const DrilldownModals: React.FC<DrilldownModalsProps> = ({
  isOpen,
  drilldownType,
  title,
  searchQuery,
  onSearchChange,
  onClose,
  onExportCSV,
  onReactivate,
  onApprove,
  firms,
  subscriptions,
}) => {
  if (!isOpen) return null;

  const recordCount = (() => {
    switch (drilldownType) {
      case 'active':
        return firms.filter(f => f.status === 'Active').length;
      case 'suspended':
        return firms.filter(f => f.status === 'Suspended').length;
      case 'pending':
        return subscriptions.filter(s => s.status === 'Pending').length;
      case 'revenue':
        return subscriptions.filter(s => s.status === 'Active').length;
    }
  })();

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-matte-black-light border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">{title}</h2>
            <p className="text-sm text-slate-500 mt-1">{recordCount} records</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Search & Export Bar */}
        <div className="p-4 border-b border-slate-800 flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search by display tenant ID..."
              className="w-full pl-10 pr-4 py-2 bg-matte-black border border-slate-800 rounded-xl text-sm text-white placeholder-slate-600 focus:ring-1 focus:ring-gold outline-none"
            />
          </div>
          <button
            onClick={onExportCSV}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-sm font-bold text-slate-300 flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {drilldownType === 'active' && (
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left text-xs font-bold text-slate-500 uppercase tracking-wider pb-3">Tenant</th>
                  <th className="text-left text-xs font-bold text-slate-500 uppercase tracking-wider pb-3">Status</th>
                  <th className="text-left text-xs font-bold text-slate-500 uppercase tracking-wider pb-3">Subscription</th>
                  <th className="text-left text-xs font-bold text-slate-500 uppercase tracking-wider pb-3">Revenue</th>
                  <th className="text-left text-xs font-bold text-slate-500 uppercase tracking-wider pb-3">Joined</th>
                </tr>
              </thead>
              <tbody>
                {firms.filter(f => f.status === 'Active').filter(f => !searchQuery || formatTenantDisplayId(f.id).toLowerCase().includes(searchQuery.toLowerCase())).map(firm => {
                  const sub = subscriptions.find(s => s.firm_id === firm.id);
                  return (
                    <tr key={firm.id} className="border-b border-slate-800/50 hover:bg-matte-black">
                      <td className="py-4 text-sm font-bold text-white whitespace-nowrap">{formatTenantDisplayId(firm.id)}</td>
                      <td className="py-4"><span className="px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-bold uppercase">Active</span></td>
                      <td className="py-4 text-sm text-slate-400">{sub?.plan || '-'}</td>
                      <td className="py-4 text-sm text-slate-400">Rs {Number(sub?.amount || 0).toLocaleString()}</td>
                      <td className="py-4 text-sm text-slate-500">{firm.created_at ? new Date(firm.created_at).toLocaleDateString() : '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {drilldownType === 'suspended' && (
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left text-xs font-bold text-slate-500 uppercase tracking-wider pb-3">Tenant</th>
                  <th className="text-left text-xs font-bold text-slate-500 uppercase tracking-wider pb-3">Status</th>
                  <th className="text-left text-xs font-bold text-slate-500 uppercase tracking-wider pb-3">Plan</th>
                  <th className="text-left text-xs font-bold text-slate-500 uppercase tracking-wider pb-3">Suspended On</th>
                  <th className="text-left text-xs font-bold text-slate-500 uppercase tracking-wider pb-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {firms.filter(f => f.status === 'Suspended').filter(f => !searchQuery || formatTenantDisplayId(f.id).toLowerCase().includes(searchQuery.toLowerCase())).map(firm => (
                  <tr key={firm.id} className="border-b border-slate-800/50 hover:bg-matte-black">
                    <td className="py-4 text-sm font-bold text-white whitespace-nowrap">{formatTenantDisplayId(firm.id)}</td>
                    <td className="py-4"><span className="px-2 py-1 rounded-lg bg-red-500/10 text-red-400 text-xs font-bold uppercase">Suspended</span></td>
                    <td className="py-4 text-sm text-slate-400">{subscriptions.find(s => s.firm_id === firm.id)?.plan || '-'}</td>
                    <td className="py-4 text-sm text-slate-500">{firm.updated_at ? new Date(firm.updated_at).toLocaleDateString() : '-'}</td>
                    <td className="py-4">
                      <button
                        onClick={() => onReactivate?.(firm)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold"
                      >
                        Reactivate
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {drilldownType === 'pending' && (
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left text-xs font-bold text-slate-500 uppercase tracking-wider pb-3">Firm</th>
                  <th className="text-left text-xs font-bold text-slate-500 uppercase tracking-wider pb-3">Plan</th>
                  <th className="text-left text-xs font-bold text-slate-500 uppercase tracking-wider pb-3">Amount</th>
                  <th className="text-left text-xs font-bold text-slate-500 uppercase tracking-wider pb-3">Submitted</th>
                  <th className="text-left text-xs font-bold text-slate-500 uppercase tracking-wider pb-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {subscriptions.filter(s => s.status === 'Pending').filter(s => !searchQuery || formatTenantDisplayId(s.firm_id).toLowerCase().includes(searchQuery.toLowerCase())).map(sub => (
                  <tr key={sub.id} className="border-b border-slate-800/50 hover:bg-matte-black">
                    <td className="py-4 text-sm font-bold text-white whitespace-nowrap">{formatTenantDisplayId(sub.firm_id)}</td>
                    <td className="py-4 text-sm text-slate-400">{sub.plan}</td>
                    <td className="py-4 text-sm text-slate-400">Rs {Number(sub.amount || 0).toLocaleString()}</td>
                    <td className="py-4 text-sm text-slate-500">{sub.created_at ? new Date(sub.created_at).toLocaleDateString() : '-'}</td>
                    <td className="py-4">
                      <button
                        onClick={() => onApprove?.(sub)}
                        className="px-3 py-1.5 bg-gold text-matte-black hover:bg-gold/90 rounded-lg text-xs font-bold"
                      >
                        Approve
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {drilldownType === 'revenue' && (
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                {['Starter', 'Professional', 'Enterprise'].map(plan => {
                  const planSubs = subscriptions.filter(s => s.status === 'Active' && s.plan === plan);
                  const planRevenue = planSubs.reduce((sum, s) => sum + Number(s.amount || 0), 0);
                  return (
                    <div key={plan} className="p-4 bg-matte-black border border-slate-800 rounded-xl">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{plan}</p>
                      <p className="text-2xl font-bold text-white mt-2">Rs {planRevenue.toLocaleString()}</p>
                      <p className="text-xs text-slate-500 mt-1">{planSubs.length} subscribers</p>
                    </div>
                  );
                })}
              </div>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-800">
                    <th className="text-left text-xs font-bold text-slate-500 uppercase tracking-wider pb-3">Firm</th>
                    <th className="text-left text-xs font-bold text-slate-500 uppercase tracking-wider pb-3">Plan</th>
                    <th className="text-left text-xs font-bold text-slate-500 uppercase tracking-wider pb-3">Monthly Value</th>
                    <th className="text-left text-xs font-bold text-slate-500 uppercase tracking-wider pb-3">Annual Run Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {subscriptions.filter(s => s.status === 'Active').filter(s => !searchQuery || formatTenantDisplayId(s.firm_id).toLowerCase().includes(searchQuery.toLowerCase())).map(sub => (
                    <tr key={sub.id} className="border-b border-slate-800/50 hover:bg-matte-black">
                      <td className="py-4 text-sm font-bold text-white whitespace-nowrap">{formatTenantDisplayId(sub.firm_id)}</td>
                      <td className="py-4"><span className="px-2 py-1 rounded-lg bg-gold/10 text-gold text-xs font-bold uppercase">{sub.plan}</span></td>
                      <td className="py-4 text-sm text-slate-400">Rs {Number(sub.amount || 0).toLocaleString()}</td>
                      <td className="py-4 text-sm text-slate-400">Rs {(Number(sub.amount || 0) * 12).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 flex justify-between text-sm text-slate-500">
          <span>Total: {recordCount} records</span>
          <span>Live data as of {new Date().toLocaleTimeString()}</span>
        </div>
      </div>
    </div>
  );
};
