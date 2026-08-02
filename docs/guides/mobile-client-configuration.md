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

`GOOGLE_SERVER_CLIENT_ID` is allowlisted but optional: an unset or empty value
is compiled as an empty Dart define and the app maps it to no server client ID.
The build boundary still requires `ENVIRONMENT`, `PAID_SUBSCRIPTIONS_ENABLED`,
`REVENUECAT_PUBLIC_KEY`, `SUPABASE_ANON_KEY`, and `SUPABASE_URL`; no server-only
value is permitted in either required or optional client input.

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
  --artifact app/ios/build/Runner.ipa
```

The CI build flow exports the signed IPA first, scans that exact IPA before the
upload lane receives its upload credentials, then uploads the same file. The
scanner reads compressed IPA members and checks server-only markers plus raw,
base64, URL-safe base64, and hex forms of the supplied server-only values,
including the production build-only App Store signing credential, without
writing those values to its output. The build step also validates the injected
client values without logging them, including the Supabase URL and the legacy
JWT `anon` role when present.

The IPA scan declares every supplied server-only value as either required or
optional. Required signing and build-guaranteed values must be nonblank and
are always scanned. Optional server-runtime values are scanned with the same
raw and encoded checks when configured, but an unset or blank optional value
adds no scan needle. A value cannot be declared in both classes.
`--dart-define-from-file` is deliberately rejected because a local environment
file can contain server-only configuration.

The source guard recognizes Dart-valid whitespace and comments around the
`String.fromEnvironment` member access, while continuing to reject non-literal
setting names. It accepts only one allowlisted string literal as the complete
argument expression; adjacent literals, including comment-separated forms, are
rejected. Formatting therefore cannot turn an indirect configuration lookup
into an allowed client setting.

The pull-request guard uses positive paths for the two iOS workflows and
`app/**`, which covers the Flutter library, the verification tool, Fastlane,
and mobile build configuration. Consequently, web-only and documentation-only
changes do not trigger it; GitHub Actions does not permit `paths` and
`paths-ignore` together for the same event.

## Server-only credentials and rotation

Server-only values stay in the approved deployment secret store and are read
only by the server runtime or signing/upload steps. If a credential may have
been exposed to a client build, an authorized operator must rotate it, update
only the server-side secret entry, and record a value-free smoke-test result.
Do not place the replacement value in `.env`, Dart defines, build logs, issue
notes, or this repository. Credential rotation and live server smoke tests
remain separate authority-bound actions.
