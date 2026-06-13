export interface PlatformConfig {
  environment: 'development' | 'staging' | 'production';
  enableRealtime: boolean;
  enableJobWorkers: boolean;
  enableAiAssistants: boolean;
  enableAuditExport: boolean;
}

export const platformConfig: PlatformConfig = {
  environment: (import.meta.env.MODE as PlatformConfig['environment']) || 'development',
  enableRealtime: true,
  enableJobWorkers: true,
  enableAiAssistants: true,
  enableAuditExport: false,
};

