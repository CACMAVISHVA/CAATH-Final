/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { LockKeyhole } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';

interface ProtectedRouteProps {
  roles?: UserRole[];
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ roles, children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="h-full bg-matte-black flex items-center justify-center text-slate-500">
        Loading protected workspace...
      </div>
    );
  }

  if (!user || (roles && !roles.includes(user.role))) {
    return (
      <div className="h-full bg-matte-black flex items-center justify-center p-8">
        <div className="max-w-md text-center p-8 bg-matte-black-light border border-slate-800 rounded-3xl">
          <LockKeyhole className="w-12 h-12 text-gold mx-auto mb-5" />
          <h2 className="text-2xl font-bold text-white">Protected Area</h2>
          <p className="text-sm text-slate-500 mt-3">Your current account does not have permission to access this module.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
