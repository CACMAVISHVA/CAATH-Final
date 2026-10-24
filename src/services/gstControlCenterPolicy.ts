import type { GSTClientOption } from './gstComplianceLifecycleService';
import type { GSTReturnStatus, GSTReturnStatusValue } from './gstPracticeHubService';

export type GSTControlRow = {
  client: GSTClientOption;
  gstr1: GSTReturnStatusValue;
  gstr3b: GSTReturnStatusValue;
  action: 'Filed' | 'Review filing' | 'Request data';
  outstandingReturns: Array<'GSTR-1' | 'GSTR-3B'>;
};

const statusFor = (statuses: GSTReturnStatus[], clientId: string, financialYear: string, taxPeriod: string, returnType: 'GSTR-1' | 'GSTR-3B'): GSTReturnStatusValue =>
  statuses.find((status) => status.client_id === clientId && status.financial_year === financialYear && status.tax_period === taxPeriod && status.return_type === returnType)?.status || 'Unknown';

export const buildGSTControlRows = (clients: GSTClientOption[], statuses: GSTReturnStatus[], financialYear: string, taxPeriod: string): GSTControlRow[] =>
  clients.map((client) => {
    const gstr1 = statusFor(statuses, client.id, financialYear, taxPeriod, 'GSTR-1');
    const gstr3b = statusFor(statuses, client.id, financialYear, taxPeriod, 'GSTR-3B');
    const outstandingReturns = (['GSTR-1', 'GSTR-3B'] as const).filter((returnType) => (returnType === 'GSTR-1' ? gstr1 : gstr3b) !== 'Filed');
    const action = outstandingReturns.length === 0 ? 'Filed' : [gstr1, gstr3b].some((status) => status === 'Pending') ? 'Review filing' : 'Request data';
    return { client, gstr1, gstr3b, action, outstandingReturns };
  });
