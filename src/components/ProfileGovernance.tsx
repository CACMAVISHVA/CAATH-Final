/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CalendarDays, CreditCard, ShieldCheck, Sparkles, UserCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from './Toast';
import { getUserDisplayRole } from '../lib/userHelpers';
import {
  canEditProfile,
  canSubmitProfileRequest,
  canViewSubscriptionDetails,
} from '../lib/permissions';
import { fetchFirmProfile, fetchLatestFirmSubscription, submitProfileChangeRequest, updateOwnProfile } from '../services/profileService';

type SubscriptionPanelProps = {
  subscription: Awaited<ReturnType<typeof fetchLatestFirmSubscription>> | null;
  canViewPlanDetails: boolean;
  firmName: string;
};

const formatDate = (value?: string | null) => {
  if (!value) return 'N/A';
  return new Date(value).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const SubscriptionPanel: React.FC<SubscriptionPanelProps> = ({ subscription, canViewPlanDetails, firmName }) => {
  if (!subscription) {
    return (
      <div className="space-y-3 rounded-3xl border border-slate-800 bg-matte-black-light p-6">
        <div className="flex items-center gap-3 text-slate-300">
          <CreditCard className="w-5 h-5 text-gold" />
          <h3 className="text-lg font-bold text-white">Subscription Snapshot</h3>
        </div>
        <p className="text-slate-500 text-sm">No active subscription record was detected for {firmName || 'this account'}.</p>
      </div>
    );
  }

  const visibilityMessage = canViewPlanDetails
    ? 'Full subscription profile is visible to your governance role.'
    : 'Limited plan status is shown for your access tier.';

  return (
    <div className="space-y-4 rounded-3xl border border-slate-800 bg-matte-black-light p-6">
      <div className="flex items-center gap-3 text-slate-300">
        <CreditCard className="w-5 h-5 text-gold" />
        <h3 className="text-lg font-bold text-white">Subscription Snapshot</h3>
      </div>
      <div className="grid gap-3">
        <div className="flex items-center justify-between gap-2 rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-3">
          <span className="text-sm text-slate-400">Plan</span>
          <span className="text-sm font-bold text-white uppercase tracking-widest">{subscription.plan}</span>
        </div>
        <div className="flex items-center justify-between gap-2 rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-3">
          <span className="text-sm text-slate-400">Status</span>
          <span className={
            `text-sm font-bold uppercase tracking-widest ${
              subscription.status === 'Active' ? 'text-emerald-400' : subscription.status === 'Trial' ? 'text-sky-400' : 'text-amber-400'
            }`
          }>
            {subscription.status}
          </span>
        </div>
        {canViewPlanDetails ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
                <p className="text-xs uppercase tracking-wider text-slate-500">Billing cycle</p>
                <p className="text-sm font-bold text-white mt-2">{subscription.billing_cycle}</p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
                <p className="text-xs uppercase tracking-wider text-slate-500">Recurring amount</p>
                <p className="text-sm font-bold text-white mt-2">{subscription.amount ? `Rs ${Number(subscription.amount).toLocaleString()}` : 'N/A'}</p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
                <p className="text-xs uppercase tracking-wider text-slate-500">Started</p>
                <p className="text-sm font-bold text-white mt-2">{formatDate(subscription.starts_at)}</p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
                <p className="text-xs uppercase tracking-wider text-slate-500">Renewal / expiry</p>
                <p className="text-sm font-bold text-white mt-2">{formatDate(subscription.expires_at)}</p>
              </div>
            </div>
          </>
        ) : (
          <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 text-sm text-slate-400">
            {visibilityMessage}
          </div>
        )}
      </div>
    </div>
  );
};

