# Reading Progress Contract

For Web consumers, `public.update_reading_progress` is the authenticated atomic write boundary for a page update. It accepts a book ID, the requested current page, the caller's expected current page, an idempotency key, and an optional reading duration. It derives the user from `auth.uid()` and never accepts a caller-selected user ID.

The migration maps legacy `abandoned`, `paused`, `dropped`, and `on_hold` values to `will_retry`; `finished`, `complete`, and `done` to `completed`; `not_started` and `queued` to `planned`; and `in_progress` and `active` to `reading`. Any other non-canonical value aborts the migration with the value listed in the error.

A successful request locks the active book, verifies the expected page, updates `books.current_page`, updates the status to `completed` when a positive `total_pages` boundary is reached, and records positive progress history in one transaction. A backward page edit updates the book without appending a positive history event. The canonical statuses are `planned`, `reading`, `completed`, and `will_retry`.

A stale expected page returns the typed `progress_conflict` error with SQLSTATE `P0001` and rolls back the request. Reusing an idempotency key with the same request returns the stored result and history ID. Reusing it with different request values returns `idempotency_conflict`. Reading duration is bounded to 0 through 28,800 seconds; the native timer keeps its existing 30-second minimum before saving a session and its 8-hour maximum.

The current completion-day behavior is derived from `books.updated_at` when the status becomes `completed`. The schema does not introduce a separate completion event or `completed_at` field. A future completion event requires a separately approved contract and migration before completion-day semantics change.

`books` reads exclude soft-deleted rows. `book_images`, `reading_progress_history`, and `reading_sessions` policies require both the authenticated row owner and an active parent book owned by that user. The idempotency ledger is writable only through the security-definer RPC. Existing native `BookService` direct book and positive-history inserts remain RLS-protected for backward compatibility; history updates and deletes are not granted to authenticated callers. The Web RPC is the path that provides the atomic and idempotent progress contract.
