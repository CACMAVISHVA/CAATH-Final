import { supabase } from '../lib/supabase';
import { GstInvoice, GstMismatch, GstReconciliationSummary } from '../types';

export const importInvoicesJSON = async (firmId: string, clientId: string, invoices: any[], createdBy?: string) => {
  // invoices is array of invoice objects parsed from JSON
  const rows = invoices.map((inv) => ({
    firm_id: firmId,
    client_id: clientId,
    invoice_no: inv.invoice_no || inv.invoiceNo || inv.inv_no,
    invoice_date: inv.invoice_date || inv.date,
    supplier_gstin: inv.supplier_gstin || inv.supplierGstin || inv.supplier || null,
    recipient_gstin: inv.recipient_gstin || inv.recipientGstin || inv.recipient || null,
    taxable_value: inv.taxable_value ?? inv.taxableValue ?? Number(inv.taxable || 0),
    tax_amount: inv.tax_amount ?? inv.taxAmount ?? Number(inv.tax || 0),
    total_amount: inv.total_amount ?? inv.totalAmount ?? Number(inv.amount || 0),
    type: inv.type === 'INWARD' ? 'INWARD' : 'OUTWARD',
    source: inv.source || 'GSTR1',
    original_payload: inv,
    created_by: createdBy || null,
  }));

  const { data, error } = await supabase.from('gst_invoices').insert(rows);
  if (error) throw error;
  return data;
};

export const createReconciliation = async (firmId: string, clientId: string, period: string, createdBy?: string) => {
  const { data, error } = await supabase.from('gst_reconciliations').insert([{
    firm_id: firmId,
    client_id: clientId,
    period,
    created_by: createdBy || null,
    status: 'PENDING',
  }]).single();

  if (error) throw error;
  return data;
};

