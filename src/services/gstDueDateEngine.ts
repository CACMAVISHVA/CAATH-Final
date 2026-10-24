export type GSTDueReturnType = 'GSTR-1' | 'GSTR-3B';
export type GSTFilingScheme = 'MONTHLY' | 'QRMP';
export type GSTStateGroup = '22ND' | '24TH';
export type GSTDueDateOverride = {
  returnType: GSTDueReturnType;
  scheme?: GSTFilingScheme;
  stateGroup?: GSTStateGroup;
  periodFrom: string;
  periodTo: string;
  newDueDate: string;
  notificationReference?: string;
};

export type GSTDueDateResult = {
  dueDate: string;
  extended: boolean;
  notificationReference?: string;
};

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'] as const;
const pad = (value: number) => String(value).padStart(2, '0');
const isoDate = (date: Date) => `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
const asUtcDate = (value: string) => new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
const addMonths = (period: Date, count: number) => new Date(Date.UTC(period.getUTCFullYear(), period.getUTCMonth() + count, 1));
const isQuarterEnd = (period: Date) => [2, 5, 8, 11].includes(period.getUTCMonth());

export const gstPeriodForFinancialYearMonth = (financialYear: string, month: string): string => {
  const startYear = Number(financialYear.slice(0, 4));
  const monthIndex = MONTHS.indexOf(month as typeof MONTHS[number]);
  if (!Number.isInteger(startYear) || monthIndex < 0) throw new Error('Use a financial year such as 2026-27 and a valid month name.');
  const year = monthIndex >= 3 ? startYear : startYear + 1;
  return `${year}-${pad(monthIndex + 1)}-01`;
};

export const getGSTDueDate = ({
  returnType,
  period,
  scheme,
  stateGroup = '22ND',
  overrides = [],
}: {
  returnType: GSTDueReturnType;
  period: string;
  scheme: GSTFilingScheme;
  stateGroup?: GSTStateGroup;
  overrides?: GSTDueDateOverride[];
}): GSTDueDateResult | null => {
  const taxPeriod = asUtcDate(period);
  if (Number.isNaN(taxPeriod.valueOf())) throw new Error('Tax period must be an ISO date.');
  if (scheme === 'QRMP' && !isQuarterEnd(taxPeriod)) return null;

  const matchingOverride = overrides.find((override) =>
    override.returnType === returnType
    && (!override.scheme || override.scheme === scheme)
    && (!override.stateGroup || override.stateGroup === stateGroup)
    && period >= override.periodFrom
    && period <= override.periodTo,
  );
  if (matchingOverride) return { dueDate: matchingOverride.newDueDate, extended: true, notificationReference: matchingOverride.notificationReference };

  const dueMonth = addMonths(taxPeriod, 1);
  const dueDay = returnType === 'GSTR-1'
    ? scheme === 'MONTHLY' ? 11 : 13
    : scheme === 'MONTHLY' ? 20 : stateGroup === '24TH' ? 24 : 22;
  return { dueDate: isoDate(new Date(Date.UTC(dueMonth.getUTCFullYear(), dueMonth.getUTCMonth(), dueDay))), extended: false };
};

export type GSTMatrixDisplayStatus = 'Filed' | 'Pending' | 'Not Applicable' | 'Not set' | 'Overdue';

export const gstMatrixDisplayStatus = (status: 'Filed' | 'Pending' | 'Not Applicable' | 'Unknown' | undefined, due: GSTDueDateResult | null, today = isoDate(new Date())): GSTMatrixDisplayStatus => {
  if (status === 'Filed' || status === 'Not Applicable') return status;
  if (status === 'Pending') return due && due.dueDate < today ? 'Overdue' : 'Pending';
  if (!due) return 'Not Applicable';
  return due.dueDate < today ? 'Overdue' : 'Not set';
};

export const gstComplianceTotals = (statuses: GSTMatrixDisplayStatus[]) => {
  const filed = statuses.filter((status) => status === 'Filed').length;
  const pending = statuses.filter((status) => status === 'Pending').length;
  const overdue = statuses.filter((status) => status === 'Overdue').length;
  const denominator = filed + pending + overdue;
  return { filed, pending, overdue, compliancePercent: denominator ? Math.round((filed / denominator) * 100) : null };
};
