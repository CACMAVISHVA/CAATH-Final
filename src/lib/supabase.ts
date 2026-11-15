import { createClient } from '@supabase/supabase-js'
import { createMonitoredFetch } from '../services/errorReporter'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Every Supabase call (database, auth, storage, functions) goes through the monitored fetch so
// genuine technical failures reach the GodAdmin error dashboard. Successful calls are untouched.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, { global: { fetch: createMonitoredFetch() } })