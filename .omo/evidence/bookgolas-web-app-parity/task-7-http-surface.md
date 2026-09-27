# BOK-419 HTTP surface verification

Revision: 452aa248866ec67bb6c687105883806a00ddd683

The production server was started from the built Web app on 127.0.0.1:3104 with an unreachable loopback Supabase endpoint and synthetic local test values. No credentials or auth headers were recorded.

| Request | Observed response |
| --- | --- |
| GET /api/app/books | 503, error.code=unavailable, no book data |
| GET /api/app/books/not-a-book-id | 404, error.code=not_found, before data access |
| PATCH /api/app/books/not-a-book-id with a valid title body | 404, error.code=not_found, before body/DAL processing |
| GET /api/app/books/30000000-0000-4000-8000-000000000003 | 503, error.code=unavailable, no book data |
| POST /api/app/books with user_id in JSON | 400, error.code=validation_error, DAL not invoked |

The server was stopped after the requests completed.
