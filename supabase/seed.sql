-- CAATH OS Development Seed Data
-- IMPORTANT: Run schema.sql FIRST before this seed script
-- This script creates auth.users AND public.users records

-- =====================================================
-- STEP 1: Create development firm
-- =====================================================
INSERT INTO public.firms (id, name, status, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Demo Firm Ltd',
  'Active',
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- STEP 2: Create auth.users via admin API
-- IMPORTANT: In Supabase, create these users via Dashboard or CLI:
-- 1. Go to Authentication > Users
-- 2. Create users with these emails:
--    - godadmin@caath.com
--    - superadmin@firm.com
--    - admin@firm.com
--    - staff@firm.com
--    - client@firm.com
-- 3. Use strong unique passwords per environment.
--
-- OR use Supabase CLI:
-- supabase users create --email godadmin@caath.com --password '<REDACTED_STRONG_PASSWORD>'
-- supabase users create --email superadmin@firm.com --password '<REDACTED_STRONG_PASSWORD>'
-- supabase users create --email admin@firm.com --password '<REDACTED_STRONG_PASSWORD>'
-- supabase users create --email staff@firm.com --password '<REDACTED_STRONG_PASSWORD>'
-- supabase users create --email client@firm.com --password '<REDACTED_STRONG_PASSWORD>'
--
-- Then update the auth_id values below after getting user IDs:
-- SELECT id, email FROM auth.users;
-- =====================================================

-- =====================================================
-- STEP 3: Create public.users records
-- Replace auth_id placeholders with actual auth.users IDs
-- =====================================================

-- GodAdmin (no firm required)
INSERT INTO public.users (id, auth_id, firm_id, name, email, role, status, created_at, updated_at)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  (SELECT id FROM auth.users WHERE email = 'godadmin@caath.com' LIMIT 1),
  NULL,
  'God Admin',
  'godadmin@caath.com',
  'GodAdmin',
  'Active',
  now(),
  now()
)
ON CONFLICT (auth_id) DO UPDATE SET
  role = 'GodAdmin',
  status = 'Active';

-- SuperAdmin
INSERT INTO public.users (id, auth_id, firm_id, name, email, role, status, created_at, updated_at)
VALUES (
  '22222222-2222-2222-2222-222222222222',
  (SELECT id FROM auth.users WHERE email = 'superadmin@firm.com' LIMIT 1),
  '00000000-0000-0000-0000-000000000001',
  'Super Admin',
  'superadmin@firm.com',
  'SuperAdmin',
  'Active',
  now(),
  now()
)
ON CONFLICT (auth_id) DO UPDATE SET
  role = 'SuperAdmin',
  firm_id = '00000000-0000-0000-0000-000000000001',
  status = 'Active';

-- Admin
INSERT INTO public.users (id, auth_id, firm_id, name, email, role, status, created_at, updated_at)
VALUES (
  '33333333-3333-3333-3333-333333333333',
  (SELECT id FROM auth.users WHERE email = 'admin@firm.com' LIMIT 1),
  '00000000-0000-0000-0000-000000000001',
  'Admin User',
  'admin@firm.com',
  'Admin',
  'Active',
  now(),
  now()
)
ON CONFLICT (auth_id) DO UPDATE SET
  role = 'Admin',
  firm_id = '00000000-0000-0000-0000-000000000001',
  status = 'Active';

-- Staff
INSERT INTO public.users (id, auth_id, firm_id, name, email, role, status, created_at, updated_at)
VALUES (
  '44444444-4444-4444-4444-444444444444',
  (SELECT id FROM auth.users WHERE email = 'staff@firm.com' LIMIT 1),
  '00000000-0000-0000-0000-000000000001',
  'Staff Member',
  'staff@firm.com',
  'Staff',
  'Active',
  now(),
  now()
)
ON CONFLICT (auth_id) DO UPDATE SET
  role = 'Staff',
  firm_id = '00000000-0000-0000-0000-000000000001',
  status = 'Active';

-- Client
INSERT INTO public.users (id, auth_id, firm_id, name, email, role, status, created_at, updated_at)
VALUES (
  '55555555-5555-5555-5555-555555555555',
  (SELECT id FROM auth.users WHERE email = 'client@firm.com' LIMIT 1),
  '00000000-0000-0000-0000-000000000001',
  'Client User',
  'client@firm.com',
  'Client',
  'Active',
  now(),
  now()
)
ON CONFLICT (auth_id) DO UPDATE SET
  role = 'Client',
  firm_id = '00000000-0000-0000-0000-000000000001',
  status = 'Active';

-- =====================================================
-- STEP 4: Create sample client for demo firm
-- =====================================================
INSERT INTO public.clients (id, firm_id, name, type, pan, contact_person, email, phone, risk_level, services, created_at, updated_at)
VALUES (
  '66666666-6666-6666-6666-666666666666',
  '00000000-0000-0000-0000-000000000001',
  'Test Client Pvt Ltd',
  'Company',
  'ABCDE1234F',
  'John Doe',
  'contact@testclient.com',
  '+91-9876543210',
  'Low',
  ARRAY['GST', 'Income Tax'],
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

-- Link client to client user
INSERT INTO public.client_contacts (id, firm_id, client_id, user_id, created_at, updated_at)
VALUES (
  '77777777-7777-7777-7777-777777777777',
  '00000000-0000-0000-0000-000000000001',
  '66666666-6666-6666-6666-666666666666',
  '55555555-5555-5555-5555-555555555555',
  now(),
  now()
)
ON CONFLICT (client_id, user_id) DO NOTHING;

-- =====================================================
-- STEP 5: Create subscription for demo firm
-- =====================================================
INSERT INTO public.subscriptions (
  id,
  firm_id,
  plan,
  status,
  amount,
  billing_cycle,
  trial_ends_at,
  starts_at,
  expires_at,
  features,
  created_at,
  updated_at
)
VALUES (
  '88888888-8888-8888-8888-888888888888',
  '00000000-0000-0000-0000-000000000001',
  'Professional',
  'Active',
  4999,
  'Monthly',
  NULL,
  now(),
  now() + interval '30 days',
  '{
    "clients": true,
    "staff_unlimited": true,
    "documents": true,
    "compliance": true,
    "notices": true,
    "billing": true,
    "audit_logs": true,
    "automation": true,
    "api_access": true,
    "white_label": false
  }'::jsonb,
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- STEP 6: Create client portal token
-- =====================================================
INSERT INTO public.client_portals (
  id,
  firm_id,
  client_id,
  token,
  token_expires_at,
  enabled,
  created_at,
  updated_at
)
VALUES (
  '99999999-9999-9999-9999-999999999999',
  '00000000-0000-0000-0000-000000000001',
  '66666666-6666-6666-6666-666666666666',
  gen_random_uuid()::text,
  now() + interval '1 year',
  true,
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- VERIFICATION QUERY
-- =====================================================
-- Run this to verify setup:
SELECT
  u.name as user_name,
  u.email,
  u.role,
  u.status,
  f.name as firm_name,
  s.plan as subscription_plan,
  s.status as subscription_status
FROM public.users u
LEFT JOIN public.firms f ON u.firm_id = f.id
LEFT JOIN public.subscriptions s ON u.firm_id = s.firm_id
WHERE u.email LIKE '%@caath.com' OR u.email LIKE '%@firm.com'
ORDER BY u.role;
