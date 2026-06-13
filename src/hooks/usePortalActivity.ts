import { useCallback, useEffect, useState } from 'react';
import {
  getPortalActivitySummary,
  getPortalActivitySummaryGlobal,
} from '../services/portalLauncherService';

export interface PortalActivitySummary {
  total: number;
  failed: number;
  byPortal: Record<string, number>;
  byAction: Record<string, number>;
}

export interface PortalActivityResult {
  loading: boolean;
  error: string | null;
  summary: PortalActivitySummary | null;
  recent: any[];
  refresh: () => Promise<void>;
}

export const usePortalActivity = (clientId?: string): PortalActivityResult => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<PortalActivitySummary | null>(null);
  const [recent, setRecent] = useState<any[]>([]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = clientId
        ? await getPortalActivitySummary(clientId)
        : await getPortalActivitySummaryGlobal();
      setSummary(result.summary);
      setRecent(result.recent);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load portal activity');
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    loading,
    error,
    summary,
    recent,
    refresh,
  };
};
