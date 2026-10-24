import type { IncomingMessage, ServerResponse } from 'node:http';
import { getServiceClient } from '../server/cashfree.js';
import { authenticateGspManager, getGspConfigurationStatus } from '../server/gst-gsp.js';

const send = (res: ServerResponse, status: number, payload: unknown) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(payload));
};

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'GET') return send(res, 405, { error: 'Method not allowed.' });
  try {
    const db = getServiceClient();
    const profile = await authenticateGspManager(req, db);
    const { data: connections, error } = await db.from('gst_gsp_connections')
      .select('id,provider_code,environment,status,consent_status,last_verified_at,last_sync_at,gstin')
      .eq('firm_id', profile.firm_id).order('created_at', { ascending: false });
    if (error) throw error;
    return send(res, 200, { configuration: getGspConfigurationStatus(), connections: connections || [] });
  } catch (error) {
    const status = Number((error as { statusCode?: number })?.statusCode || 500);
    return send(res, status, { error: error instanceof Error ? error.message : 'Unable to inspect GST integration readiness.' });
  }
}
