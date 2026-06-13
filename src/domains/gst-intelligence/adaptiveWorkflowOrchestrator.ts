import { resolveDatasetDependencies } from './dependency-engine/dependencyEngine';
import { createAdaptiveUploadSession, markDatasetUploaded, requiredDatasetsReady, UploadSessionState } from './upload-orchestrator/uploadOrchestrator';
import { parseAndNormalizeSession } from './parsing-engine/parsingEngine';
import { runGSTValidation } from './validation-engine/validationEngine';
import { buildStorageEnvelope, GSTIntelligenceStorageEnvelope } from './storage/storageContracts';
import { GSTClientProfileContext } from './types';
import { GSTDatasetType } from './dataset-registry/registry';

export interface AdaptiveGSTWorkflowState {
  session: UploadSessionState;
  artifacts: ReturnType<typeof parseAndNormalizeSession>;
  validation: ReturnType<typeof runGSTValidation>;
  storage: GSTIntelligenceStorageEnvelope | null;
  readyToRunIntelligence: boolean;
}

export const initializeAdaptiveWorkflow = (params: {
  presetId: string;
  selectedModules: string[];
}) => {
  const deps = resolveDatasetDependencies(params.presetId, params.selectedModules);
  const session = createAdaptiveUploadSession({ required: deps.required, optional: deps.optional });
  return { deps, session };
};

export const uploadDatasetInSession = (session: UploadSessionState, dataset: GSTDatasetType, fileName: string) =>
  markDatasetUploaded(session, dataset, fileName);

export const processAdaptiveWorkflow = (params: {
  tenantId: string;
  clientId: string;
  financialYear: string;
  filingPeriod: string;
  context: GSTClientProfileContext | null;
  session: UploadSessionState;
}): AdaptiveGSTWorkflowState => {
  const artifacts = parseAndNormalizeSession(params.session);
  const validation = runGSTValidation({
    context: params.context,
    financialYear: params.financialYear,
    filingPeriod: params.filingPeriod,
    artifacts,
  });
  const storage = validation.readyForIntelligence
    ? buildStorageEnvelope({
      tenantId: params.tenantId,
      clientId: params.clientId,
      financialYear: params.financialYear,
      filingPeriod: params.filingPeriod,
      artifacts,
      stage: 'ready',
    })
    : null;

  return {
    session: params.session,
    artifacts,
    validation,
    storage,
    readyToRunIntelligence: requiredDatasetsReady(params.session) && validation.readyForIntelligence,
  };
};
