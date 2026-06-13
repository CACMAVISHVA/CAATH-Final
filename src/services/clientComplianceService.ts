import { supabase } from '../lib/supabase';
import { getGSTRFilings } from './gstAnalyticsService';
import { getNotices } from './noticeService';
import { getClientTimeline, TimelineEvent } from './clientHealthService';

export type ComplianceDomain = 'GST' | 'Income Tax' | 'TDS' | 'MCA' | 'PF/ESI' | 'Audit' | 'Notices';
export type ComplianceTone = 'compliant' | 'upcoming' | 'overdue';

export interface ClientComplianceItem {
  domain: ComplianceDomain;
  status: ComplianceTone;
  label: string;
  nextDue: string | null;
  lastFiled: string | null;
  pendingActions: number;
  riskWeight: number;
}

export interface FilingHistoryItem {
  id: string;
  domain: ComplianceDomain;
  title: string;
  period: string;
  status: string;
  dueDate: string;
  filedDate: string | null;
}

export interface DueCalendarItem {
  id: string;
  domain: ComplianceDomain;
  title: string;
  dueDate: string;
  status: ComplianceTone;
}

export interface ClientComplianceSnapshot {
  items: ClientComplianceItem[];
  filingHistory: FilingHistoryItem[];
  dueCalendar: DueCalendarItem[];
  timeline: TimelineEvent[];
  riskScore: number;
  pendingActions: number;
  lastActivity: string | null;
}

const classifyDate = (dueDate: string | null, filedDate?: string | null): ComplianceTone => {
  if (filedDate) return 'compliant';
  if (!dueDate) return 'upcoming';
  const due = new Date(dueDate);
  const today = new Date();
  const diff = Math.ceil((due.getTime() - today.getTime()) / 86400000);
  if (diff < 0) return 'overdue';
  return 'upcoming';
};

const makePlaceholder = (domain: ComplianceDomain, nextDue: string | null): ClientComplianceItem => ({
  domain,
  status: classifyDate(nextDue),
  label: nextDue ? `Next due ${new Date(nextDue).toLocaleDateString('en-IN')}` : 'Schedule pending',
  nextDue,
  lastFiled: null,
  pendingActions: nextDue ? 1 : 0,
  riskWeight: nextDue ? (classifyDate(nextDue) === 'overdue' ? 18 : 8) : 4,
});

export const getClientComplianceSnapshot = async (
  clientId: string,
  firmId: string
): Promise<ClientComplianceSnapshot> => {
  const [gstFilings, notices, timeline, taskResult] = await Promise.all([
    getGSTRFilings(clientId),
    getNotices(firmId),
    getClientTimeline(clientId, 25),
    supabase.from('tasks').select('id, title, status, deadline, category').eq('client_id', clientId).eq('firm_id', firmId),
  ]);

  const clientNotices = notices.filter((notice) => notice.client_id === clientId);
  const clientTasks = taskResult.data || [];
  const gstSorted = [...gstFilings].sort((a, b) => new Date(b.due_date).getTime() - new Date(a.due_date).getTime());
  const gstLatest = gstSorted[0];
  const gstPending = gstFilings.filter((filing) => filing.status !== 'Filed').length;
  const gstStatus = gstLatest ? classifyDate(gstLatest.due_date, gstLatest.filing_date) : 'upcoming';

  const items: ClientComplianceItem[] = [
    {
      domain: 'GST',
      status: gstStatus,
      label: gstLatest ? `${gstLatest.return_type} ${gstLatest.period}` : 'GST setup pending',
      nextDue: gstLatest?.due_date || null,
      lastFiled: gstSorted.find((filing) => filing.filing_date)?.filing_date || null,
      pendingActions: gstPending,
      riskWeight: gstStatus === 'overdue' ? 24 : gstPending > 0 ? 12 : 4,
    },
    makePlaceholder('Income Tax', clientTasks.find((task) => task.category === 'Income Tax')?.deadline || null),
    makePlaceholder('TDS', clientTasks.find((task) => task.category === 'TDS')?.deadline || null),
    makePlaceholder('MCA', clientTasks.find((task) => task.category === 'ROC')?.deadline || null),
    makePlaceholder('PF/ESI', clientTasks.find((task) => task.category === 'Payroll')?.deadline || null),
    makePlaceholder('Audit', clientTasks.find((task) => task.category === 'Audit')?.deadline || null),
    {
      domain: 'Notices',
      status: clientNotices.some((notice) => notice.deadline && new Date(notice.deadline) < new Date() && notice.status !== 'Closed')
        ? 'overdue'
        : clientNotices.length > 0
          ? 'upcoming'
          : 'compliant',
      label: clientNotices.length > 0 ? `${clientNotices.length} active notice${clientNotices.length === 1 ? '' : 's'}` : 'No active notices',
      nextDue: clientNotices.find((notice) => notice.deadline)?.deadline || null,
      lastFiled: null,
      pendingActions: clientNotices.filter((notice) => notice.status !== 'Closed').length,
      riskWeight: clientNotices.some((notice) => notice.deadline && new Date(notice.deadline) < new Date() && notice.status !== 'Closed') ? 20 : clientNotices.length > 0 ? 10 : 0,
    },
  ];

  const filingHistory: FilingHistoryItem[] = gstSorted.map((filing) => ({
    id: filing.id,
    domain: 'GST',
    title: filing.return_type,
    period: filing.period,
    status: filing.status,
    dueDate: filing.due_date,
    filedDate: filing.filing_date,
  }));

  const dueCalendar: DueCalendarItem[] = [
    ...items
      .filter((item) => item.nextDue)
      .map((item) => ({
        id: `${item.domain}-${item.nextDue}`,
        domain: item.domain,
        title: `${item.domain} due`,
        dueDate: item.nextDue!,
        status: item.status,
      })),
  ].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  const pendingActions = items.reduce((sum, item) => sum + item.pendingActions, 0);
  const rawRisk = items.reduce((sum, item) => sum + item.riskWeight, 0);
  const riskScore = Math.min(100, rawRisk);
  const lastActivity = timeline[0]?.date || gstSorted.find((filing) => filing.filing_date)?.filing_date || null;

  return {
    items,
    filingHistory,
    dueCalendar,
    timeline,
    riskScore,
    pendingActions,
    lastActivity,
  };
};
