# Agent Host Compatibility Matrix

The matrix records the exact claim boundary for the 0.1.0 contract. A host is
`verified` only when discovery, install, first useful call, permission
behavior, and structured output have all been observed. No untested host is
implicitly supported.

| Host | Host version | Project version | Install/invocation | Discovery | First useful call | Status | Test date |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Codex CLI | 0.146.0 | 0.1.0 | `capabilities`; `library --page 1 --page-size 1` against local fixture | JSON manifest | One structured library item | verified | 2026-08-22 |
| Claude Code | not tested | 0.1.0 | `unsupported until a pinned host test` | not tested | not tested | not_tested | 2026-08-22 |
| OpenCode | not tested | 0.1.0 | `unsupported until a pinned host test` | not tested | not tested | not_tested | 2026-08-22 |
| OpenClaw | not tested | 0.1.0 | `unsupported until a pinned host test` | not tested | not tested | not_tested | 2026-08-22 |
| Hermes Agent | not tested | 0.1.0 | `unsupported until a pinned host test` | not tested | not tested | not_tested | 2026-08-22 |

The verified Codex row was executed with Codex CLI 0.146.0. Discovery returned
exit code 0 with `mode=read_only` and `contract_version=0.1.0`; the authenticated
CLI fixture returned exit code 0 with one item and `meta.contract_version=0.1.0`.
It is a local, read-only contract-fixture run and does not claim live Supabase
access, production readiness, or compatibility with other hosts. A future
release must record the exact API host, permission prompt behavior,
output-schema result, and uninstall or rollback path.
