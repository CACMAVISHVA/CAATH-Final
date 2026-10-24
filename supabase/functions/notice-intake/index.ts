import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';
import { createNoticeIntakeHandler } from './handler.ts';
Deno.serve(createNoticeIntakeHandler(() => createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)));
