export type PlatformTelemetryPayload = Record<string, unknown>;

const SENSITIVE_KEY_PATTERNS = [
  'name',
  'client',
  'invoice',
  'payroll',
  'salary',
  'gst',
  'gstin',
  'pan',
  'document',
  'notice',
  'amount',
  'tax',
  'email',
  'phone',
  'address',
  'bank',
  'account',
];

const ALLOWED_METADATA_KEYS = [
  'count',
  'counts',
  'total',
  'status',
  'health',
  'metric',
  'metrics',
  'usage',
  'size',
  'duration',
  'latency',
  'error',
  'errors',
  'success',
  'failed',
  'ratio',
  'rate',
  'score',
  'severity',
  'feature',
  'module',
  'event',
  'type',
  'source',
  'category',
  'queue',
  'pending',
  'overdue',
  'active',
  'stalled',
];

const isPrimitive = (value: unknown) =>
  value == null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';

const looksSensitiveKey = (key: string) => {
  const lower = key.toLowerCase();
  return SENSITIVE_KEY_PATTERNS.some((pattern) => lower.includes(pattern));
};

const isAllowedMetadataKey = (key: string) => {
  const lower = key.toLowerCase();
  return ALLOWED_METADATA_KEYS.some((pattern) => lower.includes(pattern));
};

const redactValue = (value: unknown): unknown => {
  if (isPrimitive(value)) return value;
  if (Array.isArray(value)) return { count: value.length };
  return '[redacted]';
};

export const sanitizeForPlatformTelemetry = (input?: Record<string, unknown>): PlatformTelemetryPayload => {
  if (!input) return {};

  const output: PlatformTelemetryPayload = {};
  Object.entries(input).forEach(([key, value]) => {
    if (looksSensitiveKey(key)) return;
    if (!isAllowedMetadataKey(key)) return;

    if (isPrimitive(value)) {
      output[key] = value;
      return;
    }

    if (Array.isArray(value)) {
      output[key] = { count: value.length };
      return;
    }

    if (value && typeof value === 'object') {
      const nested = sanitizeForPlatformTelemetry(value as Record<string, unknown>);
      output[key] = Object.keys(nested).length ? nested : redactValue(value);
      return;
    }

    output[key] = redactValue(value);
  });

  return output;
};

export const sanitizeAuditDetailsForPlatform = (details: string) => {
  if (!details) return '';
  return 'Platform governance action recorded.';
};
