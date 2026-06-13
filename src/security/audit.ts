export const buildSecurityAuditMetadata = () => ({
  requestedAt: new Date().toISOString(),
  userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
});
