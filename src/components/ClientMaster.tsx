/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  Plus, 
  MoreVertical, 
  Mail, 
  Phone, 
  ExternalLink,
  ShieldAlert,
  ShieldCheck,
  Shield
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { CLIENT_TYPES, RISK_LEVELS } from '../constants';

const MOCK_CLIENTS = [
  { id: '1', name: 'Reliance Industries Ltd', type: 'Company', pan: 'ABCDE1234F', gstin: '27ABCDE1234F1Z5', riskLevel: 'Low', contact: 'Mukesh Ambani', email: 'mukesh@ril.com', phone: '+91 98765 43210', services: ['GST', 'Income Tax', 'MCA'] },
  { id: '2', name: 'Tata Motors Ltd', type: 'Company', pan: 'FGHIJ5678K', gstin: '27FGHIJ5678K1Z5', riskLevel: 'Low', contact: 'Ratan Tata', email: 'ratan@tata.com', phone: '+91 98765 43211', services: ['GST', 'Income Tax'] },
  { id: '3', name: 'Adani Enterprises', type: 'Company', pan: 'LMNOP9012Q', gstin: '27LMNOP9012Q1Z5', riskLevel: 'Medium', contact: 'Gautam Adani', email: 'gautam@adani.com', phone: '+91 98765 43212', services: ['GST'] },
  { id: '4', name: 'Infosys Ltd', type: 'Company', pan: 'RSTUV3456W', gstin: '27RSTUV3456W1Z5', riskLevel: 'Low', contact: 'Narayana Murthy', email: 'narayana@infosys.com', phone: '+91 98765 43213', services: ['Income Tax', 'MCA'] },
  { id: '5', name: 'HDFC Bank', type: 'Company', pan: 'XYZAB7890C', gstin: '27XYZAB7890C1Z5', riskLevel: 'Low', contact: 'Sashidhar Jagdishan', email: 'sashidhar@hdfc.com', phone: '+91 98765 43214', services: ['GST', 'MCA'] },
  { id: '6', name: 'Zomato Ltd', type: 'Company', pan: 'DEFGH1234I', gstin: '27DEFGH1234I1Z5', riskLevel: 'High', contact: 'Deepinder Goyal', email: 'deepinder@zomato.com', phone: '+91 98765 43215', services: ['GST', 'Income Tax', 'MCA'] },
];

interface ClientMasterProps {
  assignedOnly?: boolean;
  assignedClients?: string[];
}

export const ClientMaster: React.FC<ClientMasterProps> = ({ assignedOnly, assignedClients }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredClients = MOCK_CLIENTS.filter(client => {
    const matchesSearch = client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         client.pan.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (assignedOnly && assignedClients) {
      return matchesSearch && assignedClients.includes(client.id);
    }
    return matchesSearch;
  });

  return (
    <div className="p-8 space-y-6 h-full bg-matte-black text-slate-300 overflow-y-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold gold-text-gradient">Client Master</h2>
          <p className="text-slate-500">Manage your clients and their compliance profiles.</p>
        </div>
        <button className="flex items-center gap-2 px-6 py-2.5 bg-gold text-matte-black rounded-xl font-bold hover:bg-gold-light transition-all shadow-lg shadow-gold/20">
          <Plus className="w-4 h-4" />
          Add New Client
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search by name, PAN, or GSTIN..." 
            className="w-full pl-10 pr-4 py-2.5 bg-matte-black-light border border-slate-800 rounded-xl text-sm text-white focus:ring-2 focus:ring-gold focus:border-transparent transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-4 py-2 bg-matte-black-light border border-slate-800 rounded-xl text-sm font-bold text-slate-400 hover:text-gold transition-colors">
            <Filter className="w-4 h-4" />
            Filter
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-matte-black-light border border-slate-800 rounded-xl text-sm font-bold text-slate-400 hover:text-gold transition-colors">
            Export
          </button>
        </div>
      </div>

      <div className="bg-matte-black-light rounded-2xl border border-slate-800 shadow-2xl overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-matte-black border-b border-slate-800">
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Client Name</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Type</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">PAN / GSTIN</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Risk Level</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Contact</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Services</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {filteredClients.map((client) => (
              <motion.tr 
                key={client.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="hover:bg-matte-black transition-colors group"
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gold/10 text-gold flex items-center justify-center font-bold text-xs border border-gold/20">
                      {client.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white group-hover:text-gold transition-colors">{client.name}</p>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">ID: #{client.id.padStart(4, '0')}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 bg-slate-800 text-slate-400 rounded-md text-[10px] font-bold uppercase tracking-wider border border-slate-700">
                    {client.type}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <p className="text-sm font-mono text-slate-300">{client.pan}</p>
                  <p className="text-[10px] font-mono text-slate-500">{client.gstin}</p>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-1.5">
                    {client.riskLevel === 'Low' && <ShieldCheck className="w-4 h-4 text-emerald-500" />}
                    {client.riskLevel === 'Medium' && <Shield className="w-4 h-4 text-amber-500" />}
                    {client.riskLevel === 'High' && <ShieldAlert className="w-4 h-4 text-red-500" />}
                    <span className={cn(
                      "text-xs font-bold uppercase tracking-wider",
                      client.riskLevel === 'Low' ? 'text-emerald-500' : 
                      client.riskLevel === 'Medium' ? 'text-amber-500' : 'text-red-500'
                    )}>
                      {client.riskLevel}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2 text-slate-500 hover:text-gold transition-colors cursor-pointer">
                      <Mail className="w-3 h-3" />
                      <span className="text-xs">{client.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-500 hover:text-gold transition-colors cursor-pointer">
                      <Phone className="w-3 h-3" />
                      <span className="text-xs">{client.phone}</span>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-1">
                    {client.services.map(service => (
                      <span key={service} className="px-1.5 py-0.5 bg-gold/10 text-gold rounded text-[8px] font-bold uppercase tracking-wider border border-gold/20">
                        {service}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-2 text-slate-500 hover:text-gold hover:bg-gold/10 rounded-lg transition-colors">
                      <ExternalLink className="w-4 h-4" />
                    </button>
                    <button className="p-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
