import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, DollarSign, ShieldCheck, Users, Lock, ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getWorkforceProfiles } from '../services/workforceService';
import { approvePayrollRun, getPayrollRuns, getSalaryStructures, logPayrollWorkspaceAccess, submitPayrollApproval } from '../services/payrollService';
import { getOperationalHealthSummary } from '../services/operationalIntelligenceService';
import { Modal } from './Modal';
import { authService } from '../domains/auth/services/authService';

export const PayrollWorkspace: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [password, setPassword] = useState('');
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [lastActivityAt, setLastActivityAt] = useState<number>(Date.now());
  const [profiles, setProfiles] = useState<any[]>([]);
  const [structures, setStructures] = useState<any[]>([]);
  const [runs, setRuns] = useState<any[]>([]);
  const [insight, setInsight] = useState<any>(null);
  const PAYROLL_TIMEOUT_MS = 5 * 60 * 1000;
  const noopClose = useCallback(() => {}, []);
  const unlockStorageKey = useMemo(
    () => (user?.id && user?.firmId ? `caath:payroll-unlock:${user.id}:${user.firmId}` : ''),
    [user?.id, user?.firmId]
  );

  const persistUnlock = useCallback(
    (expiresAt: number) => {
      if (!unlockStorageKey) return;
      sessionStorage.setItem(unlockStorageKey, String(expiresAt));
    },
    [unlockStorageKey]
  );

  const clearPersistedUnlock = useCallback(() => {
    if (!unlockStorageKey) return;
    sessionStorage.removeItem(unlockStorageKey);
  }, [unlockStorageKey]);

  const load = async () => {
    if (!user?.firmId || !isUnlocked) return;
    setLoading(true);
    try {
      const [wf, ss, pr] = await Promise.all([
        getWorkforceProfiles(user.firmId, user),
        getSalaryStructures(user.firmId, user),
        getPayrollRuns(user.firmId, user),
      ]);
      setProfiles(wf);
      setStructures(ss);
      setRuns(pr);
      if (user.role === 'SuperAdmin') {
        const op = await getOperationalHealthSummary(user.firmId);
        setInsight(op);
      } else {
        setInsight(null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [user?.firmId, user?.id, isUnlocked]);

  useEffect(() => {
    if (!unlockStorageKey) return;
    const raw = sessionStorage.getItem(unlockStorageKey);
    const expiresAt = raw ? Number(raw) : 0;
    if (expiresAt > Date.now()) {
      setIsUnlocked(true);
      setLastActivityAt(Date.now());
    } else {
      clearPersistedUnlock();
      setIsUnlocked(false);
    }
  }, [unlockStorageKey, clearPersistedUnlock]);

  useEffect(() => {
    if (!isUnlocked || !user?.firmId) return;
    const onActivity = () => {
      const now = Date.now();
      setLastActivityAt(now);
      persistUnlock(now + PAYROLL_TIMEOUT_MS);
    };
    window.addEventListener('mousemove', onActivity);
    window.addEventListener('keydown', onActivity);
    window.addEventListener('click', onActivity);
    const timer = window.setInterval(() => {
      if (Date.now() - lastActivityAt >= PAYROLL_TIMEOUT_MS) {
        setIsUnlocked(false);
        setPassword('');
        setUnlockError(null);
        clearPersistedUnlock();
        logPayrollWorkspaceAccess(user.firmId!, user, 'timeout_locked');
      }
    }, 30000);

    return () => {
      window.removeEventListener('mousemove', onActivity);
      window.removeEventListener('keydown', onActivity);
      window.removeEventListener('click', onActivity);
      window.clearInterval(timer);
    };
  }, [isUnlocked, user?.firmId, user?.id, lastActivityAt, persistUnlock, clearPersistedUnlock]);

  const verifyPayrollAccess = async () => {
    if (!user?.email || !user?.firmId) return;
    setVerifying(true);
    setUnlockError(null);
    try {
      await authService.login({ email: user.email, password });
    } catch {
      setUnlockError('Secure verification failed. Please re-enter your password.');
      setVerifying(false);
      return;
    }
    setIsUnlocked(true);
    setLastActivityAt(Date.now());
    persistUnlock(Date.now() + PAYROLL_TIMEOUT_MS);
    setPassword('');
    await logPayrollWorkspaceAccess(user.firmId, user, 'unlocked');
    setVerifying(false);
  };

  const lockPayroll = async () => {
    if (!user?.firmId) return;
    setIsUnlocked(false);
    setPassword('');
    setUnlockError(null);
    clearPersistedUnlock();
    await logPayrollWorkspaceAccess(user.firmId, user, 'locked');
  };

  const pendingApprovals = useMemo(() => runs.filter((r) => r.payout_status === 'Pending Approval').length, [runs]);
  const totalMonthlyComp = useMemo(() => runs.reduce((sum, r) => sum + Number(r.net_amount || 0), 0), [runs]);

  if (!user) return null;

  return (
    <div className="p-8 space-y-6 h-full bg-matte-black text-slate-300 overflow-y-auto">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold gold-text-gradient">Payroll & Workforce</h2>
          <p className="text-slate-500">Compensation foundation, payroll governance, and workforce operational visibility.</p>
        </div>
        {isUnlocked && (
          <button
            onClick={lockPayroll}
            className="flex items-center gap-2 px-3 py-2 border border-slate-800 text-xs font-bold text-slate-300 hover:text-white"
          >
            <Lock className="w-3 h-3" />
            Lock Payroll
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 bg-matte-black-light border border-slate-800 rounded-xl"><p className="text-xs text-slate-500">Workforce Profiles</p><p className="text-2xl text-white font-bold">{user.role === 'SuperAdmin' ? profiles.length : 1}</p></div>
        <div className="p-4 bg-matte-black-light border border-slate-800 rounded-xl"><p className="text-xs text-slate-500">Salary Structures</p><p className="text-2xl text-white font-bold">{structures.length}</p></div>
        <div className="p-4 bg-matte-black-light border border-slate-800 rounded-xl"><p className="text-xs text-slate-500">Pending Approvals</p><p className="text-2xl text-amber-400 font-bold">{user.role === 'SuperAdmin' ? pendingApprovals : 0}</p></div>
        <div className="p-4 bg-matte-black-light border border-slate-800 rounded-xl"><p className="text-xs text-slate-500">Monthly Net Payout</p><p className="text-2xl text-emerald-400 font-bold">INR {totalMonthlyComp.toLocaleString()}</p></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-5 bg-matte-black-light border border-slate-800 rounded-xl">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><Users className="w-4 h-4 text-gold" />Employee Compensation</h3>
          <div className="space-y-2 max-h-[360px] overflow-y-auto">
            {structures.map((s) => (
              <div key={s.id} className="p-3 bg-matte-black border border-slate-800 rounded-lg text-sm">
                <div className="flex justify-between"><span className="text-slate-400">Employee</span><span className="text-white font-bold">{s.employee_user_id}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Base</span><span className="text-white">INR {Number(s.base_salary).toLocaleString()}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Incentives+Bonus</span><span className="text-emerald-400">INR {(Number(s.incentives) + Number(s.bonus)).toLocaleString()}</span></div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-5 bg-matte-black-light border border-slate-800 rounded-xl">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><DollarSign className="w-4 h-4 text-gold" />Payroll Runs</h3>
          <div className="space-y-2 max-h-[360px] overflow-y-auto">
            {runs.map((run) => (
              <div key={run.id} className="p-3 bg-matte-black border border-slate-800 rounded-lg text-sm">
                <div className="flex justify-between"><span className="text-slate-400">Period</span><span className="text-white font-bold">{run.payroll_period}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Net</span><span className="text-emerald-400 font-bold">INR {Number(run.net_amount).toLocaleString()}</span></div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Status</span>
                  <span className="text-white">{run.payout_status}</span>
                </div>
                <div className="flex gap-2 pt-2">
                  {user.role === 'SuperAdmin' && (
                    <button onClick={() => submitPayrollApproval(run.id, user, user.firmId!)} className="px-2 py-1 text-xs bg-slate-800 rounded border border-slate-700">Submit Approval</button>
                  )}
                  {user.role === 'SuperAdmin' && run.payout_status === 'Pending Approval' && (
                    <button onClick={() => approvePayrollRun(run.id, user, user.firmId!).then(load)} className="px-2 py-1 text-xs bg-gold text-matte-black rounded font-bold">Approve</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {user.role === 'SuperAdmin' && (
        <div className="p-5 bg-matte-black-light border border-slate-800 rounded-xl">
          <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-gold" />Workforce Operational Insights</h3>
          <p className="text-sm text-slate-400">Uses operational telemetry for compensation governance context.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4 text-sm">
            <div className="p-3 bg-matte-black border border-slate-800 rounded">Workload Risk: <span className="text-white font-bold">{insight?.workloadRisk ?? '-'}</span></div>
            <div className="p-3 bg-matte-black border border-slate-800 rounded">Approval Pressure: <span className="text-white font-bold">{insight?.approvalPressure ?? '-'}</span></div>
            <div className="p-3 bg-matte-black border border-slate-800 rounded">Automation Reliability: <span className="text-white font-bold">{insight?.automationReliability ?? '-'}</span></div>
          </div>
          <div className="mt-4 text-xs text-slate-500 flex items-center gap-2"><CheckCircle2 className="w-3 h-3" />Future-ready foundation prepared for attendance, leave, PF/ESI/TDS, payslips, and exports.</div>
        </div>
      )}

      {loading && <p className="text-slate-500 text-sm">Loading payroll workspace...</p>}

      <Modal
        isOpen={!isUnlocked}
        onClose={noopClose}
        closeOnOverlay={false}
        title="Secure Payroll Verification Required"
        description="Payroll is a sensitive enterprise area. Re-enter your password to continue."
        size="md"
      >
        <div className="space-y-4">
          <div className="p-3 rounded-lg border border-amber-500/20 bg-amber-500/10 text-amber-300 text-sm flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 mt-0.5" />
            <span>Compensation data is confidential and protected by step-up authentication.</span>
          </div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
            placeholder="Re-enter account password"
            className="w-full p-3 rounded-xl bg-matte-black border border-slate-700 text-white"
          />
          {unlockError && <p className="text-sm text-red-400">{unlockError}</p>}
          <button
            onClick={verifyPayrollAccess}
            disabled={verifying || !password.trim()}
            className="w-full p-3 rounded-xl bg-gold text-matte-black font-bold disabled:opacity-50"
          >
            {verifying ? 'Verifying...' : 'Unlock Payroll Workspace'}
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default PayrollWorkspace;
