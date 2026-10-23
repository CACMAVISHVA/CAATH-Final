export type DeadlineBand = 'Overdue' | 'Due today' | 'Due soon' | 'Later' | 'No deadline' | 'Resolved';
export const indiaDate = (now = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
export function deadlineBand(deadline: string | null, status: string, today = indiaDate()): DeadlineBand {
  if (['Filed', 'Closed', 'Archived'].includes(status)) return 'Resolved';
  if (!deadline || !/^\d{4}-\d{2}-\d{2}$/.test(deadline.slice(0, 10))) return 'No deadline';
  const days = (Date.parse(deadline.slice(0, 10)) - Date.parse(today)) / 86400000;
  if (!Number.isFinite(days)) return 'No deadline';
  return days < 0 ? 'Overdue' : days === 0 ? 'Due today' : days <= 7 ? 'Due soon' : 'Later';
}
export function validateNoticeInput(input: { noticeNumber?: string; receivedDate: string; deadline?: string }) {
  if (!input.noticeNumber?.trim()) throw new Error('Notice number is required.');
  for (const date of [input.receivedDate, input.deadline]) {
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date) throw new Error('Valid received and deadline dates are required.');
  }
  if (input.deadline! < input.receivedDate) throw new Error('Deadline cannot precede receipt.');
}
export const noticeTransitions: Record<string, string[]> = {
  Received: ['Assigned', 'Escalated', 'Archived'], Assigned: ['Drafting', 'Under_Review', 'Escalated', 'Reassigned', 'Archived'],
  Drafting: ['Drafted', 'Under_Review', 'Escalated', 'Reassigned', 'Archived'], Drafted: ['Under_Review', 'Filed', 'Escalated', 'Reassigned', 'Archived'],
  Under_Review: ['Filed', 'Escalated', 'Reassigned', 'Archived'], Escalated: ['Assigned', 'Drafting', 'Under_Review', 'Filed', 'Reassigned', 'Archived'],
  Reassigned: ['Assigned', 'Drafting', 'Under_Review', 'Escalated', 'Archived'], Filed: ['Closed', 'Archived'], Closed: ['Archived'], Archived: [],
};
