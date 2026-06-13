/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase } from '../../lib/supabase';
import { User } from '../../types';

export const writeFinancialAudit = async (params: {
  firmId: string;
  user: User;
  action: string;
  entityType: 'Invoice' | 'Payment' | 'Expense';
  entityId: string;
  details: string;
  beforeState?: Record<string, unknown>;
  afterState?: Record<string, unknown>;
}) => {
  await supabase.from('audit_logs').insert([{
    firm_id: params.firmId,
    user_id: params.user.id,
    user_name: params.user.name,
    user_role: params.user.role,
    action: params.action,
    entity_type: params.entityType,
    entity_id: params.entityId,
    details: params.details,
    before_state: params.beforeState ? JSON.stringify(params.beforeState) : null,
    after_state: params.afterState ? JSON.stringify(params.afterState) : null,
  }]);
};
