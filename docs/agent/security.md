# Agent Surface Security Boundary

- User access tokens are accepted only through the Authorization header.
- Service-role keys, provider keys, and RevenueCat credentials never enter the
  CLI contract or command arguments.
- User scope comes from verified token identity; arbitrary `user_id` values are
  rejected before data access.
- Supabase REST is called with the user token so RLS remains active.
- Responses use allowlisted fields and never expose auth headers or provider
  credentials.
- GET-only commands, bounded pagination, timeout, retry, and rate limiting
  prevent unbounded work.
- Writes are disabled. Any future mutation needs dry-run, explicit approval,
  idempotency, and postcondition evidence.
- No live provider, production database, or subscription mutation is part of
  the local contract verification.
