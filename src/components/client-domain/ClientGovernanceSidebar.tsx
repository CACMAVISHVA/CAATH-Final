import React from 'react';
import { X } from 'lucide-react';
import { ClientRow } from '../../services/clientService';

interface ClientGovernanceSidebarProps {
  client: ClientRow;
  onClose: () => void;
}

export const ClientGovernanceSidebar: React.FC<ClientGovernanceSidebarProps> = ({ client, onClose }) => (
  <div className="fixed inset-0 bg-black/60 z-50 flex justify-end" onClick={onClose}>
    <div className="w-full max-w-xl h-full bg-matte-black-light border-l border-slate-800 p-6 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold text-white">{client.name}</h2>
          <p className="text-slate-400 mt-1">{client.type}</p>
        </div>
        <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-6">
        <div>
          <p className="text-slate-500 text-sm mb-1">PAN Number</p>
          <p className="text-white font-semibold uppercase">{client.pan}</p>
        </div>

        {client.gstin && (
          <div>
            <p className="text-slate-500 text-sm mb-1">GSTIN</p>
            <p className="text-white font-semibold uppercase">{client.gstin}</p>
          </div>
        )}

        {client.email && (
          <div>
            <p className="text-slate-500 text-sm mb-1">Email</p>
            <p className="text-white font-semibold">{client.email}</p>
          </div>
        )}

        {client.phone && (
          <div>
            <p className="text-slate-500 text-sm mb-1">Phone</p>
            <p className="text-white font-semibold">{client.phone}</p>
          </div>
        )}

        <div>
          <p className="text-slate-500 text-sm mb-3">Services</p>
          <div className="flex flex-wrap gap-2">
            {client.services?.map((service) => (
              <span key={service} className="px-3 py-2 bg-gold/10 text-gold rounded-xl text-sm font-bold">
                {service}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  </div>
);
