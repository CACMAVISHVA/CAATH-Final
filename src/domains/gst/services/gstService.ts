import { SupabaseGSTRepository } from '../repositories/SupabaseGSTRepository';
import { GSTSnapshotRequestDto } from '../dto/gstDtos';

const repository = new SupabaseGSTRepository();

export const gstService = {
  createGSTRFiling(filing: Parameters<SupabaseGSTRepository['createFiling']>[0]) {
    return repository.createFiling(filing);
  },

  getGSTRFilings(clientId: string) {
    return repository.getFilingsByClient(clientId);
  },

  async getAllGSTRFilings(firmId: string) {
    const clients = await repository.getClientsByFirm(firmId);
    const result = await Promise.all(clients.map((client) => repository.getFilingsByClient(client.id)));
    return result.flat();
  },

  async getGSTOperationalContext(firmId: string) {
    const clients = await repository.getClientsByFirm(firmId);
    return clients.filter((c) => Boolean(c.gstin)).map((c) => ({ clientId: c.id, clientName: c.name || 'Unknown', gstin: c.gstin as string }));
  },

  getClientById(clientId: string) {
    return repository.getClientById(clientId);
  },

  async getSnapshotReadiness(request: GSTSnapshotRequestDto) {
    if (!request.selectedClientId || !request.selectedPeriod) {
      return { hasGSTR1Data: false, hasGSTR3BData: false, hasGSTR2BData: false, hasPurchaseRegisterData: false };
    }

    const [gstr1, gstr3b, purchase, gstr2b] = await Promise.all([
      repository.getGstr1ByPeriod(request.selectedClientId, request.selectedPeriod),
      repository.getGstr3bByPeriod(request.selectedClientId, request.selectedPeriod),
      repository.getPurchaseInvoices(request.selectedClientId, request.selectedPeriod),
      repository.getGstr2bInvoices(request.selectedClientId, request.selectedPeriod),
    ]);

    return {
      hasGSTR1Data: Boolean(gstr1),
      hasGSTR3BData: Boolean(gstr3b),
      hasGSTR2BData: gstr2b.length > 0,
      hasPurchaseRegisterData: purchase.length > 0,
    };
  },

  async getGSTR1Vs3B(clientId: string, period: string) {
    const [gstr1Data, gstr3bData] = await Promise.all([
      repository.getGstr1ByPeriod(clientId, period),
      repository.getGstr3bByPeriod(clientId, period),
    ]);

    const matches: any[] = [];
    const gstr1Total = gstr1Data?.total_taxable_value || 0;
    const gstr3bTotal = gstr3bData?.total_taxable_supply || 0;
    const variance = Math.abs(gstr1Total - gstr3bTotal);

    if (gstr1Data && gstr3bData && variance > 1000) {
      matches.push({
        type: 'GSTR1 vs GSTR3B',
        period,
        clientName: '',
        gstin: gstr1Data.gstin,
        amount: variance,
        description: `Taxable value mismatch: GSTR1 Rs ${gstr1Total.toLocaleString()} vs GSTR3B Rs ${gstr3bTotal.toLocaleString()}`,
        severity: variance > 100000 ? 'high' : variance > 10000 ? 'medium' : 'low',
      });
    }

    return { matches, summary: { gstr1Total, gstr3bTotal, variance } };
  },

  async getGSTR2BVsPurchase(clientId: string, period: string) {
    const [purchases, gstr2bInvoices] = await Promise.all([
      repository.getPurchaseInvoices(clientId, period),
      repository.getGstr2bInvoices(clientId, period),
    ]);

    const missingITC: any[] = [];
    const extraITC: any[] = [];
    const purchaseMap = new Map<string, any>();
    const gstr2bMap = new Map<string, any>();

    purchases.forEach((p: any) => purchaseMap.set(`${p.invoice_number}::${p.vendor_gstin || ''}`, p));
    gstr2bInvoices.forEach((inv: any) => gstr2bMap.set(`${inv.invoice_no}::${inv.supplier_gstin || ''}`, inv));

    purchases.forEach((p: any) => {
      const key = `${p.invoice_number}::${p.vendor_gstin || ''}`;
      if (!gstr2bMap.has(key)) {
        missingITC.push({
          type: 'GSTR2B vs Purchase',
          period,
          clientName: '',
          gstin: p.vendor_gstin,
          amount: Number(p.taxable_value || 0),
          description: `Missing ITC for invoice ${p.invoice_number} from ${p.vendor_name}`,
          severity: Number(p.taxable_value || 0) > 100000 ? 'high' : 'medium',
        });
      }
    });

    gstr2bInvoices.forEach((inv: any) => {
      const key = `${inv.invoice_no}::${inv.supplier_gstin || ''}`;
      if (!purchaseMap.has(key)) {
        extraITC.push({
          type: 'GSTR2B vs Purchase',
          period,
          clientName: '',
          gstin: inv.supplier_gstin || '',
          amount: Number(inv.taxable_value || 0),
          description: `GSTR2B invoice ${inv.invoice_no} missing in purchase register`,
          severity: Number(inv.taxable_value || 0) > 100000 ? 'high' : 'medium',
        });
      }
    });

    const totalPurchase = purchases.reduce((sum: number, p: any) => sum + Number(p.taxable_value || 0), 0);
    const totalGSTR2B = gstr2bInvoices.reduce((sum: number, inv: any) => sum + Number(inv.taxable_value || 0), 0);
    return { missingITC, extraITC, summary: { totalPurchase, totalGSTR2B, netITC: Math.abs(totalGSTR2B - totalPurchase) } };
  },
};
