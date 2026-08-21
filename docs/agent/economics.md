# Entitlement, Usage, and Cost Contract

## Shared account model

The CLI does not create a subscription or a second customer identity. The
`entitlement` capability reads the existing Bookgolas account state and uses
the same Pro entitlement identifier as the app:
`byungskerslab/북골라스 Pro`. Both app and CLI are attributed to the same
authenticated user account and the shared `shared_bookgolas_account` usage
pool.

The 0.1.0 implementation is contract-only for commercial activation. It does
not reactivate RevenueCat, change prices, grant Pro access, or write a new
usage ledger. BOK-407 remains the owner of the commercial quota, ledger, and
cost approval decisions.

## Engineering safety limits

| Rule | 0.1.0 contract |
| --- | --- |
| Request unit | Every capability call consumes one bounded read unit in response metadata |
| Per-user rate limit | 60 requests per minute per capability, local process safety cap |
| Page limit | 100 records per request |
| Provider generation | 0 calls; Recall and Insights only read stored records |
| Monthly commercial budget | Not activated; BOK-407 must define and approve it before public access |
| Attribution | Authenticated user account, never a separate CLI identity |

The local in-memory rate limiter is not a production ledger. A deployed API
must replace it with the approved shared usage ledger before public exposure,
preserving the same user scope and fail-closed behavior when quota state is
unavailable. A quota error is structured and retryable only when the response
explicitly says so.