export const ProfileGovernance: React.FC<{ variant?: 'page' | 'modal' }> = ({ variant = 'page' }) => {
  const { user, refreshUser } = useAuth();
  const toast = useToast();
  const [firmName, setFirmName] = useState<string>('');
  const [subscription, setSubscription] = useState<Awaited<ReturnType<typeof fetchLatestFirmSubscription>> | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const [requestReason, setRequestReason] = useState('');
  const [userName, setUserName] = useState(user?.name ?? '');
  const [userEmail, setUserEmail] = useState(user?.email ?? '');
  const [requestSubmitted, setRequestSubmitted] = useState(false);

  const canEdit = canEditProfile(user);
  const canRequest = canSubmitProfileRequest(user);
  const canViewPlanDetails = canViewSubscriptionDetails(user);

  useEffect(() => {
    setUserName(user?.name ?? '');
    setUserEmail(user?.email ?? '');
  }, [user]);

  useEffect(() => {
    const loadFirmData = async () => {
      if (!user?.firmId) return;
      setIsLoadingProfile(true);
      try {
        const [firmResult, subscriptionResult] = await Promise.all([
          fetchFirmProfile(user.firmId),
          fetchLatestFirmSubscription(user.firmId),
        ]);
        setFirmName(firmResult?.name ?? 'Firm');
        setSubscription(subscriptionResult);
      } catch (error) {
        console.error(error);
        toast.error('Snapshot Load Failed', (error as Error)?.message || 'Unable to load your governance snapshot.');
      } finally {
        setIsLoadingProfile(false);
      }
    };

    loadFirmData();
  }, [user?.firmId, toast]);

  const handleSaveProfile = useCallback(async () => {
    if (!user) return;
    if (!userName.trim() || !userEmail.trim()) {
      toast.warning('Profile validation', 'Name and email must not be empty.');
      return;
    }

    setIsSaving(true);
    try {
      await updateOwnProfile(user.id, { name: userName, email: userEmail });
      await refreshUser();
      toast.success('Profile updated', 'Your profile changes were saved successfully.');
    } catch (error) {
      toast.error('Save failed', (error as Error)?.message || 'Unable to save profile updates.');
    } finally {
      setIsSaving(false);
    }
  }, [refreshUser, toast, user, userEmail, userName]);

  const handleRequestUpdate = useCallback(async () => {
    if (!user) return;
    if (!requestReason.trim()) {
      toast.warning('Request required', 'Please add a short explanation for your profile change request.');
      return;
    }

    setIsRequesting(true);
    try {
      await submitProfileChangeRequest(user, userName, userEmail, requestReason);
      setRequestSubmitted(true);
      setRequestReason('');
      toast.success('Request sent', 'Your profile update request has been recorded and sent for review.');
    } catch (error) {
      toast.error('Request failed', (error as Error)?.message || 'Unable to submit the request right now.');
    } finally {
      setIsRequesting(false);
    }
  }, [requestReason, toast, user, userEmail, userName]);

  const profileStateLabel = useMemo(() => {
    if (!user?.status) return 'Unknown';
    return user.status;
  }, [user?.status]);

  if (!user) {
    return (
      <div className="p-8 text-slate-300">
        <AlertTriangle className="w-6 h-6 text-amber-400" />
        <p className="mt-4 text-sm">User identity is not available. Please re-login to continue.</p>
      </div>
    );
  }

  const headerTag = user.role === 'GodAdmin' ? 'Platform Access' : firmName || 'Firm Profile';
  const canViewSubscription = user.role !== 'Client';

  return (
    <div className={
      variant === 'modal'
        ? 'w-full overflow-y-auto max-h-[calc(100vh-4rem)] min-h-[60vh] p-6'
        : 'w-full h-full min-h-[calc(100vh-56px)] overflow-y-auto p-8'
    }>
      <div className="mb-8 flex flex-col gap-5">
        <div>
          <p className="text-sm uppercase tracking-widest text-slate-500">Enterprise Identity Hub</p>
          <h2 className="text-3xl font-bold text-white">Profile Governance & Subscription Controls</h2>
          <p className="mt-3 max-w-2xl text-slate-400">Manage and inspect account-level profile governance, subscription visibility, and approval workflows for your CAATH enterprise identity.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-[1fr_320px] min-w-0">
          <div className="min-w-0 rounded-3xl border border-slate-800 bg-matte-black-light p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-widest text-slate-500">Identity Snapshot</p>
                <h3 className="mt-2 text-2xl font-bold text-white">{getUserDisplayRole(user)} Profile</h3>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-950/80 px-3 py-2 text-xs uppercase tracking-wider text-slate-300">
                <UserCheck className="w-4 h-4 text-gold" />
                {profileStateLabel}
              </div>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-4">
                <p className="text-xs uppercase tracking-widest text-slate-500">Owner</p>
                <p className="mt-2 text-sm font-bold text-white">{user.name}</p>
              </div>
              <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-4">
                <p className="text-xs uppercase tracking-widest text-slate-500">Assigned Role</p>
                <p className="mt-2 text-sm font-bold text-white">{getUserDisplayRole(user)}</p>
              </div>
              <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-4">
                <p className="text-xs uppercase tracking-widest text-slate-500">Account Since</p>
                <p className="mt-2 text-sm font-bold text-white">{user.createdAt ? formatDate(user.createdAt) : 'Unknown'}</p>
              </div>
              <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-4">
                <p className="text-xs uppercase tracking-widest text-slate-500">Governance Tier</p>
                <p className="mt-2 text-sm font-bold text-white">{headerTag}</p>
              </div>
            </div>
          </div>

          <SubscriptionPanel subscription={subscription} canViewPlanDetails={canViewPlanDetails} firmName={firmName} />
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.7fr_1fr] min-w-0">
        <section className="min-w-0 rounded-3xl border border-slate-800 bg-matte-black-light p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-widest text-slate-500">Managed profile</p>
              <h3 className="mt-2 text-2xl font-bold text-white">Your account controls</h3>
            </div>
            <div className="rounded-full border border-slate-800 bg-slate-950/80 px-3 py-1 text-xs uppercase tracking-widest text-slate-300">
              {user.role}
            </div>
          </div>

          <div className="mt-6 space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2 text-sm text-slate-300">
                <span className="text-slate-400">Full name</span>
                <input
                  type="text"
                  value={userName}
                  disabled={!canEdit}
                  onChange={(event) => setUserName(event.target.value)}
                  className="w-full rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-sm text-white outline-none transition focus:border-gold/80 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </label>
              <label className="space-y-2 text-sm text-slate-300">
                <span className="text-slate-400">Email address</span>
                <input
                  type="email"
                  value={userEmail}
                  disabled={!canEdit}
                  onChange={(event) => setUserEmail(event.target.value)}
                  className="w-full rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-sm text-white outline-none transition focus:border-gold/80 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </label>
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-5">
              <div className="flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-gold" />
                <div>
                  <p className="text-sm font-semibold text-white">Governance guidance</p>
                  <p className="mt-2 text-sm text-slate-400">
                    {user.role === 'SuperAdmin' || user.role === 'GodAdmin'
                      ? 'Your profile is fully editable by your governance tier. Changes are audited and reflected across CAATH OS.'
                      : user.role === 'Admin' || user.role === 'Staff'
                      ? 'Profile updates require approval from the supervising governance team. Submit a request to trigger the workflow.'
                      : 'This profile is managed by your firm administrator. Contact them for any profile updates.'}
                  </p>
                </div>
              </div>
            </div>

            {canEdit ? (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-slate-400">You can update your personalized CAATH identity details within the platform compliance policy.</p>
                <button
                  onClick={handleSaveProfile}
                  disabled={isSaving}
                  className="inline-flex items-center justify-center rounded-2xl bg-gold px-5 py-3 text-sm font-bold text-matte-black transition hover:bg-gold-light disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : 'Save profile'}
                </button>
              </div>
            ) : null}

            {canRequest ? (
              <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-5">
                <div className="flex items-center gap-3 text-slate-300">
                  <Sparkles className="w-5 h-5 text-sky-400" />
                  <h4 className="text-base font-semibold text-white">Request profile update</h4>
                </div>
                <p className="mt-3 text-sm text-slate-400">Submit a profile change request so your supervising governance team can review and apply the update.</p>
                <textarea
                  rows={4}
                  value={requestReason}
                  onChange={(event) => setRequestReason(event.target.value)}
                  disabled={isRequesting}
                  placeholder="Describe what needs to change and why..."
                  className="mt-4 w-full rounded-3xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-sm text-white outline-none transition focus:border-gold/80 disabled:cursor-not-allowed disabled:opacity-50"
                />
                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs uppercase tracking-widest text-slate-500">Request workflow status</p>
                  <button
                    onClick={handleRequestUpdate}
                    disabled={isRequesting || requestSubmitted}
                    className="inline-flex items-center justify-center rounded-2xl bg-slate-800 px-5 py-3 text-sm font-bold text-slate-100 transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {requestSubmitted ? 'Request submitted' : isRequesting ? 'Submitting...' : 'Submit request'}
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          <aside className="space-y-6 min-w-0">
            <div className="min-w-0 rounded-3xl border border-slate-800 bg-matte-black-light p-6">
              <div className="flex items-center gap-3 text-slate-300">
                <ShieldCheck className="w-5 h-5 text-gold" />
                <div>
                  <p className="text-xs uppercase tracking-widest text-slate-500">Access status</p>
                  <h4 className="mt-1 text-lg font-bold text-white">{profileStateLabel}</h4>
                </div>
              </div>
              <div className="mt-5 space-y-4 text-sm text-slate-400">
                <div className="grid gap-2">
                  <span className="font-semibold text-slate-200">Account ID</span>
                  <span className="text-slate-400 break-all">{user.id}</span>
                </div>
                <div className="grid gap-2">
                  <span className="font-semibold text-slate-200">Role</span>
                  <span className="text-slate-400">{getUserDisplayRole(user)}</span>
                </div>
                <div className="grid gap-2">
                  <span className="font-semibold text-slate-200">Firm context</span>
                  <span className="text-slate-400">{user.role === 'GodAdmin' ? 'Platform-level' : firmName || user.firmId || 'Unknown'}</span>
                </div>
              </div>
            </div>

            {canViewSubscription ? (
              <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-6">
                <div className="flex items-center gap-3 text-slate-300">
                  <CalendarDays className="w-5 h-5 text-sky-400" />
                  <h4 className="text-base font-semibold text-white">Visibility policy</h4>
                </div>
                <p className="mt-4 text-sm text-slate-400">
                  {user.role === 'SuperAdmin' || user.role === 'GodAdmin'
                    ? 'You have enterprise access to subscription lifecycle details, renewal dates, and billing activity.'
                    : 'Your access is limited to plan status only; billing and renewal details remain reserved for senior governance tiers.'}
                </p>
              </div>
            ) : (
              <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-6 text-sm text-slate-400">
                <p className="font-semibold text-white">Subscription details restricted</p>
                <p className="mt-2">Contact your firm administrator for any subscription changes or upgrades.</p>
              </div>
            )}
          </aside>
        </section>
      </div>
    </div>
  );
};
