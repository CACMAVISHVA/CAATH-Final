/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Main export file for Portal Launcher domain.
 * This file re-exports from domain-specific services for backward compatibility.
 */

import type { PortalType } from './portals/portalTypes';

// Types
export type {
  PortalType,
  PortalCredential,
  PortalCredentialAuditAction,
  PortalCredentialSecret,
  PortalCredentialSummary,
  PortalCredentialInput,
  PortalCredentialUpdatePayload,
  PortalAuditLog,
  PortalAuditLogQueryOptions,
} from './portals/portalTypes';

// Credential Service
export {
  createPortalCredential,
  getClientPortalCredentials,
  getPortalCredential,
  updatePortalCredential,
  deletePortalCredential,
} from './portals/portalCredentialService';

// Audit Service
export {
  PORTAL_AUDIT_RETENTION_DAYS,
  createPortalAuditLog,
  getPortalAuditLogs,
} from './portals/portalAuditService';

// Access Service
export {
  canUsePortalLauncher,
  assertPortalCredentialAccess,
  revealPassword,
  validatePortalAccess,
} from './portals/portalAccessService';

// Launch Service
export {
  launchPortal,
  recordPortalFiling,
} from './portals/portalLaunchService';

export const PORTAL_CONFIG: Record<PortalType, { name: string; description: string; color: string }> = {
  GST: {
    name: 'GST Portal',
    description: 'Launch GST filing portals and access GST credentials',
    color: 'bg-emerald-500',
  },
  MCA: {
    name: 'MCA Portal',
    description: 'Open MCA service portals for company compliances',
    color: 'bg-sky-500',
  },
  IncomeTax: {
    name: 'Income Tax Portal',
    description: 'Launch Income Tax websites and e-filing portals',
    color: 'bg-violet-500',
  },
  ICEGATE: {
    name: 'ICEGATE Portal',
    description: 'Open ICEGATE import/export and customs portals',
    color: 'bg-orange-500',
  },
  EPFO: {
    name: 'EPFO Portal',
    description: 'Access EPFO employee and compliance services',
    color: 'bg-cyan-500',
  },
  ESIC: {
    name: 'ESIC Portal',
    description: 'Open ESIC employer and employee compliance portals',
    color: 'bg-slate-500',
  },
  Banking: {
    name: 'Banking Portal',
    description: 'Launch banking portals and payment gateways',
    color: 'bg-lime-500',
  },
  Custom: {
    name: 'Custom Portal',
    description: 'Open custom configured portal access',
    color: 'bg-fuchsia-500',
  },
};

// Activity Service
export {
  getPortalActivitySummary,
  getPortalActivitySummaryGlobal,
} from './portals/portalAuditService';
