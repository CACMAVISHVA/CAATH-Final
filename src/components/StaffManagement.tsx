/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  UserPlus, 
  Users, 
  TrendingUp, 
  Trash2, 
  Briefcase, 
  Search, 
  Filter, 
  MoreVertical, 
  CheckCircle2, 
  Clock, 
  Star,
  User as UserIcon
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { User, Client } from '../types';

const MOCK_STAFF: User[] = [
  { 
    uid: 's1', 
    name: 'CA Rahul Sharma', 
    email: 'rahul@firm.com', 
    role: 'Staff', 
    firmId: 'f1', 
    assignedClients: ['c1', 'c2'],
    performance: { tasksCompleted: 45, documentsDelivered: 120, avgTurnaroundDays: 2.5, clientSatisfaction: 4.8 }
  },
  { 
    uid: 's2', 
    name: 'CA Priya Gupta', 
    email: 'priya@firm.com', 
    role: 'Staff', 
    firmId: 'f1', 
    assignedClients: ['c3'],
    performance: { tasksCompleted: 38, documentsDelivered: 95, avgTurnaroundDays: 3.1, clientSatisfaction: 4.5 }
  },
  { 
    uid: 's3', 
    name: 'CA Amit Verma', 
    email: 'amit@firm.com', 
    role: 'Staff', 
    firmId: 'f1', 
    assignedClients: ['c4', 'c5', 'c6'],
    performance: { tasksCompleted: 52, documentsDelivered: 140, avgTurnaroundDays: 2.2, clientSatisfaction: 4.9 }
  },
];

const MOCK_CLIENTS: Partial<Client>[] = [
  { id: 'c1', name: 'Reliance Industries Ltd' },
  { id: 'c2', name: 'Tata Motors Ltd' },
  { id: 'c3', name: 'HDFC Bank' },
  { id: 'c4', name: 'Infosys Ltd' },
  { id: 'c5', name: 'Zomato Ltd' },
  { id: 'c6', name: 'Adani Enterprises' },
];

export const StaffManagement: React.FC = () => {
  const [staff, setStaff] = useState<User[]>(MOCK_STAFF);
  const [selectedStaff, setSelectedStaff] = useState<User | null>(null);

  const removeStaff = (uid: string) => {
    setStaff(staff.filter(s => s.uid !== uid));
    if (selectedStaff?.uid === uid) setSelectedStaff(null);
  };

  return (
    <div className="p-8 space-y-8 h-full bg-matte-black text-slate-300 overflow-y-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold gold-text-gradient">Staff Management</h2>
          <p className="text-slate-500">Manage your team, delegate clients, and track performance.</p>
        </div>
        <button className="flex items-center gap-2 px-6 py-2.5 bg-gold text-matte-black rounded-xl font-bold hover:bg-gold-light transition-all shadow-lg shadow-gold/20">
          <UserPlus className="w-5 h-5" />
          Add New Staff
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Staff List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search staff members..." 
                className="w-full pl-10 pr-4 py-2.5 bg-matte-black-light border border-slate-800 rounded-xl text-sm focus:ring-2 focus:ring-gold focus:border-transparent transition-all"
              />
            </div>
            <button className="flex items-center gap-2 px-4 py-2 bg-matte-black-light border border-slate-800 rounded-xl text-sm font-bold text-slate-400 hover:text-gold transition-colors">
              <Filter className="w-4 h-4" />
              Filter
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {staff.map((member) => (
              <motion.div 
                key={member.uid}
                layoutId={member.uid}
                onClick={() => setSelectedStaff(member)}
                className={cn(
                  "p-6 bg-matte-black-light rounded-2xl border transition-all cursor-pointer group",
                  selectedStaff?.uid === member.uid ? "border-gold shadow-[0_0_20px_rgba(212,175,55,0.1)]" : "border-slate-800 hover:border-gold/30"
                )}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-gold font-bold text-xl border border-slate-700">
                      {member.name.charAt(3)}
                    </div>
                    <div>
                      <h4 className="font-bold text-white group-hover:text-gold transition-colors">{member.name}</h4>
                      <p className="text-xs text-slate-500">{member.email}</p>
                    </div>
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); removeStaff(member.uid); }}
                    className="p-2 text-slate-600 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-800">
                  <div className="space-y-1">
                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Assigned Clients</p>
                    <div className="flex items-center gap-1.5 text-white font-bold">
                      <Briefcase className="w-3.5 h-3.5 text-gold" />
                      <span>{member.assignedClients?.length || 0}</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Satisfaction</p>
                    <div className="flex items-center gap-1.5 text-white font-bold">
                      <Star className="w-3.5 h-3.5 text-gold fill-gold" />
                      <span>{member.performance?.clientSatisfaction.toFixed(1)}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Staff Detail & Performance */}
        <div className="space-y-8">
          {selectedStaff ? (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="p-6 bg-matte-black-light rounded-2xl border border-slate-800 shadow-2xl sticky top-8"
            >
              <div className="flex items-center gap-4 mb-8">
                <div className="w-16 h-16 rounded-2xl gold-gradient flex items-center justify-center text-matte-black font-bold text-2xl shadow-lg">
                  {selectedStaff.name.charAt(3)}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">{selectedStaff.name}</h3>
                  <p className="text-sm text-gold font-bold uppercase tracking-widest">Team Member</p>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Performance Metrics</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-matte-black rounded-xl border border-slate-800">
                      <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Tasks Done</p>
                      <p className="text-xl font-bold text-white">{selectedStaff.performance?.tasksCompleted}</p>
                    </div>
                    <div className="p-4 bg-matte-black rounded-xl border border-slate-800">
                      <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Docs Sent</p>
                      <p className="text-xl font-bold text-white">{selectedStaff.performance?.documentsDelivered}</p>
                    </div>
                    <div className="p-4 bg-matte-black rounded-xl border border-slate-800">
                      <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Avg TAT</p>
                      <p className="text-xl font-bold text-white">{selectedStaff.performance?.avgTurnaroundDays}d</p>
                    </div>
                    <div className="p-4 bg-matte-black rounded-xl border border-slate-800">
                      <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Rating</p>
                      <p className="text-xl font-bold text-gold">{selectedStaff.performance?.clientSatisfaction}/5</p>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Assigned Clients</h4>
                    <button className="text-[10px] text-gold font-bold hover:underline">Manage</button>
                  </div>
                  <div className="space-y-2">
                    {selectedStaff.assignedClients?.map(clientId => {
                      const client = MOCK_CLIENTS.find(c => c.id === clientId);
                      return (
                        <div key={clientId} className="flex items-center justify-between p-3 bg-matte-black rounded-xl border border-slate-800">
                          <span className="text-sm text-white font-medium">{client?.name}</span>
                          <button className="text-slate-600 hover:text-red-500">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                    <button className="w-full py-2.5 border border-dashed border-slate-800 rounded-xl text-xs text-slate-500 hover:border-gold/50 hover:text-gold transition-all flex items-center justify-center gap-2">
                      <UserPlus className="w-3.5 h-3.5" />
                      Assign New Client
                    </button>
                  </div>
                </div>
              </div>

              <button className="w-full mt-8 py-3 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl font-bold text-sm hover:bg-red-500/20 transition-all">
                Deactivate Staff Account
              </button>
            </motion.div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-12 bg-matte-black-light rounded-2xl border border-slate-800 border-dashed text-slate-600 text-center">
              <Users className="w-12 h-12 mb-4 opacity-20" />
              <p className="text-sm">Select a staff member to view their performance and manage assignments.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
