import type { IncomingMessage, ServerResponse } from 'node:http';

const send = (res: ServerResponse, status: number, payload: unknown) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.end(JSON.stringify(payload));
};

export default function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'GET') return send(res, 405, { status: 'method_not_allowed' });

  const checks = {
    databaseConfigured: Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
    paymentConfigured: Boolean(process.env.CASHFREE_APP_ID && process.env.CASHFREE_SECRET_KEY),
    paymentMode: process.env.CASHFREE_ENV === 'production' ? 'production' : 'sandbox',
  };
  const healthy = checks.databaseConfigured && checks.paymentConfigured && (process.env.VERCEL_ENV !== 'production' || checks.paymentMode === 'production');

  return send(res, healthy ? 200 : 503, {
    service: 'CAATH',
    status: healthy ? 'healthy' : 'configuration_required',
    environment: process.env.VERCEL_ENV || 'development',
    checks,
    timestamp: new Date().toISOString(),
  });
}
