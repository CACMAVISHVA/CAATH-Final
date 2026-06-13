import { ClientComplianceSnapshot } from './clientComplianceService';
import { assessComplianceRisk } from './riskScoreEngine';

export type AIInsightType =
  | 'risk'
  | 'missing-filing'
  | 'gst-anomaly'
  | 'notice'
  | 'audit'
  | 'task'
  | 'follow-up';

export interface ComplianceAIInsight {
  id: string;
  type: AIInsightType;
  title: string;
  detail: string;
  severity: 'info' | 'warning' | 'critical';
  recommendation: string;
}

export const generateComplianceInsights = (snapshot: ClientComplianceSnapshot): ComplianceAIInsight[] => {
  const risk = assessComplianceRisk(snapshot);
  const gst = snapshot.items.find((item) => item.domain === 'GST');
  const notices = snapshot.items.find((item) => item.domain === 'Notices');
  const audit = snapshot.items.find((item) => item.domain === 'Audit');
  const insights: ComplianceAIInsight[] = [];

  insights.push({
    id: 'risk-overview',
    type: 'risk',
    title: `${risk.band[0].toUpperCase()}${risk.band.slice(1)} client risk`,
    detail: risk.drivers.join(' | ') || 'No major risk drivers detected.',
    severity: risk.band === 'high' ? 'critical' : risk.band === 'medium' ? 'warning' : 'info',
    recommendation: risk.band === 'high'
      ? 'Create an escalation task and review overdue domains today.'
      : 'Continue monitoring scheduled filings and open notices.',
  });

  if (gst && gst.pendingActions > 0) {
    insights.push({
      id: 'gst-missing',
      type: 'missing-filing',
      title: 'GST filing attention required',
      detail: `${gst.pendingActions} GST action${gst.pendingActions === 1 ? '' : 's'} remain open.`,
      severity: gst.status === 'overdue' ? 'critical' : 'warning',
      recommendation: 'Review GSTR activity and reconcile the latest return cycle.',
    });
  }

  if (notices && notices.pendingActions > 0) {
    insights.push({
      id: 'notice-risk',
      type: 'notice',
      title: 'Notice risk indicator',
      detail: `${notices.pendingActions} active notice${notices.pendingActions === 1 ? '' : 's'} need follow-up.`,
      severity: notices.status === 'overdue' ? 'critical' : 'warning',
      recommendation: 'Assign owner, verify deadline, and draft response workflow.',
    });
  }

  if (audit?.status !== 'compliant') {
    insights.push({
      id: 'audit-attention',
      type: 'audit',
      title: 'Audit attention alert',
      detail: audit?.label || 'Audit schedule requires review.',
      severity: audit?.status === 'overdue' ? 'critical' : 'warning',
      recommendation: 'Confirm evidence readiness and appoint review owner.',
    });
  }

  if (snapshot.pendingActions > 0) {
    insights.push({
      id: 'smart-task',
      type: 'task',
      title: 'Smart task recommendation',
      detail: 'Pending compliance work detected across the client profile.',
      severity: 'info',
      recommendation: 'Create a bundled follow-up task with owner, due date, and attachments.',
    });
    insights.push({
      id: 'follow-up',
      type: 'follow-up',
      title: 'Automatic follow-up suggestion',
      detail: 'Open work remains after the latest activity event.',
      severity: 'info',
      recommendation: 'Schedule client follow-up and request missing documents.',
    });
  }

  return insights;
};

// Future GPT integration point: swap the deterministic generator with a provider-backed adapter.
export interface ComplianceAIProvider {
  generate(snapshot: ClientComplianceSnapshot): Promise<ComplianceAIInsight[]>;
}
