import { useMemo, useState } from 'react';

export interface ComplianceSummaryItem {
  id: string;
  clientId: string;
  clientName: string;
  type: string;
  category: 'GST' | 'Income Tax' | 'ROC' | 'Audit' | 'Custom';
  dueDate: string;
  status: 'Pending' | 'In Progress' | 'Awaiting Documents' | 'Under Review' | 'Approved' | 'Filed' | 'Late' | 'Escalated' | 'Closed';
  filedDate?: string;
  penalty: number;
  assignedTo?: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  notes?: string;
}

export interface ComplianceSummaryResult {
  activeCategory: string;
  setActiveCategory: (category: string) => void;
  search: string;
  setSearch: (value: string) => void;
  filteredCompliance: ComplianceSummaryItem[];
  metrics: {
    total: number;
    pending: number;
    late: number;
    latePenalty: number;
    filed: number;
    completionRate: number;
  };
  categories: string[];
}

export const useComplianceSummary = (initialCompliance: ComplianceSummaryItem[]): ComplianceSummaryResult => {
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [search, setSearch] = useState<string>('');

  const filteredCompliance = useMemo(() => {
    let result = [...initialCompliance];
    if (activeCategory !== 'All') {
      result = result.filter((item) => item.category === activeCategory);
    }
    if (search.trim()) {
      const term = search.toLowerCase();
      result = result.filter((item) =>
        item.clientName.toLowerCase().includes(term) ||
        item.type.toLowerCase().includes(term)
      );
    }
    return result;
  }, [activeCategory, initialCompliance, search]);

  const metrics = useMemo(() => {
    const total = filteredCompliance.length;
    const pending = filteredCompliance.filter((item) => ['Pending', 'In Progress', 'Awaiting Documents', 'Under Review', 'Escalated'].includes(item.status)).length;
    const late = filteredCompliance.filter((item) => item.status === 'Late').length;
    const latePenalty = filteredCompliance.filter((item) => item.status === 'Late').reduce((sum, item) => sum + item.penalty, 0);
    const filed = filteredCompliance.filter((item) => item.status === 'Filed' || item.status === 'Approved').length;
    const completionRate = total > 0 ? Math.round((filed / total) * 100) : 0;

    return { total, pending, late, latePenalty, filed, completionRate };
  }, [filteredCompliance]);

  const categories = useMemo(() => ['All', 'GST', 'Income Tax', 'ROC', 'Audit', 'Custom'], []);

  return {
    activeCategory,
    setActiveCategory,
    search,
    setSearch,
    filteredCompliance,
    metrics,
    categories,
  };
};
