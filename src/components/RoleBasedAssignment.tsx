/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Users, User, ChevronDown, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';

export type RoleType = 'Admin' | 'Staff';

interface UserOption {
  id: string;
  name: string;
  email?: string;
  role?: string;
  activeTasks?: number;
  pendingTasks?: number;
}

interface RoleBasedAssignmentProps {
  value: string;
  onChange: (userId: string) => void;
  firmId: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export const RoleBasedAssignment: React.FC<RoleBasedAssignmentProps> = ({
  value,
  onChange,
  firmId,
  placeholder = 'Select assignment...',
  className,
  disabled = false,
}) => {
  const { user: currentUser } = useAuth();
  const [roleType, setRoleType] = useState<RoleType | ''>('');
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const canAssignAdmin = currentUser?.role === 'SuperAdmin' || currentUser?.role === 'GodAdmin';
  const canAssignStaff = currentUser?.role === 'SuperAdmin' || currentUser?.role === 'GodAdmin' || currentUser?.role === 'Admin';

  // Load users when role type changes
  const loadUsers = useCallback(async () => {
    if (!firmId || !roleType) {
      setUsers([]);
      return;
    }

    setLoading(true);
    try {
      // Use imported functions directly to avoid duplicate imports
      const { getAdmins, getStaffMembersOnly } = await import('../services/taskService');

      const data = roleType === 'Admin'
        ? await getAdmins(firmId)
        : await getStaffMembersOnly(firmId);

      setUsers(data || []);
    } catch (error) {
      console.error('Failed to load users:', error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [firmId, roleType]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    if (roleType === 'Admin' && !canAssignAdmin) {
      setRoleType('');
      onChange('');
    }
    if (roleType === 'Staff' && !canAssignStaff) {
      setRoleType('');
      onChange('');
    }
  }, [roleType, canAssignAdmin, canAssignStaff, onChange]);

  // Reset second dropdown when role type changes
  const handleRoleTypeChange = (newRole: RoleType) => {
    setRoleType(newRole);
    setIsOpen(false);
    onChange(''); // Reset selected user
  };

  // Get selected user info
  const selectedUser = users.find(u => u.id === value);

  return (
    <div className={cn("space-y-2", className)}>
      {/* Step 1: Role Type Selection */}
      <div>
        <label className="text-xs text-slate-500 uppercase font-bold mb-1.5 block">
          Assign Role Type
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={disabled || !canAssignAdmin}
            onClick={() => handleRoleTypeChange('Admin')}
            className={cn(
              "p-3 rounded-xl border text-sm font-bold transition-all flex items-center justify-center gap-2",
              roleType === 'Admin'
                ? "bg-gold/10 border-gold text-gold"
                : "bg-matte-black border-slate-700 text-slate-400 hover:border-slate-600",
              (disabled || !canAssignAdmin) && "opacity-50 cursor-not-allowed"
            )}
          >
            <Users className="w-4 h-4" />
            Admin
          </button>
          <button
            type="button"
            disabled={disabled || !canAssignStaff}
            onClick={() => handleRoleTypeChange('Staff')}
            className={cn(
              "p-3 rounded-xl border text-sm font-bold transition-all flex items-center justify-center gap-2",
              roleType === 'Staff'
                ? "bg-gold/10 border-gold text-gold"
                : "bg-matte-black border-slate-700 text-slate-400 hover:border-slate-600",
              (disabled || !canAssignStaff) && "opacity-50 cursor-not-allowed"
            )}
          >
            <User className="w-4 h-4" />
            Staff
          </button>
        </div>
      </div>

      {/* Step 2: User Selection */}
      {roleType && (
        <div>
          <label className="text-xs text-slate-500 uppercase font-bold mb-1.5 block">
            Select {roleType}
          </label>
          <div className="relative">
            <button
              type="button"
              disabled={disabled || loading}
              onClick={() => !disabled && !loading && setIsOpen(!isOpen)}
              className={cn(
                "w-full p-3 rounded-xl bg-matte-black border text-left flex items-center justify-between",
                selectedUser
                  ? "border-slate-600 text-white"
                  : "border-slate-700 text-slate-400",
                disabled && "opacity-50 cursor-not-allowed"
              )}
            >
              <span className="truncate">
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading...
                  </span>
                ) : selectedUser ? (
                  selectedUser.name
                ) : (
                  placeholder
                )}
              </span>
              <ChevronDown className={cn(
                "w-4 h-4 text-slate-500 transition-transform",
                isOpen && "rotate-180"
              )} />
            </button>

            {/* Dropdown */}
            {isOpen && !loading && users.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-matte-black-light border border-slate-700 rounded-xl max-h-60 overflow-auto shadow-xl">
                {users.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => {
                      onChange(user.id);
                      setIsOpen(false);
                    }}
                    className={cn(
                      "w-full p-3 text-left hover:bg-slate-800 transition-colors flex items-center justify-between",
                      value === user.id && "bg-gold/10 border-l-2 border-gold"
                    )}
                  >
                    <div>
                      <p className="text-sm font-bold text-white">{user.name}</p>
                      <p className="text-[10px] text-slate-500">{user.email}</p>
                    </div>
                    {user.activeTasks !== undefined && (
                      <span className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded",
                        user.activeTasks > 10 ? "bg-red-500/20 text-red-400" :
                        user.activeTasks > 5 ? "bg-amber-500/20 text-amber-400" :
                        "bg-emerald-500/20 text-emerald-400"
                      )}>
                        {user.activeTasks} tasks
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* No users found */}
            {isOpen && !loading && users.length === 0 && (
              <div className="absolute z-50 w-full mt-1 bg-matte-black-light border border-slate-700 rounded-xl p-3 text-center text-xs text-slate-500">
                No {roleType.toLowerCase()}s found in this firm
              </div>
            )}
          </div>
        </div>
      )}

      {/* Selected Assignment Display */}
      {value && roleType && (
        <div className="flex items-center gap-2 p-2 bg-matte-black rounded-lg border border-slate-800">
          <div className={cn(
            "p-1.5 rounded",
            roleType === 'Admin' ? "bg-gold/10" : "bg-blue-500/10"
          )}>
            {roleType === 'Admin' ? (
              <Users className="w-3 h-3 text-gold" />
            ) : (
              <User className="w-3 h-3 text-blue-400" />
            )}
          </div>
          <div className="flex-1">
            <p className="text-xs text-white font-bold">{selectedUser?.name || 'Unknown'}</p>
            <p className="text-[10px] text-slate-500">{roleType}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoleBasedAssignment;
