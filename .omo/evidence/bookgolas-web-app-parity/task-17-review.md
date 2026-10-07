# Task 17 review

- Scope is limited to issue #430: My Library reading/review/record tabs, debounced title/author search, server cursor pagination, record detail entry, global Recall entry, translations, contract/negative checks and browser evidence.
- Native parity was checked against `app/lib/ui/my_library/widgets/my_library_screen.dart` and `app/lib/ui/recall/widgets/global_recall_search_sheet.dart`: three tabs, search fields, record type filters, grouped records, record detail navigation, recent global searches and Recall answer/source groups are represented.
- Reading and review requests use the existing authenticated product book DAL. Search is applied to title and author, review requests require review content, soft-deleted books remain excluded, and the server owns the pagination cursor.
- Reading records are a separate owner-scoped `reading_content_embeddings` collection. The Web surface groups records by book for presentation but never returns Recall history as book rows. Record detail opens a modal and links to the owner-scoped book route.
- Recall history is limited to rows with `book_id IS NULL`; Recall search is invoked without a caller-selected identity and the returned answer/sources stay in the Recall surface.
- `AbortController`, a monotonic request sequence and id-based page merging cover the native debounce/cancellation behavior. The exact cancellation browser scenario confirms a slow stale response cannot replace the latest search.
- The loopback fixture boundary provides deterministic loading, empty, unavailable, unauthorized, quota, consent, foreign-data and Recall scenarios. No fixture marker is rendered by the production route or component.
- `git diff --check`, typecheck, lint, focused library tests, the exact happy/failure Chromium commands, production build and clean-HEAD repository-wide `npm test` passed. The regression run covered 27 test files/208 tests, the parity matrix, 59 parity negative fixtures and the BLDS/UI contracts.

Plan: `.omo/plans/bookgolas-web-app-parity.md`
