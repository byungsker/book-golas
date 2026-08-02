# Mobile client configuration boundary

The mobile application accepts only public or client-restricted Dart define
values. A mobile binary must never receive server credentials, signing material,
provider access tokens, local environment files, or local operational overrides.

## Allowed Dart defines

- `ENVIRONMENT`
- `PAID_SUBSCRIPTIONS_ENABLED`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `GOOGLE_BOOKS_API_KEY`
- `REVENUECAT_PUBLIC_KEY`
- `GOOGLE_SERVER_CLIENT_ID`
- `ADMOB_BANNER_IOS`, `ADMOB_BANNER_ANDROID`
- `ADMOB_NATIVE_IOS`, `ADMOB_NATIVE_ANDROID`

The public keys above still require their provider-side restrictions. They are
not a substitute for a server-side secret or a quota boundary.

## Local verification

Run this before a local iOS build:

```bash
python3 app/tool/verify_mobile_client_config.py \
  --self-test \
  --source-root app \
  --workflow .github/workflows/ios-testflight.yml \
  --workflow .github/workflows/ios-production.yml
```

After a local build, scan the produced bundle:

```bash
python3 app/tool/verify_mobile_client_config.py \
  --artifact app/build/ios
```

The same checks run before and after the TestFlight and production iOS builds.
The build step also validates the injected client values without logging them,
including the Supabase URL and the legacy JWT `anon` role when present.
`--dart-define-from-file` is deliberately rejected because a local environment
file can contain server-only configuration.

## Server-only credentials and rotation

Server-only values stay in the approved deployment secret store and are read
only by the server runtime or signing/upload steps. If a credential may have
been exposed to a client build, an authorized operator must rotate it, update
only the server-side secret entry, and record a value-free smoke-test result.
Do not place the replacement value in `.env`, Dart defines, build logs, issue
notes, or this repository. Credential rotation and live server smoke tests
remain separate authority-bound actions.
