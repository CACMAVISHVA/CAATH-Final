/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MismatchReport } from './gstTypes';
import { gstService } from '../../domains/gst/services/gstService';

export const getGSTR1VsGSTR3BReconciliation = async (
  clientId: string,
  period: string
): Promise<{ matches: MismatchReport[]; summary: { gstr1Total: number; gstr3bTotal: number; variance: number } }> => {
  return gstService.getGSTR1Vs3B(clientId, period);
};

export const getGSTR2BvsPurchaseReconciliation = async (
  clientId: string,
  period: string
): Promise<{ missingITC: MismatchReport[]; extraITC: MismatchReport[]; summary: { totalPurchase: number; totalGSTR2B: number; netITC: number } }> => {
  return gstService.getGSTR2BVsPurchase(clientId, period);
};
