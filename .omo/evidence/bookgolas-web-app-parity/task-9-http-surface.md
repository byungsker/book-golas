# BOK-421 browser surface verification

Revision: `8ebde66`

The final browser run used Playwright's production web server (`npm run build` followed by `next start`) on a credential-free loopback URL. The route returned a live BLDS-backed DOM and no development-only React Scan or React Grab strings were present in the production HTML. The temporary server was stopped after the request.

| Surface | Result |
| --- | --- |
| `GET /ko/ui-primitives` | HTTP 200 |
| `GET /en/ui-primitives` | Covered by the 9-test Chromium matrix |
| 390px mobile width | No document horizontal overflow in ko/en light/dark |
| 1440px desktop width | No document horizontal overflow in ko/en light/dark |
| BLDS light/dark attribute | `data-blab-theme` matched the emulated color scheme |
| Production dev-tool leak scan | No `react-grab` or `react-scan` match |

The screenshot set includes all four locale/viewport combinations in both themes and the issue-required overview path:

- `.omo/evidence/bookgolas-web-app-parity/task-9-bookgolas-web-app-parity.png` — Korean mobile dark overview
- `.omo/evidence/bookgolas-web-app-parity/task-9-ui-primitives-{ko,en}-{mobile,desktop}-{dark,light}.png` — complete theme/locale/viewport matrix

The browser assertions also covered state roles, loading `aria-busy` and disabled behavior, accessible names, invalid/described fields, Enter/Space activation, arrow-key navigation, retry feedback, snackbar dismissal, and reduced-motion context.
