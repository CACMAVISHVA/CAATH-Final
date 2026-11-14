# Customer-owned AI connections

CAATH supplies the integration, not provider credits. The notice drafting endpoint accepts only the signed-in customer's Gemini key, model ID and explicit data-sharing confirmation. It has no platform-key fallback. Gemini is the initial supported provider; other providers are not yet implemented.

The key is kept in component memory, sent over HTTPS in the request body, and cleared after each request or on component unmount. It is not saved in local/session storage, the database, or application logs. Do not add request-body logging to this endpoint. Persistent firm-wide credentials would require a separate encrypted credential store and admin access controls.

Only saved notice facts are sent after authentication, tenant checks, subscription validation and attempt-rate limiting. PDFs are excluded. A generated suggestion is not saved or filed until the user reviews and saves it. Generation never files returns or replies.

Verification: injected provider tests and negative endpoint tests do not incur provider charges. A real generation test requires a customer's configured key and model; no successful paid-provider call is claimed. Apply the notice_ai_requests migration before enabling this release.
