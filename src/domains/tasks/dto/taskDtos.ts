import { User, UserRole } from '../../../types';
export type TaskPriority = 'Low' | 'Medium' | 'High' | 'Urgent';
export type TaskStatus = 'Created' | 'Assigned' | 'Accepted' | 'In Progress' | 'Under Review' | 'Escalated' | 'Reassigned' | 'Completed' | 'Archived' | 'Todo' | 'Review';
export type TaskCategory = 'GST' | 'Income Tax' | 'Audit' | 'ROC' | 'TDS' | 'Other';
export type TaskInputDto = { firmId: string; clientId?: string; assignedTo?: string; title: string; description?: string; priority?: TaskPriority; status?: TaskStatus; category?: TaskCategory; deadline?: string; user: User; };
export type TaskRowDto = { id: string; firm_id: string; client_id: string | null; assigned_to: string | null; title: string; description: string | null; priority: TaskPriority; status: TaskStatus; category: string | null; deadline: string | null; created_by: string | null; updated_by: string | null; created_at: string; updated_at: string; };
export type TaskReassignmentHistoryDto = { id: string; task_id: string; firm_id: string; previous_assignee: string | null; previous_assignee_name: string | null; new_assignee: string | null; new_assignee_name: string | null; reassigned_by: string; reassigned_by_name: string; reason: string | null; created_at: string; };
export type UserRoleRow = { id: string; role: UserRole; firm_id: string | null };
