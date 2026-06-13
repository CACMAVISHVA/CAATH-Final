/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Format date to Indian locale (DD-Mon-YYYY)
 */
export const formatDate = (dateStr: string | null): string => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

/**
 * Format amount to Indian Rupees
 */
export const formatINR = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
  }).format(amount);
};

/**
 * Calculate health score based on client stats
 * Deducts points for overdue/pending items
 */
export const calculateHealthScore = (stats: {
  overdueAmount?: number;
  overdueTasks?: number;
  overdueFilings?: number;
  pendingPayments?: number;
} | null): number => {
  if (!stats) return 0;
  let score = 100;
  if (stats.overdueAmount && stats.overdueAmount > 0) score -= 20;
  if (stats.overdueTasks && stats.overdueTasks > 0) score -= 15;
  if (stats.overdueFilings && stats.overdueFilings > 0) score -= 25;
  if (stats.pendingPayments && stats.pendingPayments > 0) score -= 10;
  return Math.max(0, score);
};
