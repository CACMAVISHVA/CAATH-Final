import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { authService } from '../domains/auth/services/authService';
import { recoveryLinkError } from '../lib/passwordRecovery';
import { normalizeAuthError } from '../lib/authErrorNormalizer';
import { Logo } from './Logo';
import { useToast } from './Toast';

export function PasswordRecoveryScreen() {
  const { session, isLoading, finishPasswordRecovery } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [error, setError] = useState<string | null>(recoveryLinkError);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [visible, setVisible] = useState(false);
  const submitting = useRef(false);
  const expired = !isLoading && (!session || Boolean(recoveryLinkError()));

  async function goToLogin(updated: boolean) {
    await finishPasswordRecovery();
    navigate(updated ? '/login?password=updated' : '/login?auth=forgot', { replace: true });
    if (updated) toast.success('Password reset successfully', 'Sign in with your new password.');
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    // Passwords are opaque: preserve intentional spaces exactly.
    const password = String(data.get('password') ?? '');
    const confirmation = String(data.get('confirmPassword') ?? '');
    if (password.length < 12 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
      setError('Use at least 12 characters with uppercase, lowercase, a number, and a symbol.');
      return;
    }
    if (password !== confirmation) { setError('The two passwords do not match.'); return; }
    submitting.current = true;
    setBusy(true);
    setError(null);
    let passwordUpdated = false;
    try {
      await authService.updatePassword(password);
      passwordUpdated = true;
      form.reset();
      setSaved(true);
      await goToLogin(true);
    } catch (cause) {
      setError(passwordUpdated
        ? 'Your password was reset successfully, but sign-out could not finish. Check your connection and select Continue to sign in.'
        : normalizeAuthError(cause).userMessage);
    } finally { submitting.current = false; setBusy(false); }
  }

  async function retryOrRequest() {
    setBusy(true);
    try { await goToLogin(saved); }
    catch { setError('Could not finish signing out. Check your connection and try again.'); }
    finally { setBusy(false); }
  }

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-matte-black px-4 py-8 text-white">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center"><Logo size="lg" /></div>
        <section aria-labelledby="recovery-title" className="border border-slate-800 bg-matte-black-light p-5 shadow-xl sm:p-7">
          <h1 id="recovery-title" className="text-2xl font-bold">{saved ? 'Password reset successfully' : expired ? 'Request a new reset link' : 'Set New Password'}</h1>
          <p className="mt-2 text-sm text-slate-400">{saved ? 'Your new password is saved. Continue to Sign In.' : 'Set a new password to regain access to your CAATH account.'}</p>
          {error && <p role="alert" className="mt-4 border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</p>}
          {isLoading ? <p role="status" className="mt-5 flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Checking your reset link…</p> : saved || expired ? (
            <div className="mt-5 space-y-4">
              {saved ? <CheckCircle2 className="h-10 w-10 text-emerald-400" /> : !error && <p className="text-sm text-amber-200">This link is missing, expired, or already used. Request a fresh link to continue.</p>}
              <button disabled={busy} onClick={retryOrRequest} className="min-h-11 w-full bg-gold px-4 py-3 font-bold text-black disabled:opacity-50">{busy ? 'Please wait…' : saved ? 'Continue to sign in' : 'Request a new reset link'}</button>
            </div>
          ) : (
            <form onSubmit={submit} noValidate className="mt-6 space-y-4">
              {[['password', 'New password'], ['confirmPassword', 'Confirm new password']].map(([name, label]) => (
                <div key={name}>
                  <label htmlFor={`recovery-${name}`} className="mb-2 block text-sm text-slate-300">{label}</label>
                  <input id={`recovery-${name}`} name={name} type={visible ? 'text' : 'password'} autoComplete="new-password" required minLength={12} disabled={busy} className="min-h-11 w-full border border-slate-700 bg-matte-black px-3 py-3 text-base" />
                </div>
              ))}
              <button type="button" onClick={() => setVisible(value => !value)} aria-pressed={visible} className="flex min-h-11 items-center gap-2 text-sm text-slate-300">{visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}{visible ? 'Hide passwords' : 'Show passwords'}</button>
              <p className="text-xs leading-5 text-slate-400">Use 12+ characters with uppercase, lowercase, a number, and a symbol.</p>
              <button type="submit" disabled={busy} className="flex min-h-11 w-full items-center justify-center gap-2 bg-gold px-4 py-3 font-bold text-black disabled:opacity-50">{busy && <Loader2 className="h-4 w-4 animate-spin" />}{busy ? 'Updating password…' : 'Update Password'}</button>
              <button type="button" disabled={busy} onClick={retryOrRequest} className="min-h-11 w-full text-sm text-slate-400">Cancel and request another link</button>
            </form>
          )}
        </section>
      </div>
    </main>
  );
}
