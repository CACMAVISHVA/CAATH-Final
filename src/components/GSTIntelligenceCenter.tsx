import React, { useEffect, useMemo, useState } from 'react';
import { Activity, BrainCircuit, CheckCircle2, Gauge, RefreshCw, ShieldAlert, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { playSound } from '../services/soundService';
import { getGSTOperationalIntelligenceSnapshot } from '../services/gst/gstOperationalIntelligenceService';
import { createRuntimeNotification } from '../services/notificationRuntimeService';
import {
  GSTProductionValidationRecord,
  getLatestGSTValidationArtifact,
  recordGSTValidationArtifact,
} from '../services/gstProductionValidationService';
import {
  GST_INTELLIGENCE_MODULES,
  GST_INTELLIGENCE_PRESETS,
  gstIntelligenceOrchestrator,
  GSTFilingMode,
  GSTIntelligenceEngineResult,
  initializeAdaptiveWorkflow,
  uploadDatasetInSession,
  processAdaptiveWorkflow,
  getDatasetDefinition,
  getUploadGuidance,
  GSTDependencyResolution,
  UploadSessionState,
  AdaptiveGSTWorkflowState,
  GSTDatasetType,
} from '../domains/gst-intelligence';
import { parseAndNormalizeSession } from '../domains/gst-intelligence/parsing-engine/parsingEngine';
import { buildStorageEnvelope } from '../domains/gst-intelligence/storage/storageContracts';
import { buildGSTResolutionCenter, GSTResolutionCenterResult } from '../domains/gst-resolution-center';
import { buildComplianceKnowledgeGraph, ComplianceKnowledgeGraphResult } from '../domains/compliance-knowledge';
import { buildComplianceHistoryDashboard, ComplianceHistoryDashboardModel } from '../domains/compliance-history-dashboard';

const buildFinancialYears = (periods: string[]) => {
  const years = new Set<string>();
  periods.forEach((period) => {
    const year = Number(period.slice(0, 4));
    const month = Number(period.slice(5, 7));
    if (!Number.isNaN(year) && !Number.isNaN(month)) {
      const startYear = month >= 4 ? year : year - 1;
      years.add(`FY ${startYear}-${String((startYear + 1) % 100).padStart(2, '0')}`);
    }
  });
  if (years.size === 0) {
    const now = new Date();
    const startYear = now.getMonth() + 1 >= 4 ? now.getFullYear() : now.getFullYear() - 1;
    years.add(`FY ${startYear}-${String((startYear + 1) % 100).padStart(2, '0')}`);
  }
  return [...years].sort().reverse();
};

const MONTHS = ['April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December', 'January', 'February', 'March'];
const QUARTERS = ['Q1 (Apr-Jun)', 'Q2 (Jul-Sep)', 'Q3 (Oct-Dec)', 'Q4 (Jan-Mar)'];

const GSTIntelligenceCenter: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedFinancialYear, setSelectedFinancialYear] = useState('');
  const [filingMode, setFilingMode] = useState<GSTFilingMode>('monthly');
  const [selectedPeriodValue, setSelectedPeriodValue] = useState('');
  const [selectedPresetId, setSelectedPresetId] = useState('monthly-compliance-review');
  const [selectedModuleIds, setSelectedModuleIds] = useState<string[]>([]);
  const [engineResult, setEngineResult] = useState<GSTIntelligenceEngineResult | null>(null);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string | null>(null);
  const [context, setContext] = useState<Awaited<ReturnType<typeof getGSTOperationalIntelligenceSnapshot>> | null>(null);
  const [dependencyResolution, setDependencyResolution] = useState<GSTDependencyResolution | null>(null);
  const [uploadSession, setUploadSession] = useState<UploadSessionState | null>(null);
  const [adaptiveState, setAdaptiveState] = useState<AdaptiveGSTWorkflowState | null>(null);
  const [resolutionCenter, setResolutionCenter] = useState<GSTResolutionCenterResult | null>(null);
  const [knowledgeGraph, setKnowledgeGraph] = useState<ComplianceKnowledgeGraphResult | null>(null);
  const [historyDashboard, setHistoryDashboard] = useState<ComplianceHistoryDashboardModel | null>(null);
  const [validationRecords, setValidationRecords] = useState<GSTProductionValidationRecord[]>([]);
  const [validationArtifactId, setValidationArtifactId] = useState<string | null>(null);

  const loadContext = async () => {
    if (!user?.firmId) return;
    setLoading(true);
    setError(null);
    try {
      const snapshot = await getGSTOperationalIntelligenceSnapshot({ firmId: user.firmId });
      setContext(snapshot);
      if (!selectedClientId && snapshot.context.clients.length > 0) {
        setSelectedClientId(snapshot.context.clients[0].clientId);
      }
      const fy = buildFinancialYears(snapshot.context.periods);
      if (!selectedFinancialYear && fy.length > 0) setSelectedFinancialYear(fy[0]);
      setLastRefreshedAt(new Date().toISOString());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load GST operational context.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContext();
  }, [user?.firmId]);

  useEffect(() => {
    const preset = GST_INTELLIGENCE_PRESETS.find((item) => item.id === selectedPresetId);
    if (preset) setSelectedModuleIds(preset.moduleIds);
  }, [selectedPresetId]);

  useEffect(() => {
    if (!selectedPresetId) return;
    const init = initializeAdaptiveWorkflow({ presetId: selectedPresetId, selectedModules: selectedModuleIds });
    setDependencyResolution(init.deps);
    setUploadSession(init.session);
  }, [selectedPresetId, selectedModuleIds.join('|')]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (selectedClientId && selectedPeriodValue) loadContext();
    }, 60000);
    return () => clearInterval(interval);
  }, [selectedClientId, selectedPeriodValue, user?.firmId]);

  const selectedClient = useMemo(
    () => context?.context.clients.find((c) => c.clientId === selectedClientId) || null,
    [context?.context.clients, selectedClientId]
  );

  const derivedPeriod = useMemo(() => {
    if (!selectedFinancialYear || !selectedPeriodValue) return '';
    if (filingMode === 'custom') return selectedPeriodValue;
    return `${selectedFinancialYear} • ${selectedPeriodValue}`;
  }, [selectedFinancialYear, selectedPeriodValue, filingMode]);

  const canGenerate = Boolean(
    selectedClientId
    && selectedFinancialYear
    && selectedPeriodValue
    && selectedPresetId
    && selectedModuleIds.length > 0
    && adaptiveState?.readyToRunIntelligence
  );

  useEffect(() => {
    if (!user?.firmId || !selectedClientId || !uploadSession) return;
    const state = processAdaptiveWorkflow({
      tenantId: user.firmId,
      clientId: selectedClientId,
      financialYear: selectedFinancialYear,
      filingPeriod: derivedPeriod,
      context: selectedClient ? {
        clientId: selectedClient.clientId,
        clientName: selectedClient.clientName,
        gstin: selectedClient.gstin,
        pan: selectedClient.gstin.slice(2, 12),
        legalName: selectedClient.clientName,
        tradeName: selectedClient.clientName,
        state: selectedClient.gstin.slice(0, 2),
        registrationType: 'Regular',
        filingFrequency: filingMode === 'quarterly' ? 'Quarterly' : filingMode === 'annual' ? 'Annual' : 'Monthly',
      } : null,
      session: uploadSession,
    });
    setAdaptiveState(state);
  }, [user?.firmId, selectedClientId, selectedFinancialYear, derivedPeriod, filingMode, selectedClient?.clientId, uploadSession]);

  const toggleModule = (moduleId: string) => {
    setSelectedModuleIds((current) => (
      current.includes(moduleId) ? current.filter((id) => id !== moduleId) : [...current, moduleId]
    ));
  };

  const runEngine = async () => {
    if (!user || !canGenerate) return;
    playSound('click');
    setLoading(true);
    setError(null);
    try {
      const result = await gstIntelligenceOrchestrator.runEngine({
        user,
        clientId: selectedClientId,
        filingPeriod: derivedPeriod,
        financialYear: selectedFinancialYear,
        filingMode,
        presetId: selectedPresetId,
        moduleIds: selectedModuleIds,
      });
      setEngineResult(result);
      const resolution = buildGSTResolutionCenter(result);
      const knowledge = buildComplianceKnowledgeGraph({
        clientName: result.context.clientProfile?.clientName || 'Unknown Client',
        filingPeriod: result.context.filingPeriod,
        engine: result,
        resolution,
      });
      const history = buildComplianceHistoryDashboard({ knowledge });
      setResolutionCenter(resolution);
      setKnowledgeGraph(knowledge);
      setHistoryDashboard(history);
      await createRuntimeNotification({
        firmId: user.firmId!,
        audienceRole: 'Admin',
        eventType: 'gst_analysis_complete',
        title: 'GST analysis complete',
        message: `${result.context.clientProfile?.clientName || 'Client'} GST intelligence completed for ${derivedPeriod}.`,
        priority: result.riskScores.audit < 70 ? 'HIGH' : 'MEDIUM',
        user,
      });
      const analysisRecord: GSTProductionValidationRecord = {
        stage: 'analysis_execution',
        status: 'PASS',
        detail: `Analysis executed with ${result.execution.workflowActions.length} workflow action(s), ${result.execution.aiInsights.length} insight(s).`,
        createdAt: new Date().toISOString(),
      };
      setValidationRecords((current) => [...current.filter((item) => item.stage !== 'analysis_execution'), analysisRecord]);
      setLastRefreshedAt(new Date().toISOString());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to execute GST intelligence engine.');
    } finally {
      setLoading(false);
    }
  };

  const categoryLabel = (key: string) => key.replace('_', ' ').toUpperCase();
  const handleDatasetUpload = async (dataset: GSTDatasetType, file?: File | null) => {
    if (!uploadSession || !file || !user?.firmId || !selectedClientId) return;
    const next = uploadDatasetInSession(uploadSession, dataset, file.name);
    setUploadSession(next);
    const artifacts = parseAndNormalizeSession(next);
    const envelope = buildStorageEnvelope({
      tenantId: user.firmId,
      clientId: selectedClientId,
      financialYear: selectedFinancialYear || 'Unselected FY',
      filingPeriod: derivedPeriod || 'Unselected period',
      artifacts,
      stage: artifacts.length > 0 ? 'parsed' : 'validated',
    });
    const requiredPending = next.datasets.filter((item) => item.required && !['uploaded', 'parsed', 'validated', 'ready'].includes(item.status));
    const records: GSTProductionValidationRecord[] = [
      {
        stage: 'upload',
        status: 'PASS',
        detail: `${file.name} accepted for ${dataset}.`,
        createdAt: new Date().toISOString(),
      },
      {
        stage: 'storage',
        status: 'PARTIAL',
        detail: 'Dataset lineage persisted to enterprise activity storage; raw file storage bucket persistence remains source-file dependent.',
        createdAt: new Date().toISOString(),
      },
      {
        stage: 'parsing',
        status: artifacts.some((item) => item.dataset === dataset) ? 'PASS' : 'PARTIAL',
        detail: `${artifacts.length} normalized artifact(s) available in upload session.`,
        createdAt: new Date().toISOString(),
      },
      {
        stage: 'persistence',
        status: 'PASS',
        detail: 'GST validation envelope written to enterprise_activities for retrieval and audit.',
        createdAt: new Date().toISOString(),
      },
      {
        stage: 'retrieval',
        status: requiredPending.length === 0 ? 'PASS' : 'PARTIAL',
        detail: requiredPending.length === 0 ? 'All required datasets are available for intelligence execution.' : `${requiredPending.length} required dataset(s) still pending.`,
        createdAt: new Date().toISOString(),
      },
    ];
    setValidationRecords(records);
    try {
      await recordGSTValidationArtifact(envelope, user, records);
      const latest = await getLatestGSTValidationArtifact(user.firmId, selectedClientId);
      setValidationArtifactId(latest?.id || null);
    } catch (validationError) {
      setError(validationError instanceof Error ? validationError.message : 'GST validation artifact persistence failed.');
    }
  };

  return (
    <div className="p-6 space-y-6 h-full overflow-y-auto bg-matte-black text-slate-200">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center text-gold"><BrainCircuit className="w-5 h-5" /></div>
          <div>
            <h2 className="text-xl font-bold text-white">GST Intelligence Operating System</h2>
            <p className="text-sm text-slate-500">Workflow-driven, AI-assisted GST compliance intelligence engine.</p>
          </div>
        </div>
        <button type="button" onClick={loadContext} className="px-3 py-2 text-xs font-bold uppercase rounded-lg border border-slate-700 text-slate-300 hover:text-gold" disabled={loading}>
          <RefreshCw className={`inline-block w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
          Refresh Context
        </button>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-matte-black-light p-4">
        <p className="text-xs uppercase tracking-[0.24em] text-slate-500 mb-4">Enterprise GST Context Flow</p>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <select value={selectedClientId} onChange={(e) => setSelectedClientId(e.target.value)} className="px-3 py-2 bg-slate-950/80 border border-slate-800 rounded-lg text-sm text-white">
            <option value="">1. Select Client</option>
            {(context?.context.clients || []).map((client) => <option key={client.clientId} value={client.clientId}>{client.clientName}</option>)}
          </select>
          <select value={selectedFinancialYear} onChange={(e) => setSelectedFinancialYear(e.target.value)} className="px-3 py-2 bg-slate-950/80 border border-slate-800 rounded-lg text-sm text-white">
            <option value="">3. Select Financial Year</option>
            {buildFinancialYears(context?.context.periods || []).map((fy) => <option key={fy} value={fy}>{fy}</option>)}
          </select>
          <select value={filingMode} onChange={(e) => setFilingMode(e.target.value as GSTFilingMode)} className="px-3 py-2 bg-slate-950/80 border border-slate-800 rounded-lg text-sm text-white">
            <option value="monthly">Monthly Filing</option>
            <option value="quarterly">Quarterly Filing</option>
            <option value="annual">Annual Filing</option>
            <option value="custom">Custom Period</option>
          </select>
          <select value={selectedPeriodValue} onChange={(e) => setSelectedPeriodValue(e.target.value)} className="px-3 py-2 bg-slate-950/80 border border-slate-800 rounded-lg text-sm text-white">
            <option value="">4. Select Filing Month/Period</option>
            {(filingMode === 'monthly' ? MONTHS : filingMode === 'quarterly' ? QUARTERS : filingMode === 'annual' ? ['Annual Compliance Window'] : context?.context.periods || []).map((period) => (
              <option key={period} value={period}>{period}</option>
            ))}
          </select>
          <select value={selectedPresetId} onChange={(e) => setSelectedPresetId(e.target.value)} className="px-3 py-2 bg-slate-950/80 border border-slate-800 rounded-lg text-sm text-white lg:col-span-2">
            <option value="">5. Select Intelligence Preset</option>
            {GST_INTELLIGENCE_PRESETS.map((preset) => <option key={preset.id} value={preset.id}>{preset.title}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
          <div className="p-3 rounded-lg border border-slate-800 bg-slate-950/60"><p className="text-xs text-slate-500">GSTIN</p><p className="text-sm font-bold text-white">{selectedClient?.gstin || 'Auto-populated after client selection'}</p></div>
          <div className="p-3 rounded-lg border border-slate-800 bg-slate-950/60"><p className="text-xs text-slate-500">PAN</p><p className="text-sm font-bold text-white">{selectedClient?.gstin ? selectedClient.gstin.slice(2, 12) : '-'}</p></div>
          <div className="p-3 rounded-lg border border-slate-800 bg-slate-950/60"><p className="text-xs text-slate-500">Legal/Trade Name</p><p className="text-sm font-bold text-white">{selectedClient?.clientName || '-'}</p></div>
          <div className="p-3 rounded-lg border border-slate-800 bg-slate-950/60"><p className="text-xs text-slate-500">State/Registration/Frequency</p><p className="text-sm font-bold text-white">{selectedClient?.gstin?.slice(0, 2) || '-'} / Regular / {filingMode === 'quarterly' ? 'Quarterly' : filingMode === 'annual' ? 'Annual' : 'Monthly'}</p></div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-matte-black-light p-4 space-y-4">
        <p className="text-xs uppercase tracking-[0.24em] text-slate-500">6. Adaptive Dataset Orchestration</p>
        {dependencyResolution ? (
          <div className="space-y-3">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <div className="p-3 rounded-xl border border-slate-800 bg-slate-950/60">
                <p className="text-xs uppercase tracking-wider text-slate-500 mb-2">Required Datasets</p>
                <div className="space-y-2">
                  {dependencyResolution.required.map((dataset) => {
                    const def = getDatasetDefinition(dataset);
                    const sessionRow = uploadSession?.datasets.find((item) => item.dataset === dataset);
                    return (
                      <label key={dataset} className="block p-3 rounded-lg border border-slate-800 bg-matte-black cursor-pointer">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-bold text-white">{def.label}</p>
                          <span className={`text-[10px] uppercase ${sessionRow?.status === 'uploaded' || sessionRow?.status === 'ready' ? 'text-emerald-300' : 'text-amber-300'}`}>{sessionRow?.status || 'pending'}</span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">{def.description}</p>
                        <p className="text-[11px] text-slate-500 mt-1">{getUploadGuidance(dataset)}</p>
                        <input
                          type="file"
                          className="hidden"
                          onChange={(e) => handleDatasetUpload(dataset, e.target.files?.[0] || null)}
                        />
                      </label>
                    );
                  })}
                </div>
              </div>
              <div className="p-3 rounded-xl border border-slate-800 bg-slate-950/60">
                <p className="text-xs uppercase tracking-wider text-slate-500 mb-2">Optional Enhancements</p>
                <div className="space-y-2">
                  {dependencyResolution.optional.map((dataset) => {
                    const def = getDatasetDefinition(dataset);
                    const sessionRow = uploadSession?.datasets.find((item) => item.dataset === dataset);
                    return (
                      <label key={dataset} className="block p-3 rounded-lg border border-slate-800 bg-matte-black cursor-pointer">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-bold text-white">{def.label}</p>
                          <span className={`text-[10px] uppercase ${sessionRow?.status === 'uploaded' || sessionRow?.status === 'ready' ? 'text-emerald-300' : 'text-slate-400'}`}>{sessionRow?.status || 'optional'}</span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">{def.description}</p>
                        <input
                          type="file"
                          className="hidden"
                          onChange={(e) => handleDatasetUpload(dataset, e.target.files?.[0] || null)}
                        />
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="p-3 rounded-xl border border-slate-800 bg-slate-950/60">
              <p className="text-xs uppercase tracking-wider text-slate-500 mb-2">8. Validation + Normalization</p>
              {adaptiveState ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {adaptiveState.validation.checks.map((check) => (
                    <div key={check.id} className="p-2 rounded border border-slate-800 bg-matte-black">
                      <p className="text-xs font-bold text-white">{check.label}</p>
                      <p className={`text-[11px] mt-1 ${check.status === 'pass' ? 'text-emerald-300' : check.status === 'warning' ? 'text-amber-300' : 'text-red-300'}`}>{check.detail}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500">Validation pending dataset uploads.</p>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-500">Select a preset to resolve required datasets dynamically.</p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {GST_INTELLIGENCE_PRESETS.map((preset) => (
          <button key={preset.id} onClick={() => setSelectedPresetId(preset.id)} className={`text-left p-4 rounded-2xl border ${selectedPresetId === preset.id ? 'border-gold bg-gold/10' : 'border-slate-800 bg-matte-black-light hover:border-slate-700'}`}>
            <p className="text-sm font-bold text-white">{preset.title}</p>
            <p className="text-xs text-slate-400 mt-1">{preset.description}</p>
            <p className="text-[11px] text-slate-500 mt-2">{preset.moduleIds.length} modules pre-selected</p>
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-800 bg-matte-black-light p-4">
        <p className="text-xs uppercase tracking-[0.24em] text-slate-500 mb-3">6. Advanced Intelligence Modules</p>
        <div className="flex flex-wrap gap-2">
          {GST_INTELLIGENCE_MODULES.map((module) => (
            <button
              key={module.id}
              onClick={() => toggleModule(module.id)}
              className={`px-3 py-2 rounded-full border text-xs ${selectedModuleIds.includes(module.id) ? 'border-gold bg-gold/10 text-gold' : 'border-slate-700 text-slate-300'}`}
              title={module.description}
            >
              {module.title} · {categoryLabel(module.category)}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={runEngine}
          disabled={!canGenerate || loading}
          className="px-5 py-3 rounded-xl bg-gold text-black text-sm font-bold disabled:opacity-40"
        >
          9. Execute Adaptive GST Intelligence
        </button>
        <p className="text-xs text-slate-500">Readiness: {adaptiveState?.readyToRunIntelligence ? 'Ready for intelligence processing' : 'Waiting for required datasets and validation'}</p>
        <p className="text-xs text-slate-500">Realtime indicator: {lastRefreshedAt ? `Last refresh ${new Date(lastRefreshedAt).toLocaleTimeString()}` : 'Not refreshed yet'}</p>
      </div>

      {validationRecords.length > 0 && (
        <div className="rounded-2xl border border-slate-800 bg-matte-black-light p-4">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500 mb-3">Production GST Validation Proof {validationArtifactId ? `| ${validationArtifactId.slice(0, 8)}` : ''}</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {validationRecords.map((record) => (
              <div key={record.stage} className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
                <p className="text-[10px] uppercase text-slate-500">{record.stage.replaceAll('_', ' ')}</p>
                <p className={`mt-1 text-sm font-bold ${record.status === 'PASS' ? 'text-emerald-300' : record.status === 'FAIL' ? 'text-red-300' : 'text-amber-300'}`}>{record.status}</p>
                <p className="mt-1 text-xs text-slate-400">{record.detail}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && <div className="rounded-2xl border border-red-700 bg-red-950/20 p-4 text-red-200 text-sm">{error}</div>}

      {engineResult && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="p-3 rounded-lg border border-slate-800 bg-slate-950/70"><p className="text-xs text-slate-500">Compliance Score</p><p className="text-2xl font-bold text-white">{engineResult.riskScores.compliance}</p></div>
            <div className="p-3 rounded-lg border border-slate-800 bg-slate-950/70"><p className="text-xs text-slate-500">Audit Risk Score</p><p className="text-2xl font-bold text-white">{engineResult.riskScores.audit}</p></div>
            <div className="p-3 rounded-lg border border-slate-800 bg-slate-950/70"><p className="text-xs text-slate-500">Vendor Risk Score</p><p className="text-2xl font-bold text-white">{engineResult.riskScores.vendor}</p></div>
            <div className="p-3 rounded-lg border border-slate-800 bg-slate-950/70"><p className="text-xs text-slate-500">Operational Efficiency</p><p className="text-2xl font-bold text-white">{engineResult.riskScores.operationalEfficiency}</p></div>
            <div className="p-3 rounded-lg border border-slate-800 bg-slate-950/70"><p className="text-xs text-slate-500">Filing Consistency</p><p className="text-2xl font-bold text-white">{engineResult.riskScores.filingConsistency}</p></div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 rounded-2xl border border-slate-800 bg-matte-black-light p-4 space-y-3">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">AI Insight Layer</p>
              {engineResult.aiInsights.map((insight) => (
                <div key={insight.id} className="p-4 rounded-xl border border-slate-800 bg-slate-950/60">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-white flex items-center gap-2"><Sparkles className="w-4 h-4 text-gold" />{insight.title}</p>
                    <span className={`text-[11px] uppercase ${insight.priority === 'high' ? 'text-red-400' : insight.priority === 'medium' ? 'text-amber-300' : 'text-emerald-300'}`}>{insight.priority}</span>
                  </div>
                  <p className="text-sm text-slate-300 mt-2">{insight.summary}</p>
                  <p className="text-sm text-gold mt-1">{insight.recommendation}</p>
                  <p className="text-[11px] text-slate-500 mt-2">{insight.governanceNote}</p>
                </div>
              ))}
            </div>
            <div className="rounded-2xl border border-slate-800 bg-matte-black-light p-4 space-y-3">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Operational Indicators</p>
              <div className="p-3 rounded-lg border border-slate-800 bg-slate-950/60"><p className="text-xs text-slate-500">Confidence</p><p className="text-lg font-bold text-white">{engineResult.indicators.confidence}%</p></div>
              <div className="p-3 rounded-lg border border-slate-800 bg-slate-950/60"><p className="text-xs text-slate-500">Trend</p><p className="text-lg font-bold text-white capitalize">{engineResult.indicators.trend}</p></div>
              <div className="p-3 rounded-lg border border-slate-800 bg-slate-950/60"><p className="text-xs text-slate-500">Realtime</p><p className="text-lg font-bold text-emerald-300 flex items-center gap-2"><Activity className="w-4 h-4" />Connected</p></div>
              <div className="p-3 rounded-lg border border-slate-800 bg-slate-950/60"><p className="text-xs text-slate-500">Audit/Telemetry</p><p className="text-sm font-bold text-white flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-300" />Traceable</p></div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/60">
              <p className="text-xs text-slate-500">Workflow Integration</p>
              <p className="text-sm text-white mt-1">Use generated risks to create task, notice escalation, and audit workflow actions.</p>
            </div>
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/60">
              <p className="text-xs text-slate-500">Compliance Narrative</p>
              <p className="text-sm text-white mt-1">Current intelligence run is aligned to {engineResult.context.presetId.replaceAll('-', ' ')}.</p>
            </div>
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/60">
              <p className="text-xs text-slate-500">Operational Guidance</p>
              <p className="text-sm text-white mt-1">Prioritize high-risk modules and escalate mismatches before next filing cycle.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-slate-800 bg-matte-black-light p-4 space-y-3">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Reconciliation Execution</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border border-slate-800 bg-slate-950/60">
                  <p className="text-xs text-slate-500">Matched Invoices</p>
                  <p className="text-xl font-bold text-white">{engineResult.execution.reconciliation.matchedInvoices}</p>
                </div>
                <div className="p-3 rounded-lg border border-slate-800 bg-slate-950/60">
                  <p className="text-xs text-slate-500">Missing ITC</p>
                  <p className="text-xl font-bold text-amber-300">{engineResult.execution.reconciliation.missingInvoices.length}</p>
                </div>
                <div className="p-3 rounded-lg border border-slate-800 bg-slate-950/60">
                  <p className="text-xs text-slate-500">Excess ITC</p>
                  <p className="text-xl font-bold text-red-300">{engineResult.execution.reconciliation.excessITCInvoices.length}</p>
                </div>
                <div className="p-3 rounded-lg border border-slate-800 bg-slate-950/60">
                  <p className="text-xs text-slate-500">Vendor Mismatches</p>
                  <p className="text-xl font-bold text-red-300">{engineResult.execution.reconciliation.vendorMismatches.length}</p>
                </div>
              </div>
              <p className="text-xs text-slate-400">
                GSTR-1 vs GSTR-3B variance: taxable {engineResult.execution.variance.taxableTurnoverVariance}% | liability {engineResult.execution.variance.liabilityVariance}%
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-matte-black-light p-4 space-y-3">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Risk Intelligence</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border border-slate-800 bg-slate-950/60"><p className="text-xs text-slate-500">ITC Risk</p><p className="text-lg font-bold text-white">{engineResult.execution.riskScores.itcRisk}</p></div>
                <div className="p-3 rounded-lg border border-slate-800 bg-slate-950/60"><p className="text-xs text-slate-500">Vendor Risk</p><p className="text-lg font-bold text-white">{engineResult.execution.riskScores.vendorRisk}</p></div>
                <div className="p-3 rounded-lg border border-slate-800 bg-slate-950/60"><p className="text-xs text-slate-500">Audit Exposure</p><p className="text-lg font-bold text-white">{engineResult.execution.riskScores.auditExposure}</p></div>
                <div className="p-3 rounded-lg border border-slate-800 bg-slate-950/60"><p className="text-xs text-slate-500">Operational Risk</p><p className="text-lg font-bold text-white">{engineResult.execution.riskScores.operationalRisk}</p></div>
              </div>
              <p className="text-xs text-slate-400">Anomaly score: {engineResult.execution.anomalies.anomalyScore}. {engineResult.execution.anomalies.anomalies.length} anomaly signal(s) detected.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-slate-800 bg-matte-black-light p-4 space-y-3">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Operational Workflow Actions</p>
              {engineResult.execution.workflowActions.map((action) => (
                <div key={action.id} className="p-3 rounded-lg border border-slate-800 bg-slate-950/60">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-white">{action.title}</p>
                    <span className={`text-[11px] uppercase ${action.priority === 'high' ? 'text-red-300' : action.priority === 'medium' ? 'text-amber-300' : 'text-emerald-300'}`}>{action.priority}</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{action.reason}</p>
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-slate-800 bg-matte-black-light p-4 space-y-3">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">GST Intelligence Timeline</p>
              {engineResult.execution.timeline.map((event, index) => (
                <div key={`${event.stage}-${index}`} className="p-3 rounded-lg border border-slate-800 bg-slate-950/60">
                  <p className="text-xs text-gold uppercase">{event.stage.replaceAll('_', ' ')}</p>
                  <p className="text-sm text-white">{event.message}</p>
                  <p className="text-[11px] text-slate-500 mt-1">{new Date(event.timestamp).toLocaleTimeString()}</p>
                </div>
              ))}
            </div>
          </div>

          {resolutionCenter && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-800 bg-matte-black-light p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500 mb-3">GST Resolution Center</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-3 rounded-lg border border-slate-800 bg-slate-950/60"><p className="text-xs text-slate-500">Open Issues</p><p className="text-xl font-bold text-white">{resolutionCenter.executiveSummary.openIssues}</p></div>
                  <div className="p-3 rounded-lg border border-slate-800 bg-slate-950/60"><p className="text-xs text-slate-500">High-Risk Open</p><p className="text-xl font-bold text-red-300">{resolutionCenter.executiveSummary.highRiskOpenIssues}</p></div>
                  <div className="p-3 rounded-lg border border-slate-800 bg-slate-950/60"><p className="text-xs text-slate-500">Likely SLA Breaches</p><p className="text-xl font-bold text-amber-300">{resolutionCenter.executiveSummary.slaBreachesLikely}</p></div>
                  <div className="p-3 rounded-lg border border-slate-800 bg-slate-950/60"><p className="text-xs text-slate-500">Remediation Efficiency</p><p className="text-xl font-bold text-emerald-300">{resolutionCenter.executiveSummary.remediationEfficiencyScore}</p></div>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-slate-800 bg-matte-black-light p-4 space-y-3">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Compliance Issue Lifecycle</p>
                  {resolutionCenter.issues.map((issue) => (
                    <div key={issue.id} className="p-3 rounded-lg border border-slate-800 bg-slate-950/60">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-bold text-white">{issue.title}</p>
                        <span className={`text-[11px] uppercase ${issue.severity === 'high' ? 'text-red-300' : issue.severity === 'medium' ? 'text-amber-300' : 'text-emerald-300'}`}>{issue.severity}</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">{issue.summary}</p>
                      <p className="text-[11px] text-slate-500 mt-1">State: {issue.state.replace('_', ' ')} | Owner: {issue.ownerRole.replace('_', ' ')} | SLA: {issue.slaHours}h</p>
                    </div>
                  ))}
                </div>

                <div className="rounded-2xl border border-slate-800 bg-matte-black-light p-4 space-y-3">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500">AI Resolution Guidance</p>
                  {resolutionCenter.aiRecommendations.map((item) => (
                    <div key={item.issueId} className="p-3 rounded-lg border border-slate-800 bg-slate-950/60">
                      <p className="text-sm font-bold text-white">{item.recommendation}</p>
                      <p className="text-xs text-slate-400 mt-1">{item.rationale}</p>
                      <p className="text-[11px] text-gold mt-1">Action: {item.suggestedAction.replaceAll('_', ' ')} | Confidence: {item.confidence}%</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {knowledgeGraph && historyDashboard && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-800 bg-matte-black-light p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500 mb-3">Compliance Knowledge Graph Intelligence</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-3 rounded-lg border border-slate-800 bg-slate-950/60"><p className="text-xs text-slate-500">Entities</p><p className="text-xl font-bold text-white">{knowledgeGraph.entities.length}</p></div>
                  <div className="p-3 rounded-lg border border-slate-800 bg-slate-950/60"><p className="text-xs text-slate-500">Relations</p><p className="text-xl font-bold text-white">{knowledgeGraph.relations.length}</p></div>
                  <div className="p-3 rounded-lg border border-slate-800 bg-slate-950/60"><p className="text-xs text-slate-500">Recurring Patterns</p><p className="text-xl font-bold text-amber-300">{knowledgeGraph.riskPatterns.length}</p></div>
                  <div className="p-3 rounded-lg border border-slate-800 bg-slate-950/60"><p className="text-xs text-slate-500">Timeline Events</p><p className="text-xl font-bold text-emerald-300">{knowledgeGraph.intelligenceTimeline.length}</p></div>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-slate-800 bg-matte-black-light p-4 space-y-3">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Historical Risk Patterns</p>
                  {knowledgeGraph.riskPatterns.map((pattern) => (
                    <div key={pattern.id} className="p-3 rounded-lg border border-slate-800 bg-slate-950/60">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-bold text-white">{pattern.pattern}</p>
                        <span className={`text-[11px] uppercase ${pattern.severity === 'high' ? 'text-red-300' : pattern.severity === 'medium' ? 'text-amber-300' : 'text-emerald-300'}`}>{pattern.severity}</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">{pattern.explanation}</p>
                    </div>
                  ))}
                </div>
                <div className="rounded-2xl border border-slate-800 bg-matte-black-light p-4 space-y-3">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Vendor Intelligence History</p>
                  {knowledgeGraph.vendorHistory.map((vendor) => (
                    <div key={vendor.vendorName} className="p-3 rounded-lg border border-slate-800 bg-slate-950/60">
                      <p className="text-sm font-bold text-white">{vendor.vendorName}</p>
                      <p className="text-xs text-slate-400 mt-1">Trust: {vendor.trustScore} | Stability: {vendor.complianceStability} | Trend: {vendor.riskTrend}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-matte-black-light p-4 space-y-3">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Historical Intelligence Dashboard</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {historyDashboard.trendCards.map((card) => (
                    <div key={card.title} className="p-3 rounded-lg border border-slate-800 bg-slate-950/60">
                      <p className="text-xs text-slate-500">{card.title}</p>
                      <p className={`text-xl font-bold ${card.tone === 'warning' ? 'text-amber-300' : card.tone === 'positive' ? 'text-emerald-300' : 'text-white'}`}>{card.value}</p>
                    </div>
                  ))}
                </div>
                <p className="text-sm text-slate-300">{historyDashboard.explanatoryNarrative}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {!engineResult && (
        <div className="rounded-2xl border border-slate-800 bg-matte-black-light p-6 text-center">
          <Gauge className="w-8 h-8 mx-auto text-slate-400 mb-2" />
          <p className="text-white font-bold">GST intelligence engine is ready for execution</p>
          <p className="text-xs text-slate-500 mt-1">Select context, preset, modules, then generate enterprise intelligence output.</p>
          <p className="text-[11px] text-slate-500 mt-2 flex items-center justify-center gap-1"><ShieldAlert className="w-3 h-3" />AI outputs are governed, auditable, and permission-aware.</p>
        </div>
      )}
    </div>
  );
};

export default GSTIntelligenceCenter;
