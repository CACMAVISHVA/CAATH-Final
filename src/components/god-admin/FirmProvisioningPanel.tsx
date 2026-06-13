import React, { useState } from 'react';
import { CheckCircle2, ClipboardList, KeyRound, Plus, UserPlus } from 'lucide-react';
import { UserRole } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../Toast';
import {
  activateProvisionedUser,
  createFirmProvisioningPackage,
  FirmProvisioningResult,
} from '../../services/firmProvisioningService';

type FirmForm = {
  firmName: string;
  adminName: string;
  adminEmail: string;
  plan: 'Trial' | 'Starter' | 'Professional' | 'Enterprise';
};

type ActivationForm = {
  firmId: string;
  authId: string;
  name: string;
  email: string;
  role: Exclude<UserRole, 'GodAdmin'>;
};

const defaultFirmForm: FirmForm = {
  firmName: '',
  adminName: '',
  adminEmail: '',
  plan: 'Trial',
};

const defaultActivationForm: ActivationForm = {
  firmId: '',
  authId: '',
  name: '',
  email: '',
  role: 'SuperAdmin',
};

export const FirmProvisioningPanel: React.FC<{ onProvisioned?: () => void }> = ({ onProvisioned }) => {
  const { user } = useAuth();
  const toast = useToast();
  const [firmForm, setFirmForm] = useState<FirmForm>(defaultFirmForm);
  const [activationForm, setActivationForm] = useState<ActivationForm>(defaultActivationForm);
  const [result, setResult] = useState<FirmProvisioningResult | null>(null);
  const [busy, setBusy] = useState<'firm' | 'activation' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const createPackage = async () => {
    if (!user) return;
    setBusy('firm');
    setError(null);
    try {
      const next = await createFirmProvisioningPackage(firmForm, user);
      setResult(next);
      setActivationForm((current) => ({
        ...current,
        firmId: next.firmId,
        name: firmForm.adminName,
        email: firmForm.adminEmail,
        role: 'SuperAdmin',
      }));
      setFirmForm(defaultFirmForm);
      toast.success('Provisioning Package Created', 'Firm workspace and subscription shell are ready for admin activation.');
      onProvisioned?.();
    } catch (createError) {
      const message = createError instanceof Error ? createError.message : 'Unable to create provisioning package.';
      setError(message);
      toast.error('Provisioning Failed', message);
    } finally {
      setBusy(null);
    }
  };

  const activateUser = async () => {
    if (!user) return;
    setBusy('activation');
    setError(null);
    try {
      await activateProvisionedUser(activationForm, user);
      toast.success('User Activated', `${activationForm.email} can now log in with role ${activationForm.role}.`);
      setActivationForm(defaultActivationForm);
      onProvisioned?.();
    } catch (activationError) {
      const message = activationError instanceof Error ? activationError.message : 'Unable to activate user.';
      setError(message);
      toast.error('Activation Failed', message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      <section className="border border-slate-800 bg-matte-black-light p-6">
        <div className="mb-5 flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center border border-gold/20 bg-gold/10 text-gold">
            <ClipboardList className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Firm Provisioning Workflow</h3>
            <p className="text-sm text-slate-500">Create firm, subscription shell, admin invite instructions, role activation, and workspace activation.</p>
          </div>
        </div>

        {error && <div className="mb-5 border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>}

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-4 border border-slate-800 bg-matte-black p-5">
            <div className="flex items-center gap-2 text-sm font-bold text-white">
              <Plus className="h-4 w-4 text-gold" />
              Create Firm
            </div>
            <Field label="Firm Name">
              <input value={firmForm.firmName} onChange={(event) => setFirmForm({ ...firmForm, firmName: event.target.value })} className="w-full border border-slate-700 bg-matte-black-light p-3 text-sm text-white outline-none focus:border-gold/40" placeholder="Agarwal & Co" />
            </Field>
            <Field label="Initial Admin Name">
              <input value={firmForm.adminName} onChange={(event) => setFirmForm({ ...firmForm, adminName: event.target.value })} className="w-full border border-slate-700 bg-matte-black-light p-3 text-sm text-white outline-none focus:border-gold/40" placeholder="Priya Sharma" />
            </Field>
            <Field label="Initial Admin Email">
              <input value={firmForm.adminEmail} onChange={(event) => setFirmForm({ ...firmForm, adminEmail: event.target.value })} className="w-full border border-slate-700 bg-matte-black-light p-3 text-sm text-white outline-none focus:border-gold/40" placeholder="admin@firm.com" />
            </Field>
            <Field label="Plan">
              <select value={firmForm.plan} onChange={(event) => setFirmForm({ ...firmForm, plan: event.target.value as FirmForm['plan'] })} className="w-full border border-slate-700 bg-matte-black-light p-3 text-sm text-white outline-none focus:border-gold/40">
                <option value="Trial">Trial</option>
                <option value="Starter">Starter</option>
                <option value="Professional">Professional</option>
                <option value="Enterprise">Enterprise</option>
              </select>
            </Field>
            <button
              onClick={createPackage}
              disabled={busy === 'firm' || !firmForm.firmName.trim() || !firmForm.adminEmail.trim()}
              className="w-full bg-gold p-3 text-sm font-bold text-matte-black disabled:opacity-50"
            >
              {busy === 'firm' ? 'Creating...' : 'Create Firm Package'}
            </button>
          </div>

          <div className="space-y-4 border border-slate-800 bg-matte-black p-5">
            <div className="flex items-center gap-2 text-sm font-bold text-white">
              <UserPlus className="h-4 w-4 text-gold" />
              Activate User Role
            </div>
            <p className="text-xs leading-5 text-slate-500">
              Secure auth-user creation remains outside browser runtime. Create the Supabase Auth user via Dashboard/CLI, then paste the auth user id here to activate the CAATH profile.
            </p>
            <Field label="Firm ID">
              <input value={activationForm.firmId} onChange={(event) => setActivationForm({ ...activationForm, firmId: event.target.value })} className="w-full border border-slate-700 bg-matte-black-light p-3 text-sm text-white outline-none focus:border-gold/40" />
            </Field>
            <Field label="Supabase Auth User ID">
              <input value={activationForm.authId} onChange={(event) => setActivationForm({ ...activationForm, authId: event.target.value })} className="w-full border border-slate-700 bg-matte-black-light p-3 text-sm text-white outline-none focus:border-gold/40" placeholder="auth.users.id" />
            </Field>
            <Field label="Name">
              <input value={activationForm.name} onChange={(event) => setActivationForm({ ...activationForm, name: event.target.value })} className="w-full border border-slate-700 bg-matte-black-light p-3 text-sm text-white outline-none focus:border-gold/40" />
            </Field>
            <Field label="Email">
              <input value={activationForm.email} onChange={(event) => setActivationForm({ ...activationForm, email: event.target.value })} className="w-full border border-slate-700 bg-matte-black-light p-3 text-sm text-white outline-none focus:border-gold/40" />
            </Field>
            <Field label="Role">
              <select value={activationForm.role} onChange={(event) => setActivationForm({ ...activationForm, role: event.target.value as ActivationForm['role'] })} className="w-full border border-slate-700 bg-matte-black-light p-3 text-sm text-white outline-none focus:border-gold/40">
                <option value="SuperAdmin">SuperAdmin</option>
                <option value="Admin">Admin</option>
                <option value="Staff">Staff</option>
                <option value="Client">Client</option>
              </select>
            </Field>
            <button
              onClick={activateUser}
              disabled={busy === 'activation' || !activationForm.firmId || !activationForm.authId || !activationForm.email}
              className="w-full bg-gold p-3 text-sm font-bold text-matte-black disabled:opacity-50"
            >
              {busy === 'activation' ? 'Activating...' : 'Activate Workspace User'}
            </button>
          </div>
        </div>
      </section>

      {result && (
        <section className="border border-emerald-500/20 bg-emerald-500/5 p-5">
          <div className="mb-3 flex items-center gap-2 text-sm font-bold text-emerald-300">
            <CheckCircle2 className="h-4 w-4" />
            Provisioning package ready
          </div>
          <pre className="whitespace-pre-wrap border border-slate-800 bg-matte-black p-4 text-xs text-slate-300">{result.inviteInstructions}</pre>
        </section>
      )}

      <section className="border border-slate-800 bg-matte-black-light p-5">
        <div className="mb-3 flex items-center gap-2 text-sm font-bold text-white">
          <KeyRound className="h-4 w-4 text-gold" />
          Production Guardrail
        </div>
        <p className="text-sm leading-6 text-slate-500">
          CAATH does not create privileged Supabase Auth users from the browser. The visible workflow creates and activates the CAATH tenant shell, while the secure auth identity must be created through approved Supabase admin tooling.
        </p>
      </section>
    </div>
  );
};

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <label className="block">
    <span className="mb-2 block text-xs font-bold uppercase text-slate-500">{label}</span>
    {children}
  </label>
);
