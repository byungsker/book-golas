# BOK-421 CodeRabbit RED proof

Verified against unchanged revision `51b21d3` before production edits.

## Invocation

```sh
cd /private/tmp/bookgolas-web-421/web
npm run build
npm run start -- --hostname 127.0.0.1 --port 3100
node /tmp/bookgolas-web-421-red-proof.cjs
```

The proof uses TypeScript AST assertions to inspect `BoundaryState` and the named Chromium keyboard/snackbar scenario, then uses Playwright Chromium against `/en/ui-primitives` to click every boundary action and compare each rendered state before and after its click. It exits `1` when the requested outcomes are absent; this is not a string-presence check.

## Captured failure (exit 1)

```text
BoundaryState ConsumerButton has no onClick outcome handler
Chromium snackbar scenario never locates the error-state retry control, so retry feedback is not invoked
unauthorized-state action left its rendered boundary state unchanged
consent-state action left its rendered boundary state unchanged
quota-state action left its rendered boundary state unchanged
offline-state action left its rendered boundary state unchanged
```

## Browser action output

| State | Before/after changed |
| --- | --- |
| `unauthorized-state` | `false` |
| `consent-state` | `false` |
| `quota-state` | `false` |
| `offline-state` | `false` |

The unchanged browser text remained the same for all four clicks, including each original localized title, message, and action label. The AST assertion independently found that the existing named snackbar scenario only dismisses `snackbar`; it does not locate `error-state`, click its localized retry control, or assert `retry-feedback`.
