import type { Book } from "@/lib/product/contracts";
import {
  consentRequiredError,
  failure,
  notFoundError,
  offlineError,
  providerError,
  quotaExceededError,
  success,
  timeoutError,
  unauthorizedError,
  unavailableError,
  type ProductError,
  type ProductResult,
} from "@/lib/product/dal/errors";
import { getBookDetailFixture } from "./book-detail-fixtures";
import type { ReviewGenerateRequest, ReviewSaveRequest } from "@/lib/product/contracts";

type ReviewFixtureResult = Readonly<{
  book?: Book;
  duplicate: boolean;
}>;

const now = "2026-09-16T00:00:00.000Z";
const states = new Map<string, Book>();
const mutations = new Map<string, ReviewFixtureResult>();

function readErrorForFixture(fixture: string): ProductError | null {
  if (fixture === "review-share-unauthorized") return unauthorizedError();
  if (fixture === "review-share-foreign" || fixture === "review-share-deleted") return notFoundError();
  if (fixture === "review-share-offline") return offlineError("Review saving is offline.");
  if (fixture === "review-share-error") return unavailableError("Review data is temporarily unavailable.");
  return null;
}

function mutationErrorForFixture(fixture: string): ProductError | null {
  const readError = readErrorForFixture(fixture);
  if (readError) return readError;
  if (fixture === "review-share-consent") return consentRequiredError("AI review consent is required.");
  if (fixture === "review-share-quota") return quotaExceededError("The AI review quota has been reached.");
  if (fixture === "review-share-timeout") return timeoutError("The AI review timed out.");
  if (fixture === "review-share-provider") return providerError("The AI review provider is unavailable.");
  return null;
}

function stateKey(fixture: string, bookId: string): string {
  return `${fixture}:${bookId}`;
}

function getInitialBook(fixture: string, bookId: string): Book | null {
  const result = getBookDetailFixture({ fixture: "book-detail-reading", bookId });
  if (!result.ok) return null;
  if (fixture === "review-share-empty") {
    return {
      ...result.value,
      rating: null,
      review: null,
      reviewLink: null,
      longReview: null,
    };
  }
  return result.value;
}

function currentBook(fixture: string, bookId: string): Book | null {
  const key = stateKey(fixture, bookId);
  const current = states.get(key);
  if (current) return current;
  const initial = getInitialBook(fixture, bookId);
  if (initial) states.set(key, initial);
  return initial;
}

export function getReviewShareFixtureBook(
  fixture: string,
  bookId: string,
): ProductResult<Book> {
  const error = readErrorForFixture(fixture);
  if (error) return failure(error);
  const book = currentBook(fixture, bookId);
  return book ? success(book) : failure(notFoundError());
}

export function applyReviewShareFixtureSave(
  fixture: string,
  input: ReviewSaveRequest,
): ProductResult<ReviewFixtureResult> {
  const error = readErrorForFixture(fixture);
  if (error) return failure(error);
  const existing = currentBook(fixture, input.bookId);
  if (!existing) return failure(notFoundError());

  const key = stateKey(fixture, `${input.bookId}:${input.idempotencyKey}`);
  const previous = mutations.get(key);
  if (previous) return success({ ...previous, duplicate: true });

  const book = {
    ...existing,
    rating: input.rating,
    review: input.review,
    reviewLink: input.reviewLink,
    longReview: input.longReview,
    updatedAt: now,
  } satisfies Book;
  states.set(stateKey(fixture, input.bookId), book);
  const result = { book, duplicate: false } satisfies ReviewFixtureResult;
  mutations.set(key, result);
  return success(result);
}

export function applyReviewShareFixtureGenerate(
  fixture: string,
  input: ReviewGenerateRequest,
): ProductResult<{ draft: string; memosUsed: number }> {
  const error = mutationErrorForFixture(fixture);
  if (error) return failure(error);
  if (!input.aiConsent) return failure(consentRequiredError("AI review consent is required."));
  if (fixture === "review-share-empty") return success({ draft: "", memosUsed: 0 });
  return success({
    draft: "This book gave me a more deliberate way to think about reading. The notes I saved became a useful thread between the author's ideas and my own daily choices.",
    memosUsed: fixture === "review-share-no-memos" ? 0 : 3,
  });
}
