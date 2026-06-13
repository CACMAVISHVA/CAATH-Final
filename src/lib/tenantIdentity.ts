const DEFAULT_COUNTRY = 'IND';
const DEFAULT_STATE = 'TN';

const hashFirmIdToSequence = (firmId: string): number => {
  let hash = 0;
  for (let index = 0; index < firmId.length; index += 1) {
    hash = (hash * 31 + firmId.charCodeAt(index)) >>> 0;
  }
  return (hash % 999) + 1;
};

export const formatWorkspaceAlias = (firmId?: string | null): string => {
  if (!firmId) {
    return `${DEFAULT_COUNTRY}-${DEFAULT_STATE}-000`;
  }
  const sequence = hashFirmIdToSequence(firmId);
  return `${DEFAULT_COUNTRY}-${DEFAULT_STATE}-${String(sequence).padStart(3, '0')}`;
};

export const formatTenantDisplayId = (firmId?: string | null): string => formatWorkspaceAlias(firmId);
