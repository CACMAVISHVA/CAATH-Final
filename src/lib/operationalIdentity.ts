export type OperationalEntityType =
  | 'company'
  | 'firm'
  | 'proprietorship'
  | 'llp'
  | 'trust'
  | 'invoice'
  | 'notice'
  | 'workflow'
  | 'payroll'
  | 'subscription'
  | 'approval';

const ENTITY_PREFIX: Record<OperationalEntityType, string> = {
  company: 'C',
  firm: 'F',
  proprietorship: 'P',
  llp: 'L',
  trust: 'T',
  invoice: 'INV',
  notice: 'N',
  workflow: 'W',
  payroll: 'PR',
  subscription: 'S',
  approval: 'A',
};

export const buildOperationalId = (entityType: OperationalEntityType, sequence: number): string => {
  const prefix = ENTITY_PREFIX[entityType];
  return `${prefix}-${String(Math.max(1, sequence)).padStart(3, '0')}`;
};

export const normalizeClientEntityType = (clientType: string): OperationalEntityType => {
  const value = (clientType || '').toLowerCase();
  if (value.includes('propriet')) return 'proprietorship';
  if (value.includes('partnership') || value === 'firm') return 'firm';
  if (value.includes('llp')) return 'llp';
  if (value.includes('trust')) return 'trust';
  if (value.includes('company')) return 'company';
  return 'company';
};

