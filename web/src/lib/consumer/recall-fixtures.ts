import type {
  RecallDeleteHistoryResponse,
  RecallHistoryPage,
  RecallScope,
  RecallSearchResponse,
  RecallSourceImageResponse,
  BookId,
  RecordId,
} from "@/lib/product/contracts";
import type { RecallSearchHistory, RecallSearchResult, RecallSource } from "@/lib/product/contracts";
import {
  failure,
  notFoundError,
  offlineError,
  providerError,
  quotaExceededError,
  consentRequiredError,
  unauthorizedError,
  success,
  type ProductError,
  type ProductResult,
} from "@/lib/product/dal/errors";

export const recallFixtureUserId = "00000000-0000-4000-8000-000000000001";
export const recallFixtureBookId = "00000000-0000-4000-8000-000000004301" as BookId;
export const recallFixtureSecondBookId = "00000000-0000-4000-8000-000000004302" as BookId;
const recallFixtureHighlightId = "00000000-0000-4000-8000-000000004321" as RecordId;
const recallFixtureNoteId = "00000000-0000-4000-8000-000000004322" as RecordId;
export const recallFixturePhotoId = "00000000-0000-4000-8000-000000004323" as RecordId;
export const recallFixtureHistoryId = "00000000-0000-4000-8000-000000004331" as RecordId;
export const recallFixtureSecondHistoryId = "00000000-0000-4000-8000-000000004332" as RecordId;

const createdAt = "2026-09-16T00:00:00.000Z";

const atlasHighlight: RecallSource = {
  type: "highlight",
  content: "A useful idea about attention.",
  pageNumber: 12,
  sourceId: recallFixtureHighlightId,
  createdAt,
  bookId: recallFixtureBookId,
  bookTitle: "The Reading Atlas",
};

const atlasNote: RecallSource = {
  type: "note",
  content: "Try this during the next reading session.",
  pageNumber: 18,
  sourceId: recallFixtureNoteId,
  createdAt: "2026-09-15T00:00:00.000Z",
  bookId: recallFixtureBookId,
  bookTitle: "The Reading Atlas",
};

const quietPhoto: RecallSource = {
  type: "photo_ocr",
  content: "The margin turns a question into a practice.",
  pageNumber: 44,
  sourceId: recallFixturePhotoId,
  createdAt: "2026-09-14T00:00:00.000Z",
  bookId: recallFixtureSecondBookId,
  bookTitle: "The Quiet Shelf",
};

const history: RecallSearchHistory[] = [
  {
    id: recallFixtureHistoryId,
    query: "attention",
    answer: "Your records connect attention with a deliberate reading pace.",
    sources: [atlasHighlight, atlasNote],
    createdAt: "2026-09-15T12:00:00.000Z",
  },
  {
    id: recallFixtureSecondHistoryId,
    query: "practice",
    answer: "You saved a practice cue in The Quiet Shelf.",
    sources: [quietPhoto],
    createdAt: "2026-09-14T12:00:00.000Z",
  },
];

const globalResult: RecallSearchResult = {
  answer: "Your records connect attention with a deliberate reading pace.",
  sources: [atlasHighlight, atlasNote, quietPhoto],
  sourcesByBook: {
    [recallFixtureBookId]: [atlasHighlight, atlasNote],
    [recallFixtureSecondBookId]: [quietPhoto],
  },
};

const bookResult: RecallSearchResult = {
  answer: "The Reading Atlas frames attention as a practice you can repeat.",
  sources: [atlasHighlight, atlasNote],
  sourcesByBook: { [recallFixtureBookId]: [atlasHighlight, atlasNote] },
};

function fixtureError(fixture: string): ProductError | null {
  if (fixture === "recall-unauthorized" || fixture === "library-unauthorized") return unauthorizedError();
  if (fixture === "recall-consent" || fixture === "library-consent") return consentRequiredError("Recall consent is required before searching.");
  if (fixture === "recall-quota" || fixture === "library-quota") return quotaExceededError("Recall quota has been reached.");
  if (fixture === "recall-provider") return providerError("Recall provider is unavailable.");
  if (fixture === "recall-offline" || fixture === "library-network" || fixture === "library-error") return offlineError("Recall is offline.");
  return null;
}

function pageInfo(items: number, cursor: string | null, limit: number) {
  const offset = cursor ? Math.max(0, Number.parseInt(cursor, 10) || 0) : 0;
  return {
    items: items,
    offset,
    nextCursor: offset + limit < items ? String(offset + limit) : null,
    hasMore: offset + limit < items,
  };
}

function scopedHistory(fixture: string, scope: RecallScope, bookId: string | null): RecallSearchHistory[] {
  if (fixture === "recall-empty" || fixture === "library-recall-empty") return [];
  if (scope === "book" && bookId !== recallFixtureBookId) return [];
  if (fixture === "library-recall") return [history[0]];
  return scope === "book" ? [history[0]] : history;
}

export function getRecallFixtureHistory(input: {
  fixture: string;
  scope: RecallScope;
  bookId: BookId | null;
  cursor: string | null;
  limit: number;
}): ProductResult<RecallHistoryPage> {
  const error = fixtureError(input.fixture);
  if (error?.code === "unauthorized") return failure(error);
  const items = scopedHistory(input.fixture, input.scope, input.bookId);
  const pagination = pageInfo(items.length, input.cursor, input.limit);
  const visible = items.slice(pagination.offset, pagination.offset + input.limit);
  const suggestions = [...new Set(items.map((item) => item.query))].slice(0, 8);
  return success({
    kind: "history",
    scope: input.scope,
    bookId: input.bookId,
    history: visible,
    suggestions,
    pageInfo: { nextCursor: pagination.nextCursor, hasMore: pagination.hasMore },
  });
}

export function getRecallFixtureSearch(input: {
  fixture: string;
  scope: RecallScope;
  bookId: BookId | null;
}): ProductResult<RecallSearchResponse> {
  const error = fixtureError(input.fixture);
  if (error) return failure(error);
  const result = input.scope === "book"
    ? bookResult
    : input.fixture === "recall-empty" || input.fixture === "library-recall-empty"
      ? { answer: "", sources: [] }
      : input.fixture === "library-recall"
        ? { answer: globalResult.answer, sources: [atlasHighlight], sourcesByBook: { [recallFixtureBookId]: [atlasHighlight] } }
        : globalResult;
  return success({ kind: "search", scope: input.scope, bookId: input.bookId, result });
}

export function getRecallFixtureDelete(historyId: string): ProductResult<RecallDeleteHistoryResponse> {
  return success({ kind: "deleted", historyId: historyId as RecallDeleteHistoryResponse["historyId"], deleted: true });
}

export function getRecallFixtureSourceImage(input: {
  fixture: string;
  bookId: string;
  sourceId: string;
}): ProductResult<RecallSourceImageResponse> {
  if (input.fixture === "recall-foreign") return failure(notFoundError());
  if (input.fixture !== "recall-image") return failure(notFoundError());
  if (input.bookId !== recallFixtureSecondBookId || input.sourceId !== recallFixturePhotoId) return failure(notFoundError());
  return success({
    kind: "source_image",
    sourceId: input.sourceId as RecallSourceImageResponse["sourceId"],
    bookId: input.bookId as RecallSourceImageResponse["bookId"],
    signedUrl: "https://127.0.0.1/storage/v1/object/sign/book-images/fixture-photo?token=recall",
    expiresAt: "2026-09-16T01:00:00.000Z",
  });
}

export function getRecallFixtureForbiddenMarkers() {
  return ["Foreign private title", "User A recall history", "foreign-user-id", "embedding", "raw prompt"];
}
