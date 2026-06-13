# CAATH OS Database Setup Guide

## Prerequisites

1. Supabase project created
2. Supabase CLI installed
3. Service role key available

## Setup Steps

### Step 1: Run the Schema Migration

Copy `schema.sql` content and run it in the Supabase SQL Editor:

1. Go to your Supabase Dashboard
2. Navigate to SQL Editor
3. Paste the contents of `schema.sql`
4. Click "Run"

### Step 2: Create Auth Users

The seed script requires auth.users to exist first. Create them using ONE of these methods:

#### Option A: Supabase Dashboard (Recommended)
1. Go to Authentication > Users
2. Click "Add user"
3. Create each user:
   - Configure test users with unique, secret passwords per environment.

#### Option B: Supabase CLI
```bash
# Set your project URL
export SUPABASE_PROJECT_URL="your-project-url"
export SUPABASE_ACCESS_TOKEN="your-access-token"

# Create users
supabase users create --email godadmin@caath.com --password '<REDACTED_STRONG_PASSWORD>'
supabase users create --email superadmin@firm.com --password '<REDACTED_STRONG_PASSWORD>'
supabase users create --email admin@firm.com --password '<REDACTED_STRONG_PASSWORD>'
supabase users create --email staff@firm.com --password '<REDACTED_STRONG_PASSWORD>'
supabase users create --email client@firm.com --password '<REDACTED_STRONG_PASSWORD>'
```

### Step 3: Run Seed Script

After auth users exist, run `seed.sql` in the SQL Editor:

1. Copy `seed.sql` contents
2. Paste in SQL Editor
3. Click "Run"

### Step 4: Verify Setup

Run this query to verify:
```sql
SELECT
  u.name as user_name,
  u.email,
  u.role,
  f.name as firm_name
FROM public.users u
LEFT JOIN public.firms f ON u.firm_id = f.id
WHERE u.email LIKE '%@caath.com' OR u.email LIKE '%@firm.com'
ORDER BY u.role;
```

Expected output:
| user_name | email | role | firm_name |
|-----------|-------|------|-----------|
| God Admin | godadmin@caath.com | GodAdmin | (null) |
| Super Admin | superadmin@firm.com | SuperAdmin | Demo Firm Ltd |
| Admin User | admin@firm.com | Admin | Demo Firm Ltd |
| Staff Member | staff@firm.com | Staff | Demo Firm Ltd |
| Client User | client@firm.com | Client | Demo Firm Ltd |

## Subscription Plans

The schema supports these subscription plans:

| Plan | Features |
|------|----------|
| Trial | 14-day trial, limited features |
| Starter | Up to 10 clients, basic features |
| Professional | Unlimited clients, all features |
| Enterprise | White-label, API access |

## Feature Flags

Features are stored in subscriptions.features JSONB:

```json
{
  "clients": true,
  "staff_unlimited": true,
  "documents": true,
  "compliance": true,
  "notices": true,
  "billing": true,
  "audit_logs": true,
  "automation": true,
  "api_access": false,
  "white_label": false
}
```

## Troubleshooting

### "relation does not exist" error
- Solution: Run schema.sql first in SQL Editor

### "auth_id not found" error  
- Solution: Create auth.users first via Dashboard or CLI before running seed.sql

### Subscription not working
- Check: `SELECT * FROM public.subscriptions WHERE firm_id = 'your-firm-id'`
- Verify status is 'Active' or 'Trial'

### Role permission issues
- Check: `SELECT current_user_role()` returns correct role
- Verify user has status = 'Active' in public.users