export const runReconciliation = async (reconciliationId: string) => {
  // fetch reconciliation
  const { data: rec, error: recErr } = await supabase.from('gst_reconciliations').select('*').eq('id', reconciliationId).single();
  if (recErr) throw recErr;

  const { client_id: clientId, period } = rec as any;
  // define period filter: period is 'YYYY-MM'
  const start = `${period}-01`;
  const end = new Date(new Date(start).getFullYear(), new Date(start).getMonth() + 1, 0).toISOString().slice(0,10);

  // simple mismatch detection: match invoices by invoice_no and gstin between GSTR1 and GSTR3B
  const { data: gstr1Data } = await supabase.from('gst_invoices').select('*').eq('client_id', clientId).eq('source', 'GSTR1').gte('invoice_date', start).lte('invoice_date', end);
  const { data: gstr3bData } = await supabase.from('gst_invoices').select('*').eq('client_id', clientId).eq('source', 'GSTR3B').gte('invoice_date', start).lte('invoice_date', end);
  const gstr1 = (gstr1Data || []) as any[];
  const gstr3b = (gstr3bData || []) as any[];

  const map3b = new Map<string, any[]>();
  (gstr3b || []).forEach((inv: any) => {
    const key = `${inv.invoice_no}::${inv.supplier_gstin || inv.recipient_gstin || ''}`;
    let bucket = map3b.get(key);
    if (!bucket) {
      bucket = [];
      map3b.set(key, bucket);
    }
    bucket.push(inv);
  });

  const mismatches: any[] = [];
  for (const inv of (gstr1 || [])) {
    const key = `${inv.invoice_no}::${inv.supplier_gstin || inv.recipient_gstin || ''}`;
    const matches = map3b.get(key) || [];
    if (matches.length === 0) {
      mismatches.push({
        reconciliation_id: reconciliationId,
        invoice_id: inv.id,
        invoice_no: inv.invoice_no,
        gstin: inv.supplier_gstin || inv.recipient_gstin || null,
        mismatch_type: 'MISSING_IN_GSTR3B',
        details: { foundIn: 'GSTR1' },
      });
    } else {
      // compare amounts
      const total3b = matches.reduce((s: number, m: any) => s + Number(m.total_amount || 0), 0);
      const diff = Math.abs(Number(inv.total_amount || 0) - total3b);
      if (diff > 0.5) {
        mismatches.push({
          reconciliation_id: reconciliationId,
          invoice_id: inv.id,
          invoice_no: inv.invoice_no,
          gstin: inv.supplier_gstin || inv.recipient_gstin || null,
          mismatch_type: 'AMOUNT_MISMATCH',
          details: { gstr1: inv.total_amount, gstr3b: total3b, diff },
        });
      }
    }
  }

  // also check items present in 3B but missing in GSTR1
  const map1 = new Map<string, any[]>();
  (gstr1 || []).forEach((inv: any) => {
    const key = `${inv.invoice_no}::${inv.supplier_gstin || inv.recipient_gstin || ''}`;
    let bucket = map1.get(key);
    if (!bucket) {
      bucket = [];
      map1.set(key, bucket);
    }
    bucket.push(inv);
  });
  for (const inv of (gstr3b || [])) {
    const key = `${inv.invoice_no}::${inv.supplier_gstin || inv.recipient_gstin || ''}`;
    const matches = map1.get(key) || [];
    if (matches.length === 0) {
      mismatches.push({
        reconciliation_id: reconciliationId,
        invoice_id: inv.id,
        invoice_no: inv.invoice_no,
        gstin: inv.supplier_gstin || inv.recipient_gstin || null,
        mismatch_type: 'MISSING_IN_GSTR1',
        details: { foundIn: 'GSTR3B' },
      });
    }
  }

  if (mismatches.length > 0) {
    const { error: insertErr } = await supabase.from('gst_mismatches').insert(mismatches);
    if (insertErr) throw insertErr;
  }

  const totalOutward = (gstr1 || []).filter((i: any) => i.type === 'OUTWARD').reduce((s: number, r: any) => s + Number(r.total_amount || 0), 0);
  const totalOutwardTax = (gstr1 || []).filter((i: any) => i.type === 'OUTWARD').reduce((s: number, r: any) => s + Number(r.tax_amount || 0), 0);
  const totalInward = (gstr1 || []).filter((i: any) => i.type === 'INWARD').reduce((s: number, r: any) => s + Number(r.total_amount || 0), 0);
  const totalInwardTax = (gstr1 || []).filter((i: any) => i.type === 'INWARD').reduce((s: number, r: any) => s + Number(r.tax_amount || 0), 0);
  const totalOutward3B = (gstr3b || []).filter((i: any) => i.type === 'OUTWARD').reduce((s: number, r: any) => s + Number(r.total_amount || 0), 0);
  const outwardLiabilityVariance = Math.abs(totalOutward - totalOutward3B);
  const invoiceCount = Math.max(1, (gstr1 || []).length + (gstr3b || []).length);
  const severityCounts = mismatches.reduce(
    (acc: { high: number; medium: number; low: number }, mismatch: any) => {
      if (mismatch.mismatch_type === 'AMOUNT_MISMATCH') acc.high += 1;
      else if (mismatch.mismatch_type === 'TAX_VARIANCE') acc.medium += 1;
      else acc.low += 1;
      return acc;
    },
    { high: 0, medium: 0, low: 0 }
  );

  const mismatchRate = Math.min(100, Math.round((mismatches.length / invoiceCount) * 100));
  const varianceRate = Math.min(100, totalOutward === 0 ? 0 : Math.round((outwardLiabilityVariance / totalOutward) * 100));
  const weightedRisk = Math.min(
    100,
    Math.round(mismatchRate * 0.5 + varianceRate * 0.3 + severityCounts.high * 8 + severityCounts.medium * 4)
  );
  const noticeRiskCategory = weightedRisk >= 70 ? 'High' : weightedRisk >= 40 ? 'Medium' : 'Low';
  const filingConsistencyScore = Math.max(0, 100 - mismatchRate - varianceRate);
  const reconciliationHealthScore = Math.max(0, 100 - weightedRisk);

  const summary: GstReconciliationSummary = {
    clientId,
    period,
    totalOutward,
    totalOutwardTax,
    totalInward,
    totalInwardTax,
    mismatchCount: mismatches.length,
    pendingIssues: mismatches.length,
    reconciliationHealthScore,
    filingConsistencyScore,
    outwardLiabilityVariance,
    noticeRiskCategory,
    mismatchSeverity: severityCounts,
  };

  const { error: updateErr } = await supabase.from('gst_reconciliations').update({ status: 'COMPLETED', summary }).eq('id', reconciliationId);
  if (updateErr) throw updateErr;

  return { summary, mismatchesCount: mismatches.length };
};

export const getReconciliationSummary = async (clientId: string, period: string) => {
  const { data: rec } = await supabase.from('gst_reconciliations').select('*, summary').eq('client_id', clientId).eq('period', period).order('created_at', { ascending: false }).limit(1).single();
  return rec || null;
};

export const getMismatchDetails = async (reconciliationId: string, limit = 100, offset = 0) => {
  const { data, error } = await supabase.from('gst_mismatches').select('*, gst_invoices(*)').eq('reconciliation_id', reconciliationId).order('created_at', { ascending: false }).range(offset, offset + limit - 1);
  if (error) throw error;
  return data || [];
};

export const getTaxTrends = async (clientId: string, months = 6) => {
  // returns monthly sums for outward tax collected and inward tax claimed
  const { data, error } = await supabase.rpc('gst_monthly_tax_trends', { p_client_id: clientId, p_months: months });
  if (error) throw error;
  return data || [];
};

export default {
  importInvoicesJSON,
  createReconciliation,
  runReconciliation,
  getReconciliationSummary,
  getMismatchDetails,
  getTaxTrends,
};
