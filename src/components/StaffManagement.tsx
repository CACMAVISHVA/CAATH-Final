/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  UserPlus, 
  Users, 
  TrendingUp, 
  UserMinus,
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
import { User } from '../types';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { createAccountWithRole } from '../services/accountOnboardingService';
import { useToast } from './Toast';
import { firstValidationError, validateEmail, validateIndianMobile, validateRequiredName } from '../lib/fieldValidation';
import { useSessionDraft } from '../hooks/useSessionDraft';
import { useUnsavedChangesGuard } from '../hooks/useUnsavedChangesGuard';

interface NewStaffForm {
  name: string;
  email: string;
  phone: string;
  role: string;
  department: string;
  designation: string;
  joiningDate: string;
}

const createDefaultStaffForm = (): NewStaffForm => ({
  name: '',
  email: '',
  phone: '',
  role: 'Staff',
  department: '',
  designation: '',
  joiningDate: new Date().toISOString().split('T')[0],
});

export const StaffManagement: React.FC = () => {
  const { user } = useAuth();
  const toast = useToast();
  const [staff, setStaff] = useState<User[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<User | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const staffDraftKey = `caath:draft:staff:${user?.firmId || 'loading'}`;
  const [newStaff, setNewStaff, clearNewStaffDraft] = useSessionDraft<NewStaffForm>(staffDraftKey, createDefaultStaffForm());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null);
  const hasUnsavedStaffChanges = Boolean(
    newStaff.name || newStaff.email || newStaff.phone || newStaff.department || newStaff.designation || newStaff.role !== 'Staff',
  );
  const guardStaffModalClose = useUnsavedChangesGuard(hasUnsavedStaffChanges);

  const closeStaffModal = () => guardStaffModalClose(() => {
    setShowAddModal(false);
    clearNewStaffDraft();
    setFormError(null);
  });

  React.useEffect(() => {
    if (hasUnsavedStaffChanges) setShowAddModal(true);
  }, []);

  React.useEffect(() => {
    const loadUsers = async () => {
      if (!user?.firmId) return;
      setLoadError(null);
      const { data, error } = await supabase
        .from('users')
        .select('id, auth_id, firm_id, name, email, role, status, created_at')
        .eq('firm_id', user.firmId)
        .neq('role', 'GodAdmin')
        .order('created_at', { ascending: false });
      if (error) {
        setStaff([]);
        setLoadError('Unable to load workspace users. Please refresh and try again.');
        return;
      }
      setStaff((data || []).map((row) => ({
        id: row.id,
        authId: row.auth_id,
        firmId: row.firm_id,
        name: row.name,
        email: row.email,
        role: row.role,
        status: row.status,
        createdAt: row.created_at,
        assignedClients: [],
        performance: { tasksCompleted: 0, documentsDelivered: 0, avgTurnaroundDays: 0, clientSatisfaction: 0 },
      })));
    };
    loadUsers();
  }, [user?.firmId]);

  const setStaffStatus = async (member: User) => {
    if (!user?.firmId || member.id === user.id) return;
    const nextStatus = member.status === 'Inactive' ? 'Active' : 'Inactive';
    setDeactivatingId(member.id);
    setLoadError(null);
    const { error } = await supabase
      .from('users')
      .update({ status: nextStatus })
      .eq('id', member.id)
      .eq('firm_id', user.firmId);
    setDeactivatingId(null);
    if (error) {
      const message = `The account could not be ${nextStatus === 'Active' ? 'reactivated' : 'deactivated'}.`;
      setLoadError(message);
      toast.error('Account update failed', message);
      return;
    }
    setStaff((current) => current.map((entry) => entry.id === member.id ? { ...entry, status: nextStatus } : entry));
    setSelectedStaff((current) => current?.id === member.id ? { ...current, status: nextStatus } : current);
    toast.success(
      nextStatus === 'Active' ? 'Account reactivated' : 'Account deactivated',
      nextStatus === 'Active' ? `${member.name} can access this workspace again.` : `${member.name} can no longer access this workspace.`,
    );
  };

  const validateStaffForm = () => {
    const cleanName = newStaff.name.trim();
    const cleanEmail = newStaff.email.trim().toLowerCase();
    const formatError = firstValidationError(
      validateRequiredName(cleanName, 'Full name'),
      validateEmail(cleanEmail),
      validateIndianMobile(newStaff.phone, false),
    );
    if (formatError) return formatError;
    if (staff.some((member) => member.email.toLowerCase() === cleanEmail)) {
      return 'This email is already registered in this workspace.';
    }
    if (!user) return 'Your session is still loading. Please try again.';
    return null;
  };

  const handleAddStaff = async () => {
    const validationError = validateStaffForm();
    if (validationError) {
      setFormError(validationError);
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      const result = await createAccountWithRole({
        email: newStaff.email.trim().toLowerCase(),
        password: `CAATH@${new Date().getFullYear()}!`,
        fullName: newStaff.name.trim(),
        role: newStaff.role as User['role'],
        actor: user,
      });
      const profile = result.profile;
      const newStaffMember: User = {
        id: profile.id,
        authId: profile.auth_id,
        name: profile.name,
        email: profile.email,
        role: profile.role,
        firmId: profile.firm_id,
        status: profile.status,
        createdAt: profile.created_at,
        assignedClients: [],
        performance: { tasksCompleted: 0, documentsDelivered: 0, avgTurnaroundDays: 0, clientSatisfaction: 0 }
      };

      setStaff((current) => [newStaffMember, ...current.filter((member) => member.id !== newStaffMember.id)]);
      setShowAddModal(false);
      toast.success('Staff account created', `${newStaffMember.name} was added without changing your session.`);
      clearNewStaffDraft();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to create user.';
      setFormError(message);
      toast.error('Staff creation failed', message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 space-y-6 h-full bg-matte-black text-slate-300 overflow-y-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold gold-text-gradient">Staff Management</h2>
          <p className="text-sm text-slate-500">Create users, assign roles, and manage workspace access.</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gold text-matte-black font-bold hover:bg-gold-light transition-all"
        >
          <UserPlus className="w-4 h-4" />
          Add New Staff
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Staff List */}
        <div className="lg:col-span-2 space-y-6">
          {loadError && <div className="border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">{loadError}</div>}
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
                key={member.id}
                layoutId={member.id}
                onClick={() => setSelectedStaff(member)}
                className={cn(
                  "p-6 bg-matte-black-light rounded-2xl border transition-all cursor-pointer group",
                  selectedStaff?.id === member.id ? "border-gold shadow-[0_0_20px_rgba(212,175,55,0.1)]" : "border-slate-800 hover:border-gold/30"
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
                    onClick={(e) => { e.stopPropagation(); void setStaffStatus(member); }}
                    disabled={member.id === user?.id || deactivatingId === member.id}
                    aria-label={`${member.status === 'Inactive' ? 'Activate' : 'Deactivate'} ${member.name}`}
                    title={member.id === user?.id ? 'You cannot change your own account status' : `${member.status === 'Inactive' ? 'Activate' : 'Deactivate'} account`}
                    className={cn('p-2 rounded-lg transition-all opacity-0 group-hover:opacity-100 disabled:opacity-20 disabled:cursor-not-allowed', member.status === 'Inactive' ? 'text-emerald-500 hover:bg-emerald-500/10' : 'text-slate-600 hover:text-red-500 hover:bg-red-500/10')}
                  >
                    {member.status === 'Inactive' ? <CheckCircle2 className="w-4 h-4" /> : <UserMinus className="w-4 h-4" />}
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
                    <p className="p-3 bg-matte-black rounded-xl border border-slate-800 text-xs text-slate-500">
                      Client assignments are shown after they are saved in the workspace.
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => void setStaffStatus(selectedStaff)}
                disabled={selectedStaff.id === user?.id || deactivatingId === selectedStaff.id}
                className={cn('w-full mt-8 py-3 border rounded-xl font-bold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed', selectedStaff.status === 'Inactive' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20')}
              >
                {deactivatingId === selectedStaff.id ? 'Updating...' : selectedStaff.status === 'Inactive' ? 'Reactivate Staff Account' : 'Deactivate Staff Account'}
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

      {/* Add Staff Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={closeStaffModal}>
          <div className="bg-matte-black-light border border-slate-800 w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white">Add New Staff Member</h3>
              <button onClick={closeStaffModal} className="text-slate-500 hover:text-white">✕</button>
            </div>

            <div className="p-4 space-y-4">
              {formError && (
                <div className="border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">
                  {formError}
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-500 uppercase font-bold mb-1.5">Full Name *</label>
                  <input
                    type="text"
                    value={newStaff.name}
                    onChange={e => setNewStaff({ ...newStaff, name: e.target.value })}
                    className="w-full px-3 py-2 bg-matte-black border border-slate-800 text-sm text-white"
                    placeholder="CA Name"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 uppercase font-bold mb-1.5">Email *</label>
                  <input
                    type="email"
                    value={newStaff.email}
                    onChange={e => setNewStaff({ ...newStaff, email: e.target.value })}
                    className="w-full px-3 py-2 bg-matte-black border border-slate-800 text-sm text-white"
                    placeholder="email@firm.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-500 uppercase font-bold mb-1.5">Phone</label>
                  <input
                    type="tel"
                    value={newStaff.phone}
                    onChange={e => setNewStaff({ ...newStaff, phone: e.target.value })}
                    inputMode="numeric"
                    maxLength={14}
                    pattern="(?:\+91[ -]?)?[6-9][0-9]{9}"
                    title="Enter a valid 10-digit Indian mobile number"
                    className="w-full px-3 py-2 bg-matte-black border border-slate-800 text-sm text-white"
                    placeholder="+91 9876543210"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 uppercase font-bold mb-1.5">Role</label>
                  <select
                    value={newStaff.role}
                    onChange={e => setNewStaff({ ...newStaff, role: e.target.value })}
                    className="w-full px-3 py-2 bg-matte-black border border-slate-800 text-sm text-white"
                  >
                    {user?.role === 'SuperAdmin' && <option value="SuperAdmin">SuperAdmin</option>}
                    {user?.role === 'SuperAdmin' && <option value="Admin">Admin</option>}
                    <option value="Staff">Staff</option>
                    <option value="Client">Client</option>
                  </select>
                  <p className="mt-1 text-[11px] text-slate-500">Workspace ownership remains with the original registered owner unless transferred by a governed backend workflow.</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-500 uppercase font-bold mb-1.5">Department</label>
                  <input
                    type="text"
                    value={newStaff.department}
                    onChange={e => setNewStaff({ ...newStaff, department: e.target.value })}
                    className="w-full px-3 py-2 bg-matte-black border border-slate-800 text-sm text-white"
                    placeholder="Tax / Audit / GST"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 uppercase font-bold mb-1.5">Designation</label>
                  <input
                    type="text"
                    value={newStaff.designation}
                    onChange={e => setNewStaff({ ...newStaff, designation: e.target.value })}
                    className="w-full px-3 py-2 bg-matte-black border border-slate-800 text-sm text-white"
                    placeholder="Senior / Junior"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-500 uppercase font-bold mb-1.5">Joining Date</label>
                <input
                  type="date"
                  value={newStaff.joiningDate}
                  onChange={e => setNewStaff({ ...newStaff, joiningDate: e.target.value })}
                  className="w-full px-3 py-2 bg-matte-black border border-slate-800 text-sm text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 p-4 border-t border-slate-800">
              <button
                onClick={closeStaffModal}
                className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddStaff}
                disabled={isSubmitting || !newStaff.name || !newStaff.email}
                className="px-4 py-2 bg-gold text-matte-black text-sm font-bold hover:bg-gold-light disabled:opacity-50"
              >
                {isSubmitting ? 'Adding...' : 'Add Staff Member'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
