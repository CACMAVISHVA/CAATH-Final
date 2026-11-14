/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Eye, EyeOff, KeyRound, ShieldCheck } from 'lucide-react';
import { User } from '../types';
import { ClientRow } from '../services/clientService';
import { GovernmentPortalConfig, getClientIdentifier, getPortalUsername } from '../services/governmentPortalService';
import { createPortalCredential, PortalCredentialSummary } from '../services/portalLauncherService';
import { Modal } from './Modal';

type Props = {
  client: ClientRow | null;
  portal: GovernmentPortalConfig | null;
  user: User;
  onClose: () => void;
  onSaved: (credential: PortalCredentialSummary) => void;
};

export const PortalCredentialModal: React.FC<Props> = ({ client, portal, user, onClose, onSaved }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setUsername(client && portal ? getPortalUsername(client, portal) : '');
    setPassword('');
    setShowPassword(false);
    setError(null);
  }, [client, portal]);

  const save = async () => {
    if (!client || !portal || !username.trim() || !password) {
      setError('Enter both the portal User ID and password.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const identifier = getClientIdentifier(client, portal);
      const credential = await createPortalCredential({
        clientId: client.id,
        portalType: portal.type,
        portalName: portal.name,
        portalUrl: portal.officialUrl,
        username: username.trim(),
        password,
        gstin: portal.type === 'GST' ? identifier : undefined,
        pan: portal.type === 'IncomeTax' ? identifier : undefined,
        cin: portal.type === 'MCA' ? identifier : undefined,
        user,
      });
      setPassword('');
      onSaved(credential);
      onClose();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save this portal credential.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={Boolean(client && portal)} onClose={onClose} title="Secure Portal Login" size="md">
      {client && portal && (
        <div className="space-y-5">
          <div className="rounded-xl border border-gold/20 bg-gold/10 p-4">
            <div className="flex items-center gap-2 text-gold-light"><KeyRound className="h-4 w-4" /><span className="font-bold">{portal.name}</span></div>
            <p className="mt-1 text-sm text-slate-300">{client.name} · {getClientIdentifier(client, portal) || `${portal.identifierLabel} not entered`}</p>
          </div>

          {error && <div role="alert" className="rounded-xl border border-red-500/25 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>}

          <label className="block">
            <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">Portal User ID</span>
            <input aria-label="Portal User ID" autoComplete="off" value={username} onChange={(event) => setUsername(event.target.value)} className="w-full rounded-xl border border-slate-700 bg-matte-black p-3 text-white outline-none focus:border-gold" />
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">Portal Password</span>
            <span className="relative block">
              <input aria-label="Portal Password" autoComplete="new-password" type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-xl border border-slate-700 bg-matte-black p-3 pr-12 text-white outline-none focus:border-gold" />
              <button type="button" aria-label={showPassword ? 'Hide portal password' : 'Show portal password'} onClick={() => setShowPassword((current) => !current)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-gold">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
            </span>
          </label>

          <div className="flex gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-100">
            <ShieldCheck className="h-5 w-5 shrink-0" />
            <p>The password is encrypted before storage and is never placed in a URL. CAATH Portal Assist fills it only on the matching official portal and never submits the form.</p>
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 rounded-xl bg-slate-800 p-3 font-bold text-white">Cancel</button>
            <button type="button" disabled={saving} onClick={save} className="flex-1 rounded-xl bg-gold p-3 font-bold text-matte-black disabled:opacity-50">{saving ? 'Encrypting...' : 'Save Securely'}</button>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default PortalCredentialModal;
