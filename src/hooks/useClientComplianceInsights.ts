/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useMemo } from 'react';
import {
  ClientComplianceSnapshot,
} from '../services/clientComplianceService';
import { ComplianceAIInsight, generateComplianceInsights } from '../services/complianceAIService';

export type ComplianceInsight = ComplianceAIInsight;

/**
 * Hook to generate AI compliance insights from snapshot
 */
export const useClientComplianceInsights = (
  complianceSnapshot: ClientComplianceSnapshot | null
): ComplianceInsight[] => {
  return useMemo(
    () => (complianceSnapshot ? generateComplianceInsights(complianceSnapshot) : []),
    [complianceSnapshot]
  );
};
