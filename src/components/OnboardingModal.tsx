import React, { useMemo } from 'react';
import { ArrowRight, BookOpenCheck, CheckSquare, Users } from 'lucide-react';
import { Modal } from './Modal';
import { User } from '../types';
import { WorkspacePreferences } from '../services/workspacePreferencesService';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  user: User;
  workspacePrefs: WorkspacePreferences;
  onWorkspacePrefsChange: (prefs: WorkspacePreferences) => void;
  onNavigate: (tab: string) => void;
}

const roleStart: Record<User['role'], { tab: string; title: string; copy: string }> = {
  GodAdmin: { tab: 'firms', title: 'Review registrations', copy: 'Manage firms, subscriptions and platform approvals.' },
  SuperAdmin: { tab: 'clients', title: 'Add your first client', copy: 'Create the client once, then use the same record across CAATH.' },
  Admin: { tab: 'tasks', title: 'Open the task board', copy: 'Assign work, track deadlines and review your team queue.' },
  Staff: { tab: 'tasks', title: 'View assigned work', copy: 'Start with the tasks and documents assigned to you.' },
  Client: { tab: 'documents', title: 'Share documents', copy: 'Upload records securely and track compliance requests.' },
};

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onClose, onComplete, user, onNavigate }) => {
  const start = useMemo(() => roleStart[user.role], [user.role]);
  const description = user.role === 'SuperAdmin' && user.firm?.subscriptionStatus === 'Trial'
    ? 'Your workspace is ready and your 15-day free trial is active. No approval or payment is required during the trial.'
    : 'Your workspace is ready. Start with the work that matters now.';
  const openStart = () => {
    onNavigate(start.tab);
    onComplete();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Welcome to CAATH" description={description} size="md">
      <div className="space-y-5">
        <div className="border border-gold/25 bg-gold/5 p-5">
          <p className="text-lg font-bold text-white">{start.title}</p>
          <p className="mt-2 text-sm leading-6 text-slate-300">{start.copy}</p>
        </div>

        {user.role === 'SuperAdmin' && (
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="border border-slate-800 p-3"><Users className="h-4 w-4 text-gold"/><p className="mt-2 text-xs text-slate-300">Clients</p></div>
            <div className="border border-slate-800 p-3"><CheckSquare className="h-4 w-4 text-gold"/><p className="mt-2 text-xs text-slate-300">Tasks</p></div>
            <div className="border border-slate-800 p-3"><BookOpenCheck className="h-4 w-4 text-gold"/><p className="mt-2 text-xs text-slate-300">Accounting</p></div>
          </div>
        )}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className="min-h-11 border border-slate-700 px-4 py-2 text-sm text-slate-300">Close</button>
          <button type="button" onClick={openStart} className="min-h-11 bg-gold px-4 py-2 text-sm font-bold text-black">
            Get started <ArrowRight className="ml-2 inline h-4 w-4" />
          </button>
        </div>
      </div>
    </Modal>
  );
};
