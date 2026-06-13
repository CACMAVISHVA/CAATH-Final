import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FilingDelayAnalytics,
  GSTRFiling,
  ClientHealthScore,
  getAllGSTRFilings,
  getAllClientsHealthScores,
  getFilingDelayAnalytics,
} from '../services/gstAnalyticsService';

export interface GSTAnalyticsMetrics {
  totalClients: number;
  filed: number;
  pending: number;
  late: number;
  totalTax: number;
  overduePenalty: number;
  avgHealthScore: number;
  filingCount: number;
}

export interface GSTRiskBucketCounts {
  Low: number;
  Medium: number;
  High: number;
}

export interface GSTAnomalyAlert {
  title: string;
  detail: string;
  severity: 'high' | 'medium' | 'low';
}

export interface GSTRiskAnalysisResult {
  loading: boolean;
  error: string | null;
  filings: GSTRFiling[];
  healthScores: ClientHealthScore[];
  delayAnalytics: FilingDelayAnalytics[];
  dashboardStats: GSTAnalyticsMetrics;
  riskBuckets: GSTRiskBucketCounts;
  anomalyAlerts: GSTAnomalyAlert[];
  refresh: () => Promise<void>;
}

export const useGSTRiskAnalysis = (firmId?: string, isOpen = true): GSTRiskAnalysisResult => {
  const [filings, setFilings] = useState<GSTRFiling[]>([]);
  const [healthScores, setHealthScores] = useState<ClientHealthScore[]>([]);
  const [delayAnalytics, setDelayAnalytics] = useState<FilingDelayAnalytics[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!firmId) return;
    setLoading(true);
    setError(null);
    try {
      const [filingData, scoreData, delayData] = await Promise.all([
        getAllGSTRFilings(firmId),
        getAllClientsHealthScores(firmId),
        getFilingDelayAnalytics(firmId),
      ]);
      setFilings(filingData);
      setHealthScores(scoreData);
      setDelayAnalytics(delayData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load GST analytics');
    } finally {
      setLoading(false);
    }
  }, [firmId]);

  useEffect(() => {
    if (firmId && isOpen) {
      refresh();
    }
  }, [firmId, isOpen, refresh]);

  const dashboardStats = useMemo<GSTAnalyticsMetrics>(() => {
    const totalClients = new Set(filings.map((item) => item.client_id)).size;
    const filed = filings.filter((item) => item.status === 'Filed').length;
    const pending = filings.filter((item) => item.status === 'Pending').length;
    const late = filings.filter((item) => item.status === 'Late').length;
    const totalTax = filings.reduce((sum, item) => sum + item.taxable_value, 0);
    const overduePenalty = filings.reduce((sum, item) => sum + item.late_fee + item.interest, 0);
    const avgHealthScore = healthScores.length > 0
      ? Math.round(healthScores.reduce((sum, item) => sum + item.overall_score, 0) / healthScores.length)
      : 0;

    return {
      totalClients,
      filed,
      pending,
      late,
      totalTax,
      overduePenalty,
      avgHealthScore,
      filingCount: filings.length,
    };
  }, [filings, healthScores]);

  const riskBuckets = useMemo<GSTRiskBucketCounts>(() => {
    return healthScores.reduce(
      (counts, score) => {
        if (score.overall_score >= 80) counts.Low += 1;
        else if (score.overall_score >= 60) counts.Medium += 1;
        else counts.High += 1;
        return counts;
      },
      { Low: 0, Medium: 0, High: 0 }
    );
  }, [healthScores]);

  const anomalyAlerts = useMemo<GSTAnomalyAlert[]>(() => {
    const alerts: GSTAnomalyAlert[] = [];
    delayAnalytics.slice(0, 3).forEach((delay) => {
      alerts.push({
        title: `${delay.client_name} filing delayed by ${delay.days_late} days`,
        detail: `Exposure ₹${Math.round(delay.total_exposure).toLocaleString()}`,
        severity: 'high',
      });
    });

    healthScores.filter((score) => score.overall_score < 55).slice(0, 3).forEach((score) => {
      alerts.push({
        title: `${score.client_name} has low GST health`,
        detail: `Score ${score.overall_score}`,
        severity: 'medium',
      });
    });

    if (alerts.length === 0) {
      alerts.push({
        title: 'No critical anomalies detected',
        detail: 'GST notice-risk posture is stable.',
        severity: 'low',
      });
    }

    return alerts;
  }, [delayAnalytics, healthScores]);

  return {
    loading,
    error,
    filings,
    healthScores,
    delayAnalytics,
    dashboardStats,
    riskBuckets,
    anomalyAlerts,
    refresh,
  };
};
