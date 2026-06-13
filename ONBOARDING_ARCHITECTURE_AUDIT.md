# CAATH Onboarding Architecture Audit

## Audit Result

The Create Account message is intended behavior, but the public Profile Type dropdown is misleading.

The current implementation intentionally restricts anonymous self-service signup to Client accounts only. Selecting SuperAdmin, Admin, or Staff from the public Create Account page does not grant those roles. Those roles must be provisioned through controlled internal flows and Supabase admin tooling.

## Source Of Truth

| Area | Implementation | Finding |
| --- | --- | --- |
| Public Create Account UI | `src/App.tsx` login screen and `src/pages/AuthPage.tsx` | Shows `ONBOARDING_ROLES`, including SuperAdmin, Admin, Staff, Client |
| Signup policy | `src/services/accountOnboardingService.ts` | Anonymous actor can create only Client |
| Profile resolution | `src/domains/auth/services/authService.ts` | Existing profiles are trusted; new metadata profiles are safely reduced to Client or Staff |
| Profile persistence | `src/domains/auth/repositories/SupabaseAuthProfileRepository.ts` | Inserts into `public.users` after Supabase Auth session exists |
| Firm provisioning | `src/services/firmProvisioningService.ts` | GodAdmin creates firm package; GodAdmin or SuperAdmin activates CAATH user profile |
| Internal provisioning UI | `src/components/god-admin/FirmProvisioningPanel.tsx` | Exposed from GodAdmin dashboard `provisioning` tab |
| Seeded pilot accounts | `supabase/seed.sql`, `supabase/README.md` | Auth users must be created first, then seed maps roles |

## Intended Flow

### Public Self-Service Signup

The public Create Account page calls `createAccountWithRole` with `actor: null`.

`accountOnboardingService` applies this rule:

| Actor | Allowed Target Roles |
| --- | --- |
| Anonymous / public signup | Client only |
| SuperAdmin | Admin, Staff, Client |
| Admin | Staff, Client |
| GodAdmin | Not supported by this helper |
| Staff / Client | None |

If an anonymous user selects SuperAdmin, Admin, or Staff, the service throws:

`Self-service onboarding is restricted to Client accounts.`

That means the restriction is intentional.

### Privileged Account Provisioning

Privileged CAATH users are not created fully from the public browser signup. The secure pattern is:

1. Create the Supabase Auth user through Supabase Dashboard or CLI.
2. Activate the CAATH profile in `public.users` through the internal Role Activation flow.
3. Assign the role and firm ID during activation.

This is documented in the UI itself inside the Firm Provisioning panel:

`CAATH does not create privileged Supabase Auth users from the browser.`

## Answers To Verification Questions

### 1. Which roles can be created through the public Create Account page?

Only Client accounts are allowed through public self-service signup.

Important operational note: the database schema requires all non-GodAdmin users, including Client users, to have a `firm_id`. The UI label says the Firm ID is optional for client onboarding, but the schema requires it when the CAATH profile is created. In practice, pilot Client signup should include a valid firm ID.

### 2. Which roles are blocked from self-service signup?

SuperAdmin, Admin, Staff, and GodAdmin are blocked from anonymous self-service signup.

GodAdmin is not included in the public dropdown. SuperAdmin, Admin, and Staff appear in the dropdown but are rejected by policy.

### 3. Where and how is the first SuperAdmin created?

There are two supported paths:

1. Seeded pilot/demo setup:
   - Create `superadmin@firm.com` in Supabase Authentication.
   - Run `supabase/seed.sql`.
   - The seed maps that auth user to `public.users.role = 'SuperAdmin'` and links it to Demo Firm Ltd.

2. Internal provisioning setup:
   - Login as GodAdmin.
   - Open Platform Control Tower -> Provisioning.
   - Create a firm package.
   - Create the Supabase Auth user externally through Dashboard or CLI.
   - Paste the auth user ID into Role Activation.
   - Activate the user as `SuperAdmin`.

The current firm provisioning package labels the initial firm user as "Initial Admin", but the activation role is `SuperAdmin`. Functionally, this is the firm owner / top firm administrator.

### 4. Where and how is the first Firm Admin created?

If "Firm Admin" means the first firm owner, the current implementation creates that user as `SuperAdmin`, not `Admin`.

A role `Admin` account is created after the firm exists:

1. Create the Admin identity in Supabase Authentication.
2. Use Role Activation with the firm's ID, the auth user ID, name, email, and role `Admin`.
3. Activation inserts the CAATH profile into `public.users`.

The activation function permits GodAdmin and SuperAdmin to activate users. In practice, GodAdmin can do it from the GodAdmin provisioning page. A SuperAdmin-permission activation service exists, but there is no confirmed production firm-admin UI equivalent in the audited screens.

### 5. How are Staff accounts provisioned?

Production-grade Staff provisioning follows the same secure pattern:

1. Create the Staff Supabase Auth user through Dashboard or CLI.
2. Activate a `public.users` profile with role `Staff` and the correct `firm_id`.

The visible Staff Management screen is not the real account provisioning path. It uses local mock staff data and simulates adding staff in component state. It does not create Supabase Auth users or persistent `public.users` rows.

### 6. Is the Profile Type dropdown misleading because non-Client roles are intentionally disabled?

Yes. The dropdown is misleading in public signup because it offers SuperAdmin, Admin, and Staff even though anonymous signup rejects those choices.

The policy is correct; the UI affordance is the problem.

### 7. Should the UI automatically lock the dropdown to Client for public signup?

Yes. For public signup, the UI should either:

- lock the Profile Type to Client, or
- remove the dropdown entirely and show "Client account" as fixed text.

For pilot stability, the lowest-friction option is to remove selectable privileged roles from public signup.

### 8. Is there a hidden or internal Firm Provisioning page for Admin/Staff creation?

Yes. There is an internal GodAdmin provisioning surface:

- GodAdmin dashboard tab: `provisioning`
- Component: `src/components/god-admin/FirmProvisioningPanel.tsx`
- Service: `src/services/firmProvisioningService.ts`

It creates firm/subscription shells and activates CAATH user profiles after the Supabase Auth user is created externally.

### 9. Are there seeded development or pilot accounts already available?

The repository defines seeded pilot/demo accounts, but they are not automatically available until Supabase Auth users are created and the seed script is run.

Seeded identities:

| Email | Role | Firm |
| --- | --- | --- |
| `godadmin@caath.com` | GodAdmin | None |
| `superadmin@firm.com` | SuperAdmin | Demo Firm Ltd |
| `admin@firm.com` | Admin | Demo Firm Ltd |
| `staff@firm.com` | Staff | Demo Firm Ltd |
| `client@firm.com` | Client | Demo Firm Ltd |

Client-side development seeding is disabled in `src/services/devSeedService.ts`, and the login screen currently has an empty `devUsers` list.

## UI Bug Classification

| Observation | Classification | Reason |
| --- | --- | --- |
| Message remains after selecting Admin or SuperAdmin | Intended policy | Public self-service only allows Client |
| Dropdown allows selecting SuperAdmin/Admin/Staff | UI bug / misleading affordance | User can select options that are guaranteed to fail |
| Firm ID says optional for Client onboarding | Likely UI copy bug | Database requires `firm_id` for Client profile creation |

