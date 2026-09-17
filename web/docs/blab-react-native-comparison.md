# BLDS native-to-Web comparison

The Web consumer is pinned to BLDS commit `10a9016f58b30728f179f1c96b0ed738c40c271c` and the public React package `@byungsker/blab-design-system@0.2.0`. The machine-checkable source and comparison contract is in `web/docs/blab-react-parity-contract.json`.

| Native source | Web public export | Web evidence |
| --- | --- | --- |
| `lib/src/theme/app_colors.dart` and `app_typography.dart` | `BLabColors`, `BLabTypography`, CSS variables | `test:blab-parity`, light/dark screenshots |
| `lib/src/widgets/liquid_glass_button.dart` | `BLabButton` through `ConsumerButton` | focus, loading, reduced-motion, and theme assertions |
| `lib/src/widgets/liquid_glass_card.dart` | `BLabCard` through `ConsumerCard` | consumer notice/error and empty surfaces |
| `lib/src/widgets/liquid_glass_text_field.dart` | `BLabTextField` through `ConsumerTextField` | ko/en sign-in fields and accessible labels |
| `docs/design/REACT.md` state guidance | `BLabLoadingState`, `BLabEmptyState`, `BLabErrorState`, `BLabRetryButton` | SSR role contract and browser error/retry surface |
| `lib/src/widgets/custom_snackbar.dart` | `BLabSnackbar` through `ConsumerSnackbar` | status live region and dismiss action |
| `lib/src/widgets/custom_tab_bar.dart` and five-tab shell | `BLabTabBar`, `BLabSegmentedControl`, `BLabBottomBar` through consumer adapters | selected state, roving keyboard focus and responsive navigation showcase |
| native pressable surfaces | `BLabPressableWrapper` through `ConsumerPressable` | Enter/Space activation, press feedback and reduced motion |

The Web suite captures the consumer route at 390x844 and 1440x900 for ko/en and both BLDS color modes. `BlabThemeSync` follows the browser `prefers-color-scheme` value, so the light/dark cases exercise the real theme path. The native baseline is rendered headlessly from the pinned Flutter package at 390x844 and is stored beside the Web captures as `task-9-5-blab-native-reference-light.png` and `task-9-5-blab-native-reference-dark.png`. The reproducible source fixture is `web/docs/blab-native-reference-test.dart`; copy it into the pinned BLDS checkout and run the command recorded in the parity contract. A locked macOS session still prevents an interactive simulator capture, so the comparison uses the reproducible Flutter golden plus the Web interaction suite.

The shared consumer adapter is the only Web import boundary for these public BLDS exports. `/{locale}/ui-primitives` is an unlinked verification surface that exercises every shared adapter, all required state profiles, both locales, both contract viewports and reduced-motion keyboard behavior. The product header, book-card composition, route shells, and numeric progress input retain their existing product layout while later consumer issues migrate each screen. This boundary is recorded in `surface_policy`; #453 introduces no new semantic fork.

Native-only capabilities remain outside the Web adapter: iOS widgets, Siri/App Shortcuts, native push categories, camera/OCR, the native share sheet, and RevenueCat subscription billing.
