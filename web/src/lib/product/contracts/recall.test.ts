import { describe, expect, it } from "vitest";
import {
  RecallDeleteHistoryRequestSchema,
  RecallHistoryPageSchema,
  RecallSearchApiRequestSchema,
  RecallSearchResponseSchema,
  RecallSourceImageResponseSchema,
  RecallUiStateSchema,
} from "./recall";

const bookId = "00000000-0000-4000-8000-000000004301";
const recordId = "00000000-0000-4000-8000-000000004331";
const date = "2026-09-16T00:00:00.000Z";

describe("Recall contracts", () => {
  it("keeps global and book searches typed without caller ownership", () => {
    const request = RecallSearchApiRequestSchema.parse({
      action: "search",
      locale: "ko",
      query: "attention",
      bookId,
      pagination: { limit: 10 },
    });
    expect(request.bookId).toBe(bookId);
    expect(() => RecallSearchApiRequestSchema.parse({ ...request, user_id: "foreign" })).toThrow();
  });

  it("requires strict history, result and signed image shapes", () => {
    expect(RecallHistoryPageSchema.parse({
      kind: "history",
      scope: "global",
      bookId: null,
      history: [],
      suggestions: ["attention"],
      pageInfo: { nextCursor: null, hasMore: false },
    }).pageInfo.hasMore).toBe(false);
    expect(RecallSearchResponseSchema.parse({ kind: "search", scope: "book", bookId, result: { answer: "Answer", sources: [] } }).scope).toBe("book");
    expect(RecallSourceImageResponseSchema.parse({ kind: "source_image", sourceId: recordId, bookId, signedUrl: "https://storage.example.invalid/signed", expiresAt: date }).signedUrl).toContain("signed");
    expect(() => RecallDeleteHistoryRequestSchema.parse({ action: "delete_history", locale: "en", historyId: recordId, user_id: "foreign" })).toThrow();
  });

  it("enumerates distinct consumer states", () => {
    expect(RecallUiStateSchema.options).toEqual(expect.arrayContaining(["idle", "loading", "empty", "unauthorized", "consent_required", "quota_exceeded", "provider_error", "offline", "error"]));
  });
});
