---
name: bookgolas-agent-surface
description: Read authenticated Bookgolas library and reading records through the versioned Agent API.
---

# Bookgolas Agent Surface

Use this skill when an agent needs bounded, user-scoped Bookgolas reading data
in a non-interactive workflow.

## Invocation

1. Confirm `BOOKGOLAS_API_URL` points to the intended Agent API origin.
2. Keep the Supabase user access token in `BOOKGOLAS_API_TOKEN`.
3. Discover capabilities:

```bash
node cli/bin/bookgolas.mjs capabilities
```

4. Use one bounded read command, for example:

```bash
node cli/bin/bookgolas.mjs library --page 1 --page-size 20
```

## Safety

The skill is read-only. Do not pass tokens as arguments, add `user_id` query
parameters, request an unbounded page, or infer zero from an unavailable
source. Writes, AI generation, subscription changes, and provider activation
are outside this skill.

## Output

Parse stdout as JSON. Keep stderr as diagnostics. Check `meta.api_version`,
`meta.contract_version`, `meta.request_id`, pagination, and the `usage` block.
Treat non-zero CLI exit codes as structured failure and follow `retryable`
before retrying.
