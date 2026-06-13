import { ClientComplianceSnapshot } from './clientComplianceService';

export type RiskBand = 'low' | 'medium' | 'high';

export interface RiskAssessment {
  score: number;
  band: RiskBand;
  drivers: string[];
}

export const assessComplianceRisk = (snapshot: ClientComplianceSnapshot): RiskAssessment => {
  const overdueCount = snapshot.items.filter((item) => item.status === 'overdue').length;
  const upcomingCount = snapshot.items.filter((item) => item.status === 'upcoming').length;
  const noticeItem = snapshot.items.find((item) => item.domain === 'Notices');
  const score = Math.min(
    100,
    snapshot.riskScore +
      overdueCount * 8 +
      Math.min(snapshot.pendingActions, 10) * 2 +
      (noticeItem?.pendingActions || 0) * 5
  );

  const drivers = [
    overdueCount > 0 ? `${overdueCount} overdue compliance domain${overdueCount === 1 ? '' : 's'}` : null,
    upcomingCount > 0 ? `${upcomingCount} upcoming due domain${upcomingCount === 1 ? '' : 's'}` : null,
    snapshot.pendingActions > 0 ? `${snapshot.pendingActions} pending action${snapshot.pendingActions === 1 ? '' : 's'}` : null,
    noticeItem?.pendingActions ? `${noticeItem.pendingActions} active notice${noticeItem.pendingActions === 1 ? '' : 's'}` : null,
  ].filter(Boolean) as string[];

  return {
    score,
    band: score >= 70 ? 'high' : score >= 35 ? 'medium' : 'low',
    drivers,
  };
};
