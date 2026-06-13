export interface OperationalRecommendation {
  id: string;
  title: string;
  severity: 'info' | 'warning' | 'critical';
  reason: string;
  suggestedAction: string;
}

