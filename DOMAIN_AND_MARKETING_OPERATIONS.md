# CAATH Domain and Marketing Operations

## Current production status — 12 September 2026

- `caath.in` and `www.caath.in` are assigned to the CAATH production deployment.
- Supabase authentication and recovery URLs use `https://caath.in`.
- The apex HTTPS certificate is active and `https://caath.in` returns successfully.
- `www.caath.in` now uses the Vercel-required A record (`76.76.21.21`) and is awaiting normal DNS propagation.
- Keep `https://caath.vercel.app` as the stable fallback until both custom-domain HTTPS checks pass.

## Public addresses

- Primary website: `https://caath.in`
- Alternate address: `https://www.caath.in`
- Customer login: `https://caath.in/login`
- Protected workspace: `https://caath.in/app`
- Renewal entry: `https://caath.in/login?next=subscription`
- New-customer purchase entry: `https://caath.in/login?auth=signup`

## Website journeys

The public home page explains CAATH, its operational capabilities, security model, and subscription plans. Visitors can choose a plan, create a workspace, sign in, or enter the renewal journey. Authenticated customers are routed from login and renewal links to the appropriate protected workspace page.

## DNS ownership

The domain remains registered at BigRock and is attached to the Vercel project named `caath`.

- Apex `@`: A record to Vercel
- `www`: CNAME to the project-specific Vercel DNS target

Vercel manages the application deployment and HTTPS certificate. Do not purchase separate web hosting, Premium DNS, or SSL for this application unless the architecture is intentionally changed.

## Marketing usage

Use `https://caath.in` on advertisements, brochures, business cards, social profiles, product demonstrations, and search listings. Use the main domain rather than temporary Vercel preview links. Direct existing customers to `/login` and renewal communication to `/login?next=subscription`.

## Operational controls

- Verify plan descriptions and prices before every campaign.
- Publish privacy, terms, refund/cancellation, and support policies before accepting unrestricted public sales.
- Keep domain auto-renewal enabled and maintain current registrant contact information.
- Complete BigRock email verification and eKYC to prevent domain suspension.
- Test the home page, signup, login, renewal, and workspace routes after each production deployment.
- Never place passwords, OTPs, API keys, or client information in marketing links.
