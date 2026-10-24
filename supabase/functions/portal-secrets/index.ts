import { handleVault } from './handler.ts';
import { allowedOrigin, withCors, toSafeErrorResponse } from '../_shared/security.ts';
Deno.serve(async (req: Request) => {
 let origin: string | null = null;
 try {
  origin = allowedOrigin(req.headers.get('origin'));
  return withCors(req.method === 'OPTIONS' ? new Response(null, { status: 204 }) : await handleVault(req), origin);
 } catch (error) { return withCors(toSafeErrorResponse(error), origin); }
});
