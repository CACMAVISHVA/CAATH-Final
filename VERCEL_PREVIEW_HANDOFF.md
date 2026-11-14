# CAATH Vercel Preview Handoff

The CAATH production bundle and Vercel routing configuration are ready for a preview deployment.

## Completed automatically

- Production TypeScript and Vite build validation.
- Single-page application fallback for direct browser links.
- Defensive browser headers.
- Long-lived immutable caching for fingerprinted static assets.
- Deployment exclusions for backups, private environment files, local fixtures, and generated output.
- Live Supabase client-contact isolation policy verification.

## Preview deployment completed

- Existing project: `vishvas-projects-cd8ae784/caath`
- Target: Preview
- Status: READY
- Preview URL: `https://caath-3omc8dh8p-vishvas-projects-cd8ae784.vercel.app`
- Deployment ID: `dpl_2JEPL36SK9xEvJw421uC3ekNaVov`
- Government Portal Login Desk hosted checks passed for Super Admin and Staff, including assigned-client isolation, portal switching, identifier readiness, and launch to the official MCA site.
- Corrected acceptance preview: `https://caath-3u20p2bo5-vishvas-projects-cd8ae784.vercel.app` (`dpl_4CdyGPUNBZBjksJxbxzb4CcRiytK`, READY)
- Final role-isolation preview: `https://caath-idcd0n3di-vishvas-projects-cd8ae784.vercel.app` (`dpl_G5odafuhyBSbTNV18xUU4RpRGUUH`, READY)
- Document lifecycle preview: `https://caath-cikwywxxl-vishvas-projects-cd8ae784.vercel.app` (`dpl_2K9cti6oAjQuEqkzPUVBjbEszudc`, READY)
- Release-hardening preview: `https://caath-pfshtthpm-vishvas-projects-cd8ae784.vercel.app` (`dpl_gDSUXzZ6Jqmifg2Vvz7ajgBo2mCf`, READY). Forced logout, fresh document lifecycle, persisted GST validation proof, and second-firm client/document/GST isolation are verified.
- Final security preview: `https://caath-3omc8dh8p-vishvas-projects-cd8ae784.vercel.app` (`dpl_2JEPL36SK9xEvJw421uC3ekNaVov`, READY). Expanded two-way tenant isolation, Audit Center integrity, recovery-screen rendering, and authenticated display of all 21 permitted CAATH audit events are verified.
- Deployment protection: enabled

The Preview environment now contains `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as browser-visible Vite configuration values. No service-role or privileged database key was added.

Hosted checks passed for the root document, `/settings/subscription` fallback, compiled application chunks, Supabase project configuration, defensive response headers, five-role sign-in/navigation isolation, Staff least-privilege client access, and Client private-context resolution. Do not promote this preview to production or attach `caath.in` until the remaining release gates and owner testing pass.
