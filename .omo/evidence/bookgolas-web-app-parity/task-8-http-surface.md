# BOK-420 HTTP surface verification

Revision: efec48c

The production server was started from the built Web app on `127.0.0.1:3105` with synthetic local test values and an unreachable loopback Supabase endpoint. No credentials or auth headers were recorded. The server was stopped after the requests completed.

| Request | Observed response |
| --- | --- |
| `POST /api/app/books/search` with `user_id` in the JSON body | `400`, `error.code=validation_error`, before the adapter was invoked |
| `POST /api/app/books/search` with an empty query | `400`, `error.code=validation_error` |
| `POST /api/app/books/search` with a valid Korean query and no reachable Supabase session | `503`, `error.code=unavailable`, no book data |

The response envelopes preserved the Todo 2 `{ error: { code, status, message, retryable } }` contract in each failure case.
