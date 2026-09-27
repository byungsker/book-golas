import type { ConsumerBook } from "./types";
import {
  BookSchema,
  type Book,
  type BookLifecycleCreateRequest,
  type BookLifecycleUpdateRequest,
  normalizeIsoDate,
} from "@/lib/product/contracts";
import {
  conflictError,
  consentRequiredError,
  failure,
  notFoundError,
  offlineError,
  quotaExceededError,
  unauthorizedError,
  unavailableError,
  validationError,
  type ProductError,
  type ProductResult,
} from "@/lib/product/dal/errors";

const fixtureBook = BookSchema.parse({
  id: "00000000-0000-4000-8000-000000004311",
  title: "The Reading Atlas",
  author: "Mina Park",
  startDate: "2026-09-16T00:00:00.000Z",
  targetDate: "2026-09-30T00:00:00.000Z",
  imageUrl: null,
  currentPage: 0,
  totalPages: 240,
  status: "reading",
  attemptCount: 1,
  dailyTargetPages: 18,
  priority: 2,
  pausedAt: null,
  plannedStartDate: null,
  deletedAt: null,
  genre: "essay",
  publisher: "Bookgolas Press",
  isbn: "9780306406157",
  rating: null,
  review: null,
  reviewLink: null,
  aladinUrl: "https://www.aladin.co.kr/shop/wproduct.aspx?ItemId=4281",
  longReview: null,
  price: 18000,
  createdAt: "2026-09-16T00:00:00.000Z",
  updatedAt: "2026-09-16T00:00:00.000Z",
});

const errors: Record<string, ProductError> = {
  "book-lifecycle-unauthorized": unauthorizedError(),
  "book-lifecycle-consent": consentRequiredError("Book saving consent is required."),
  "book-lifecycle-quota": quotaExceededError("You have reached the book saving limit."),
  "book-lifecycle-offline": offlineError("Book saving is offline."),
  "book-lifecycle-conflict": conflictError(),
  "book-lifecycle-duplicate": conflictError("This book is already being saved. Retry when the previous save is settled."),
  "book-lifecycle-error": unavailableError("Book saving is temporarily unavailable."),
};

function fromCreateRequest(request: BookLifecycleCreateRequest["book"]): Book {
  return BookSchema.parse({
    ...fixtureBook,
    title: request.title,
    author: request.author,
    startDate: normalizeIsoDate(request.startDate),
    targetDate: normalizeIsoDate(request.targetDate),
    plannedStartDate: request.plannedStartDate ? normalizeIsoDate(request.plannedStartDate) : null,
    totalPages: request.totalPages,
    status: request.status,
    imageUrl: request.imageUrl,
    dailyTargetPages: request.dailyTargetPages,
    priority: request.priority,
    genre: request.genre,
    publisher: request.publisher,
    isbn: request.isbn,
    aladinUrl: request.aladinUrl,
    price: request.price,
  });
}

function fromUpdateRequest(request: BookLifecycleUpdateRequest["book"]): Book {
  const plannedStartDate = request.plannedStartDate === undefined
    ? fixtureBook.plannedStartDate
    : request.plannedStartDate
      ? normalizeIsoDate(request.plannedStartDate)
      : null;
  return BookSchema.parse({
    ...fixtureBook,
    title: request.title ?? fixtureBook.title,
    author: request.author === undefined ? fixtureBook.author : request.author,
    startDate: request.startDate ? normalizeIsoDate(request.startDate) : fixtureBook.startDate,
    targetDate: request.targetDate ? normalizeIsoDate(request.targetDate) : fixtureBook.targetDate,
    plannedStartDate: request.status === "reading" && request.plannedStartDate === undefined
      ? null
      : plannedStartDate,
    status: request.status ?? fixtureBook.status,
    dailyTargetPages: request.dailyTargetPages === undefined ? fixtureBook.dailyTargetPages : request.dailyTargetPages,
    priority: request.priority === undefined ? fixtureBook.priority : request.priority,
    review: request.review === undefined ? fixtureBook.review : request.review,
    updatedAt: "2026-09-16T00:05:00.000Z",
  });
}

export async function getBookLifecycleFixture(input: {
  fixture: string;
  action: "create" | "update";
  book: BookLifecycleCreateRequest["book"] | BookLifecycleUpdateRequest["book"];
}): Promise<ProductResult<Book>> {
  const fixtureError = errors[input.fixture];
  if (fixtureError) return failure(fixtureError);
  if (input.fixture === "book-lifecycle-foreign" && input.action === "update") {
    return failure(notFoundError());
  }
  if (input.fixture === "book-lifecycle-invalid") {
    return failure(validationError("The lifecycle fields are invalid."));
  }

  return input.action === "create"
    ? { ok: true, value: fromCreateRequest(input.book as BookLifecycleCreateRequest["book"]) }
    : { ok: true, value: fromUpdateRequest(input.book as BookLifecycleUpdateRequest["book"]) };
}

export function getBookLifecycleFixtureBook(): Book {
  return fixtureBook;
}

export function getBookLifecycleFixtureConsumerBook(): ConsumerBook {
  return {
    id: fixtureBook.id,
    title: fixtureBook.title,
    author: fixtureBook.author,
    startDate: fixtureBook.startDate,
    targetDate: fixtureBook.targetDate,
    plannedStartDate: fixtureBook.plannedStartDate,
    imageUrl: fixtureBook.imageUrl,
    currentPage: fixtureBook.currentPage,
    totalPages: fixtureBook.totalPages,
    status: fixtureBook.status,
    createdAt: fixtureBook.createdAt,
    updatedAt: fixtureBook.updatedAt,
    pausedAt: fixtureBook.pausedAt,
  };
}
