/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Main export file for Document Vault domain.
 * This file re-exports from domain-specific services for backward compatibility.
 */

// Types
export type {
  DocumentCategory,
  DocumentType,
  DocumentVaultFile,
  DocumentUploadInput,
  DocumentSearchParams,
} from './documents/documentTypes';

export {
  DOCUMENT_CATEGORIES,
  DOCUMENT_TYPES,
} from './documents/documentTypes';

// Core Service
export {
  uploadDocument,
  getDocuments,
  getDocument,
  getClientDocuments,
  getArchivedDocuments,
  getDeletedDocuments,
  updateDocument,
  searchDocuments,
} from './documents/documentCoreService';

// Audit Service
export {
  writeDocumentAudit,
  logDocumentView,
  logDocumentDownload,
  getDocumentAuditTrail,
} from './documents/documentAuditService';

// Version Service
export {
  addDocumentVersion,
  getDocumentVersions,
} from './documents/documentVersionService';

// Lifecycle Service
export {
  archiveDocument,
  restoreDocument,
  softDeleteDocument,
  permanentDeleteDocument,
  restoreDocumentFromTrash,
} from './documents/documentLifecycleService';

// Analytics Service
export {
  getClientDocumentCounts,
  getExpiringDocuments,
  getStorageAnalytics,
} from './documents/documentAnalyticsService';

// Intelligence & Governance
export {
  extractDocumentMetadata,
} from './documents/documentExtractionService';

export {
  orchestrateDocumentIntelligence,
} from './documents/documentIntelligenceOrchestrationService';

export {
  getDocumentIntelligenceDashboardSummary,
} from './documents/documentIntelligenceDashboardService';

export {
  canAccessDocument,
  getDocumentGovernanceSnapshot,
} from './documents/documentGovernanceService';

// Linking Service
export {
  linkDocument,
  unlinkDocument,
} from './documents/documentLinkingService';
