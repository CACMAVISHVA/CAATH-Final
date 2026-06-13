import React, { useEffect, useState } from 'react';
import { RefreshCw, ShieldAlert, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { QaSimulationReport, runEnterpriseQaSimulation } from '../services/qaSimulationService';

export const OperationalQaInspector: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<QaSimulationReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runAudit = async () => {
    if (!user?.firmId) return;
    setLoading(true);
    setError(null);
    try {
      const result = await runEnterpriseQaSimulation(user.firmId, user);
      setReport(result);
    } catch (auditError) {
      setError(auditError instanceof Error ? auditError.message : 'QA simulation failed.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runAudit();
  }, []);

  return (
    <div className="p-8 space-y-6 h-full bg-matte-black text-slate-300 overflow-y-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold gold-text-gradient">Operational QA Inspector</h2>
          <p className="text-slate-500">Multi-role workflow simulation and governance integrity checks.</p>
        </div>
        <button
          onClick={runAudit}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-gold text-matte-black rounded-lg text-sm font-bold disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Run Simulation
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/10 text-red-400">{error}</div>
      )}

      {report && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 bg-matte-black-light border border-slate-800 rounded-xl">
              <p className="text-xs text-slate-500 uppercase tracking-wider">Checks Run</p>
              <p className="text-2xl font-bold text-white">{report.summary.checksRun}</p>
            </div>
            <div className="p-4 bg-matte-black-light border border-slate-800 rounded-xl">
              <p className="text-xs text-slate-500 uppercase tracking-wider">Passed</p>
              <p className="text-2xl font-bold text-emerald-400">{report.summary.passed}</p>
            </div>
            <div className="p-4 bg-matte-black-light border border-slate-800 rounded-xl">
              <p className="text-xs text-slate-500 uppercase tracking-wider">Failed</p>
              <p className="text-2xl font-bold text-red-400">{report.summary.failed}</p>
            </div>
            <div className="p-4 bg-matte-black-light border border-slate-800 rounded-xl">
              <p className="text-xs text-slate-500 uppercase tracking-wider">Last Run</p>
              <p className="text-sm font-bold text-white">{new Date(report.summary.timestamp).toLocaleString()}</p>
            </div>
          </div>

          <div className="p-5 bg-matte-black-light border border-slate-800 rounded-xl space-y-3">
            <h3 className="text-lg font-bold text-white">Role Simulation Matrix</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-gold font-bold mb-2">SuperAdmin</p>
                {report.roleSimulation.superAdmin.map((line) => <p key={line} className="text-slate-400">{line}</p>)}
              </div>
              <div>
                <p className="text-gold font-bold mb-2">Admin</p>
                {report.roleSimulation.admin.map((line) => <p key={line} className="text-slate-400">{line}</p>)}
              </div>
              <div>
                <p className="text-gold font-bold mb-2">Staff</p>
                {report.roleSimulation.staff.map((line) => <p key={line} className="text-slate-400">{line}</p>)}
              </div>
            </div>
          </div>

          <div className="p-5 bg-matte-black-light border border-slate-800 rounded-xl space-y-3">
            <h3 className="text-lg font-bold text-white">Trace Summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
              <div className="p-3 bg-matte-black border border-slate-800 rounded-lg">Task Events: <span className="text-white font-bold">{report.traces.taskEvents}</span></div>
              <div className="p-3 bg-matte-black border border-slate-800 rounded-lg">Approval Events: <span className="text-white font-bold">{report.traces.approvalEvents}</span></div>
              <div className="p-3 bg-matte-black border border-slate-800 rounded-lg">Escalations: <span className="text-white font-bold">{report.traces.escalationEvents}</span></div>
              <div className="p-3 bg-matte-black border border-slate-800 rounded-lg">Reassignments: <span className="text-white font-bold">{report.traces.reassignmentEvents}</span></div>
              <div className="p-3 bg-matte-black border border-slate-800 rounded-lg">Notification Events: <span className="text-white font-bold">{report.traces.notificationEvents}</span></div>
            </div>
          </div>

          <div className="p-5 bg-matte-black-light border border-slate-800 rounded-xl">
            <h3 className="text-lg font-bold text-white mb-4">Detected Issues</h3>
            {report.issues.length === 0 ? (
              <div className="flex items-center gap-2 text-emerald-400">
                <ShieldCheck className="w-4 h-4" />
                <span>No governance integrity issues detected in this run.</span>
              </div>
            ) : (
              <div className="space-y-2">
                {report.issues.map((issue, index) => (
                  <div key={`${issue.referenceId || 'issue'}-${index}`} className="p-3 rounded-lg border border-slate-800 bg-matte-black flex items-start gap-3">
                    <ShieldAlert className={`w-4 h-4 mt-0.5 ${issue.severity === 'high' ? 'text-red-400' : issue.severity === 'medium' ? 'text-amber-400' : 'text-slate-400'}`} />
                    <div>
                      <p className="text-sm text-white">
                        <span className="uppercase text-[10px] tracking-wider text-slate-500 mr-2">{issue.area}</span>
                        {issue.message}
                      </p>
                      {issue.referenceId && <p className="text-xs text-slate-500 mt-1">Ref: {issue.referenceId}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default OperationalQaInspector;

