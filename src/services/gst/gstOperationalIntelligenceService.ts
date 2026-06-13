import { getGSTRFilings } from './gstFilingService';
import { getGSTR1VsGSTR3BReconciliation, getGSTR2BvsPurchaseReconciliation } from './gstReconciliationService';
import { gstService } from '../../domains/gst/services/gstService';

export interface GSTOperationalClientContext {
  clientId: string;
  clientName: string;
  gstin: string;
}

export interface GSTDataReadiness {
  hasGSTR1Data: boolean;
  hasGSTR3BData: boolean;
  hasGSTR2BData: boolean;
  hasPurchaseRegisterData: boolean;
  hasInvoiceImportData: boolean;
  canRunGSTR1Vs3B: boolean;
  canRunPurchaseVs2B: boolean;
}

export interface GSTOperationalIntelligenceSnapshot {
  context: {
    clients: GSTOperationalClientContext[];
    periods: string[];
    selectedClientId: string | null;
    selectedGSTIN: string | null;
    selectedPeriod: string | null;
  };
  readiness: GSTDataReadiness;
  filings: Awaited<ReturnType<typeof getGSTRFilings>>;
  reconciliation: {
    gstr1Vs3b: Awaited<ReturnType<typeof getGSTR1VsGSTR3BReconciliation>> | null;
    gstr2bVsPurchase: Awaited<ReturnType<typeof getGSTR2BvsPurchaseReconciliation>> | null;
  };
}

const defaultReadiness: GSTDataReadiness = {
  hasGSTR1Data: false,
  hasGSTR3BData: false,
  hasGSTR2BData: false,
  hasPurchaseRegisterData: false,
  hasInvoiceImportData: false,
  canRunGSTR1Vs3B: false,
  canRunPurchaseVs2B: false,
};

const toPeriod = (dateString?: string | null) => {
  if (!dateString) return null;
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

export const getGSTOperationalIntelligenceSnapshot = async (params: {
  firmId: string;
  selectedClientId?: string | null;
  selectedGSTIN?: string | null;
  selectedPeriod?: string | null;
}): Promise<GSTOperationalIntelligenceSnapshot> => {
  const { firmId, selectedClientId = null, selectedGSTIN = null, selectedPeriod = null } = params;

  const clients = await gstService.getGSTOperationalContext(firmId);

  if (!selectedClientId || !selectedGSTIN || !selectedPeriod) {
    return {
      context: { clients, periods: [], selectedClientId, selectedGSTIN, selectedPeriod },
      readiness: defaultReadiness,
      filings: [],
      reconciliation: { gstr1Vs3b: null, gstr2bVsPurchase: null },
    };
  }

  const filings = await getGSTRFilings(selectedClientId);
  const readinessCore = await gstService.getSnapshotReadiness({ firmId, selectedClientId, selectedGSTIN, selectedPeriod });

  const periods = Array.from(new Set(
    filings
      .filter((f) => f.gstin === selectedGSTIN)
      .map((f) => f.period)
      .concat(filings.map((f) => toPeriod(f.due_date) || ''))
      .filter((p) => Boolean(p))
  )).sort().reverse();

  const readiness: GSTDataReadiness = {
    ...readinessCore,
    hasInvoiceImportData: readinessCore.hasGSTR2BData,
    canRunGSTR1Vs3B: readinessCore.hasGSTR1Data && readinessCore.hasGSTR3BData,
    canRunPurchaseVs2B: readinessCore.hasGSTR2BData && readinessCore.hasPurchaseRegisterData,
  };

  const reconciliation = {
    gstr1Vs3b: readiness.canRunGSTR1Vs3B ? await getGSTR1VsGSTR3BReconciliation(selectedClientId, selectedPeriod) : null,
    gstr2bVsPurchase: readiness.canRunPurchaseVs2B ? await getGSTR2BvsPurchaseReconciliation(selectedClientId, selectedPeriod) : null,
  };

  return {
    context: { clients, periods, selectedClientId, selectedGSTIN, selectedPeriod },
    readiness,
    filings: filings.filter((f) => f.gstin === selectedGSTIN),
    reconciliation,
  };
};
