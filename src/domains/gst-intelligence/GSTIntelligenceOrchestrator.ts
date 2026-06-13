import { getAllClientsHealthScores, getFilingDelayAnalytics } from '../../services/gstAnalyticsService';
import { getGSTOperationalIntelligenceSnapshot } from '../../services/gst/gstOperationalIntelligenceService';
import { recordOperationalTelemetry } from '../../services/operationalTelemetryPipelineService';
import { User } from '../../types';
import { GST_INTELLIGENCE_PRESETS } from './enginePresets';
import { GSTAIInsight, GSTClientProfileContext, GSTFilingMode, GSTIntelligenceEngineResult, GSTRiskScores } from './types';
import { buildStorageEnvelope } from './storage/storageContracts';
import { executeGSTIntelligence } from './execution-engine';

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

const inferFrequency = (period: string): 'Monthly' | 'Quarterly' | 'Annual' => {
  if (!period) return 'Monthly';
  if (/Q[1-4]/i.test(period)) return 'Quarterly';
  if (/annual/i.test(period)) return 'Annual';
  return 'Monthly';
};

const buildClientProfile = (source: { clientId: string; clientName: string; gstin: string }, period: string): GSTClientProfileContext => {
  const pan = source.gstin.length >= 12 ? source.gstin.slice(2, 12) : 'Unavailable';
  return {
    clientId: source.clientId,
    clientName: source.clientName,
    gstin: source.gstin,
    pan,
    legalName: source.clientName,
    tradeName: `${source.clientName} Trade`,
    state: source.gstin.slice(0, 2) || 'NA',
    registrationType: source.gstin ? 'Regular' : 'Unregistered',
    filingFrequency: inferFrequency(period),
  };
};

const buildRiskScores = (health: number, late: number, mismatch: number): GSTRiskScores => ({
  compliance: clamp(100 - late * 8 - mismatch * 3),
  audit: clamp(100 - mismatch * 6 - late * 5),
  vendor: clamp(100 - mismatch * 7),
  operationalEfficiency: clamp(100 - late * 5),
  filingConsistency: clamp(health),
});

const buildAIInsights = (scores: GSTRiskScores, clientName: string): GSTAIInsight[] => {
  const insights: GSTAIInsight[] = [];
  if (scores.audit < 70) {
    insights.push({
      id: 'audit-risk',
      title: 'Elevated audit exposure',
      summary: `${clientName} has moderate to high audit-trigger patterns.`,
      recommendation: 'Run audit preparation preset and review variance-linked filings before next cycle.',
      priority: 'high',
      governanceNote: 'AI suggestion only. Final compliance action requires authorized reviewer approval.',
    });
  }
  if (scores.vendor < 75) {
    insights.push({
      id: 'vendor-risk',
      title: 'Vendor inconsistency risk detected',
      summary: 'Vendor-side mismatch concentration may impact ITC confidence.',
      recommendation: 'Prioritize top 5 vendor reconciliations and raise follow-up tasks in workflow lane.',
      priority: 'medium',
      governanceNote: 'Risk classification is probabilistic and should be validated with source records.',
    });
  }
  insights.push({
    id: 'workflow-acceleration',
    title: 'Workflow acceleration recommendation',
    summary: 'Filing continuity can improve with command-driven reassignment for delayed lanes.',
    recommendation: 'Trigger operational reassignment for overdue clusters and monitor next 7-day trend.',
    priority: 'low',
    governanceNote: 'Permission-aware recommendation generated under governed AI policy.',
  });
  return insights;
};

