import { buildOperationalId, normalizeClientEntityType } from '../../../lib/operationalIdentity';
import { ClientRowDto } from '../dto/clientDtos';
export const mapClientsWithOperationalIds = (rows: any[]): ClientRowDto[] => {
  const sequenceByType: Record<string, number> = {};
  return rows.map((row) => {
    const key = normalizeClientEntityType(row.type || '');
    sequenceByType[key] = (sequenceByType[key] || 0) + 1;
    return { ...row, operational_id: buildOperationalId(key, sequenceByType[key]) } as ClientRowDto;
  });
};
