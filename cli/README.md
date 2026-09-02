# Bookgolas CLI

`bookgolas` is the CLI-first companion for the Bookgolas Agent API 0.1.0. It
is intentionally read-only and never imports a database client, Supabase SDK,
or provider credential.

## Install and run

```bash
cd cli
npm install
npm link
export BOOKGOLAS_API_URL=http://127.0.0.1:8787
export BOOKGOLAS_API_TOKEN="<Supabase user access token>"
bookgolas library --page 1 --page-size 20
```

The token is read only from `BOOKGOLAS_API_TOKEN`; do not put it in command
arguments, files committed to Git, or logs. `capabilities` does not require a
token. The API process must be started separately with the authenticated
Bookgolas Agent API configuration.

## Commands

| Command | Scope |
| --- | --- |
| `capabilities` | Discover the versioned manifest |
| `books search --query <text>` | Search the authenticated user's library |
| `library` | List the authenticated user's books |
| `progress [--book-id <id>]` | List the user's progress history |
| `recall [--book-id <id>]` | List stored Recall history |
| `insights` | List stored reading insights |

Pagination is explicit with `--page` and `--page-size`; the CLI never fetches
an unbounded collection. Every successful call writes one JSON response to
stdout. Diagnostics go to stderr.

## Exit codes

`0` success, `2` usage/configuration, `3` authentication, `4` forbidden or
write-disabled, `5` upstream failure, `6` timeout/cancellation, `7` rate
limited, and `8` unexpected failure. GET requests retry at most three total
attempts with bounded exponential backoff.