export const gstIntelligenceOrchestrator = {
  getPresets() {
    return GST_INTELLIGENCE_PRESETS;
  },

  async runEngine(params: {
    user: User;
    clientId: string;
    filingPeriod: string;
    financialYear: string;
    filingMode: GSTFilingMode;
    presetId: string;
    moduleIds: string[];
  }): Promise<GSTIntelligenceEngineResult> {
    const { user, clientId, filingPeriod, financialYear, filingMode, presetId, moduleIds } = params;
    if (!user.firmId) {
      throw new Error('Firm workspace is required for GST intelligence execution.');
    }

    const contextSnapshot = await getGSTOperationalIntelligenceSnapshot({
      firmId: user.firmId,
      selectedClientId: clientId,
      selectedPeriod: filingPeriod,
      selectedGSTIN: null,
    });

    const selectedClient = contextSnapshot.context.clients.find((c) => c.clientId === clientId) || null;
    if (!selectedClient) {
      throw new Error('Selected client is not available in GST operational context.');
    }

    const snapshot = await getGSTOperationalIntelligenceSnapshot({
      firmId: user.firmId,
      selectedClientId: clientId,
      selectedPeriod: filingPeriod,
      selectedGSTIN: selectedClient.gstin,
    });

    const [healthScores, delayAnalytics] = await Promise.all([
      getAllClientsHealthScores(user.firmId),
      getFilingDelayAnalytics(user.firmId),
    ]);

    const clientHealth = healthScores.find((score) => score.client_id === clientId);
    const clientDelays = delayAnalytics.filter((delay) => delay.client_id === clientId);
    const mismatchCount =
      (snapshot.reconciliation.gstr1Vs3b?.matches.length || 0)
      + (snapshot.reconciliation.gstr2bVsPurchase?.missingITC.length || 0)
      + (snapshot.reconciliation.gstr2bVsPurchase?.extraITC.length || 0);

    const riskScores = buildRiskScores(
      clientHealth?.overall_score || 65,
      clientDelays.length,
      mismatchCount
    );

    const aiInsights = buildAIInsights(riskScores, selectedClient.clientName);
    const lineageArtifacts = [
      {
        dataset: 'GSTR2B_JSON' as const,
        records: (snapshot.reconciliation.gstr2bVsPurchase?.missingITC.length || 0)
          + (snapshot.reconciliation.gstr2bVsPurchase?.extraITC.length || 0),
        parser: 'gst_json_parser',
        normalizedSchema: 'gst.normalized.gstr2b.v1',
      },
      {
        dataset: 'PURCHASE_REGISTER' as const,
        records: (snapshot.reconciliation.gstr2bVsPurchase?.missingITC.length || 0)
          + (snapshot.reconciliation.gstr2bVsPurchase?.extraITC.length || 0),
        parser: 'excel_invoice_parser',
        normalizedSchema: 'gst.normalized.purchase_register.v1',
      },
      {
        dataset: 'GSTR1_JSON' as const,
        records: snapshot.reconciliation.gstr1Vs3b?.matches.length || 0,
        parser: 'gst_json_parser',
        normalizedSchema: 'gst.normalized.gstr1.v1',
      },
      {
        dataset: 'GSTR3B_JSON' as const,
        records: snapshot.reconciliation.gstr1Vs3b?.matches.length || 0,
        parser: 'gst_json_parser',
        normalizedSchema: 'gst.normalized.gstr3b.v1',
      },
    ].filter((item) => item.records > 0);

    const storageEnvelope = buildStorageEnvelope({
      tenantId: user.firmId,
      clientId,
      financialYear,
      filingPeriod,
      artifacts: lineageArtifacts,
      stage: 'ready',
    });
    const execution = executeGSTIntelligence({
      storageEnvelope,
      modules: [],
      existingInsights: aiInsights,
      baselineScores: riskScores,
    });

    const mergedRiskScores: GSTRiskScores = {
      ...riskScores,
      compliance: Math.round((riskScores.compliance + execution.riskScores.compliance) / 2),
      audit: Math.round((riskScores.audit + execution.riskScores.auditExposure) / 2),
      vendor: Math.round((riskScores.vendor + execution.riskScores.vendorRisk) / 2),
      operationalEfficiency: Math.round((riskScores.operationalEfficiency + (100 - execution.riskScores.operationalRisk)) / 2),
      filingConsistency: riskScores.filingConsistency,
      itcRisk: execution.riskScores.itcRisk,
      auditExposure: execution.riskScores.auditExposure,
      operationalRisk: execution.riskScores.operationalRisk,
    };
    const telemetryPayload = {
      presetId,
      moduleCount: moduleIds.length,
      filingMode,
      financialYear,
      filingPeriod,
      mismatchCount,
      riskScores: mergedRiskScores,
      workflowActions: execution.workflowActions.length,
      anomalies: execution.anomalies.anomalies.length,
    };

    try {
      await recordOperationalTelemetry({
        firmId: user.firmId,
        metric: 'event_propagation',
        eventName: 'gst_intelligence_engine_executed',
        severity: riskScores.audit < 70 ? 'warning' : 'info',
        actorId: user.id,
        actorName: user.name,
        actorRole: user.role,
        workflowType: 'gst_intelligence',
        workflowId: clientId,
        payload: telemetryPayload,
      });
    } catch {
      // Keep engine output available even if telemetry persistence fails.
    }

    return {
      context: {
        clientProfile: buildClientProfile(selectedClient, filingPeriod),
        financialYear,
        filingMode,
        filingPeriod,
        presetId,
        selectedModuleIds: moduleIds,
      },
      snapshot,
      riskScores: mergedRiskScores,
      aiInsights: execution.aiInsights,
      indicators: {
        confidence: clamp((mergedRiskScores.compliance + mergedRiskScores.filingConsistency) / 2),
        trend: mergedRiskScores.compliance >= 75 ? 'improving' : mergedRiskScores.compliance >= 60 ? 'stable' : 'deteriorating',
        realtimeConnected: true,
        generatedAt: new Date().toISOString(),
      },
      executionTrail: {
        actorRole: user.role,
        auditReady: true,
        telemetryRecorded: true,
      },
      execution,
    };
  },
};
