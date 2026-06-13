import { GSTRFiling } from '../../../services/gst/gstTypes';

export interface IGSTRepository {
  getClientsByFirm(firmId: string): Promise<Array<{ id: string; name?: string; gstin?: string | null }>>;
  getFilingsByClient(clientId: string): Promise<GSTRFiling[]>;
}
