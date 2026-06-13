/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Small utility to support exporting GST reports and simple UI helpers.
 */

import { exportData } from '../../components/ExportModal';

export type ExportFormat = 'csv' | 'excel' | 'pdf' | 'word';

export const exportGSTReport = (
  title: string,
  data: Record<string, unknown>[],
  format: ExportFormat = 'csv'
) => {
  const columns = data && data.length > 0
    ? Object.keys(data[0]).map((k) => ({ key: k, label: k }))
    : [];

  const options = {
    format,
    includeHeaders: true,
    includeSummary: true,
  } as const;

  exportData(data, options as any, columns, title);
};

export const getHealthScoreColor = (score: number) => {
  if (typeof score !== 'number' || Number.isNaN(score)) return 'text-slate-400';
  if (score >= 80) return 'text-emerald-400';
  if (score >= 60) return 'text-amber-300';
  return 'text-red-400';
};

export default exportGSTReport;
