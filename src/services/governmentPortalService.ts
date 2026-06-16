import { supabase } from '../lib/supabase';
import { User } from '../types';
import { ClientRow } from './clientService';
import { TaskRow } from './taskService';
import { PortalType } from './portalLauncherService';

export type GovernmentPortalType = Extract<PortalType, 'GST' | 'IncomeTax' | 'MCA' | 'TRACES'>;

export type GovernmentPortalConfig = {
  type: GovernmentPortalType;
  tabId: string;
  name: string;
  shortName: string;
  officialUrl: string;
  identifierLabel: 'GSTIN' | 'PAN' | 'CIN / LLPIN' | 'TAN';
  identifierKey: 'gstin' | 'pan' | 'cin_llpin' | 'tan';
  workflowTypes: string[];
  accentClass: string;
};

export const GOVERNMENT_PORTALS: GovernmentPortalConfig[] = [
  {
    type: 'GST',
    tabId: 'portal-gst',
    name: 'GST Portal',
    shortName: 'GST',
    officialUrl: 'https://www.gst.gov.in/',
    identifierLabel: 'GSTIN',
    identifierKey: 'gstin',
    workflowTypes: ['GST Filing', 'GST Registration', 'GST Notice'],
    accentClass: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20',
  },
  {
    type: 'IncomeTax',
    tabId: 'portal-income-tax',
    name: 'Income Tax Portal',
    shortName: 'Income Tax',
    officialUrl: 'https://www.incometax.gov.in/iec/foportal/',
    identifierLabel: 'PAN',
    identifierKey: 'pan',
    workflowTypes: ['Income Tax Filing', 'Income Tax Notice', 'Tax Payment'],
    accentClass: 'text-sky-300 bg-sky-500/10 border-sky-500/20',
  },
  {
    type: 'MCA',
    tabId: 'portal-mca',
    name: 'MCA Portal',
    shortName: 'MCA',
    officialUrl: 'https://www.mca.gov.in/content/mca/global/en/home.html',
    identifierLabel: 'CIN / LLPIN',
    identifierKey: 'cin_llpin',
    workflowTypes: ['MCA Annual Filing', 'ROC Filing', 'Director KYC'],
    accentClass: 'text-violet-300 bg-violet-500/10 border-violet-500/20',
  },
  {
    type: 'TRACES',
    tabId: 'portal-traces',
    name: 'TRACES Portal',
    shortName: 'TRACES',
    officialUrl: 'https://www.tdscpc.gov.in/app/login.xhtml',
    identifierLabel: 'TAN',
    identifierKey: 'tan',
    workflowTypes: ['TRACES/TDS Activities', 'TDS Return', 'Form 16/16A'],
    accentClass: 'text-amber-300 bg-amber-500/10 border-amber-500/20',
  },
];

export const getGovernmentPortalByTab = (tabId: string) =>
  GOVERNMENT_PORTALS.find((portal) => portal.tabId === tabId) || GOVERNMENT_PORTALS[0];

export const getClientIdentifier = (client: ClientRow | null | undefined, portal: GovernmentPortalConfig) => {
  if (!client) return '';
  const value = client[portal.identifierKey];
  return typeof value === 'string' ? value : '';
};

export const getPortalUsername = (client: ClientRow | null | undefined, portal: GovernmentPortalConfig) => {
  if (!client) return '';
  const usernames = client.portal_usernames || {};
  return usernames[portal.type] || client.portal_username || '';
};

export const openOfficialPortal = (portal: GovernmentPortalConfig) => {
  window.open(portal.officialUrl, '_blank', 'noopener,noreferrer');
};

export const recordGovernmentPortalAccess = async (params: {
  user: User;
  portal: GovernmentPortalConfig;
  client?: ClientRow | null;
  task?: TaskRow | null;
  action?: 'portal_launch' | 'identifier_copy';
}) => {
  const firmId = params.user.firmId || params.client?.firm_id;
  const details = {
    portal: params.portal.name,
    portalType: params.portal.type,
    clientId: params.client?.id || null,
    clientName: params.client?.name || null,
    taskId: params.task?.id || null,
    workflowType: params.task?.portal_workflow_type || params.task?.category || null,
    officialUrl: params.portal.officialUrl,
  };

  if (firmId) {
    await supabase.from('audit_logs').insert([{
      firm_id: firmId,
      user_id: params.user.id,
      user_name: params.user.name,
      user_role: params.user.role,
      action: params.action === 'identifier_copy' ? 'Government Portal Identifier Copied' : 'Government Portal Launched',
      entity_type: 'Government Portal',
      entity_id: params.task?.id || params.client?.id || null,
      details: JSON.stringify(details),
      severity: 'info',
    }]);
  }

  if (params.client?.id) {
    await supabase.from('portal_audit_logs').insert([{
      firm_id: firmId || null,
      client_id: params.client.id,
      portal_type: params.portal.type,
      user_id: params.user.id,
      user_name: params.user.name,
      user_role: params.user.role,
      action: 'login',
      related_task_id: params.task?.id || null,
      workflow_type: params.task?.portal_workflow_type || params.task?.category || null,
      official_url: params.portal.officialUrl,
      details: JSON.stringify(details),
      timestamp: new Date().toISOString(),
      success: true,
    }]);
  }
};
