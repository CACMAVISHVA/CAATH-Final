import { User } from '../../../types';
export type ClientType = 'Proprietorship' | 'Partnership Firm' | 'LLP' | 'Private Limited Company' | 'Public Company' | 'Trust' | 'NGO' | 'Others';
export type RiskLevel = 'Low' | 'Medium' | 'High';
export type ClientInputDto = { firmId: string; name: string; type: string; pan: string; gstin?: string; contactPerson?: string; email?: string; phone?: string; riskLevel?: RiskLevel; services?: string[]; assignedStaffId?: string; user: User; };
export type ClientRowDto = { id: string; operational_id?: string; firm_id: string; name: string; type: string; pan: string; gstin: string | null; contact_person: string | null; email: string | null; phone: string | null; risk_level: RiskLevel; services: string[]; assigned_staff_id: string | null; created_by: string | null; updated_by: string | null; created_at: string; updated_at: string; };
