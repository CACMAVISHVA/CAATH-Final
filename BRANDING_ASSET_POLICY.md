# CAATH Branding Asset Policy

CAATH branding assets are protected resources. Do not replace the login, dashboard, sidebar, favicon, PWA, or social preview assets unless the change request explicitly asks for a branding update.

## Source Of Truth

- `public/branding/caath-master-logo.png` is the master CAATH logo asset.
- Derived browser, PWA, and social assets must be generated from the master logo.
- The master logo should not be edited in place. Create a new approved master asset before regenerating derivatives.

## Asset Separation

- `public/branding/login-logo.png` is used for application UI branding.
- `public/branding/favicon.ico` and `public/branding/favicon-*.png` are used only for browser favicon metadata.
- Favicon updates must never overwrite the login logo.
- Login, dashboard, and sidebar logo updates must never overwrite favicon or PWA icons.

## Central Configuration

Brand references used by the React app live in `src/shared/config/branding.ts`. Add new app-level branding references there before using them across UI surfaces.

Static browser metadata is declared in `index.html`, and PWA metadata is declared in `public/manifest.json`. Keep those files pointed at `public/branding/*` assets.

## Required Checks

Before shipping branding changes, verify:

- Login, dashboard, and sidebar branding still use the original CAATH gold square logo.
- Browser title is `CAATH – Secure Practice OS`.
- Browser favicon, Apple touch icon, PWA icons, and social preview image load from `public/branding/*`.
- `npm run build` succeeds.
