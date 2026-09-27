# Task 12 diff review

- Scope: GitHub issue #424 only. The diff adds Google and Apple OAuth initiation, the localized PKCE callback boundary, deterministic loopback fixtures, and evidence. It does not add Kakao, onboarding, shell, billing, or native-only capabilities.
- Redirect safety: both initiation and callback resolve `returnTo` through the existing protected consumer-route allowlist. External, cross-locale, traversal, admin, and protocol-relative values fall back to `/{locale}/home`.
- Error safety: provider descriptions, provider error codes, authorization codes, and thrown exchange details are replaced with one of three stable localized error keys. Callback responses are private and non-cacheable.
- Session boundary: the browser uses the existing public Supabase configuration and PKCE mode. The server callback exchanges the authorization code and copies Supabase session cookies into the redirect response.
- Regression review: existing email signup, password sign-in, recovery, resend, and sign-out tests pass. The production build still emits admin, legal, marketing, and consumer routes.
- Browser review: fresh Chromium captures show Google and Apple actions in the existing BLab auth card; Korean and English error copy is legible and wraps without clipping. Success captures show localized consumer-home destinations.
- Harness cleanup: the auth-boundary source checker now follows the already-existing `(consumer)` route group so the relevant regression command can run.

Verdict: APPROVE

Plan: .omo/plans/bookgolas-web-app-parity.md
