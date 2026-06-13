/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { X, Building2, Edit3 } from 'lucide-react';
import { ClientRow } from '../../services/clientService';
import { ClientProfileStats } from './ClientProfileStats';

interface ClientProfileHeaderProps {
  client: ClientRow;
  stats: any;
  healthScore: number;
  onClose: () => void;
}

export const ClientProfileHeader: React.FC<ClientProfileHeaderProps> = ({
  client,
  stats,
  healthScore,
  onClose,
}) => {
  return (
    <div className="p-4 border-b border-slate-800 bg-matte-black">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-xl bg-gold/10 flex items-center justify-center">
            <Building2 className="w-7 h-7 text-gold" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">{client.name}</h2>
            <p className="text-sm text-slate-400">{client.type}</p>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-xs text-slate-500">PAN: {client.pan}</span>
              {client.gstin && (
                <>
                  <span className="text-slate-700">|</span>
                  <span className="text-xs text-slate-500">GSTIN: {client.gstin}</span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 text-slate-400 hover:text-gold">
            <Edit3 className="w-4 h-4" />
          </button>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <ClientProfileStats
        client={client}
        stats={stats}
        healthScore={healthScore}
      />
    </div>
  );
};
