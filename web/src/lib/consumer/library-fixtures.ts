import type { Book, RecallSearchHistory, RecallSearchResult, ReadingRecord } from "@/lib/product/contracts";
import type { LibraryPayload } from "./library";

export const libraryFixtureUserId = "00000000-0000-4000-8000-000000000001";
const now = "2026-09-16T00:00:00.000Z";

const bookDefaults = {
  author: null,
  startDate: "2026-08-01T00:00:00.000Z",
  targetDate: "2026-10-01T00:00:00.000Z",
  imageUrl: null,
  currentPage: 0,
  totalPages: 200,
  status: "reading" as const,
  attemptCount: 1,
  dailyTargetPages: 10,
  priority: 1,
  pausedAt: null,
  plannedStartDate: null,
  deletedAt: null,
  genre: "essay",
  publisher: "Bookgolas Press",
  isbn: null,
  rating: null,
  review: null,
  reviewLink: null,
  aladinUrl: null,
  longReview: null,
  price: null,
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: now,
} satisfies Omit<Book, "id" | "title">;

const fixtureBooks = [
  { ...bookDefaults, id: "00000000-0000-4000-8000-000000004301", title: "The Reading Atlas", author: "Mina Park", currentPage: 84, updatedAt: "2026-09-16T00:00:00.000Z" },
  { ...bookDefaults, id: "00000000-0000-4000-8000-000000004302", title: "The Quiet Shelf", author: "Sora Lee", currentPage: 42, updatedAt: "2026-09-15T00:00:00.000Z" },
  { ...bookDefaults, id: "00000000-0000-4000-8000-000000004303", title: "Finished Signals", author: "J. Han", status: "completed", currentPage: 200, rating: 5, review: "A clear and memorable finish.", longReview: "The ideas stayed useful after the final page.", updatedAt: "2026-09-14T00:00:00.000Z" },
  { ...bookDefaults, id: "00000000-0000-4000-8000-000000004304", title: "Reviewing Systems", author: "N. Choi", status: "reading", currentPage: 120, review: "A practical review.", updatedAt: "2026-09-13T00:00:00.000Z" },
  { ...bookDefaults, id: "00000000-0000-4000-8000-000000004305", title: "A Fifth Private Book", author: "R. Kim", status: "planned", plannedStartDate: "2026-10-02T00:00:00.000Z", currentPage: 0, updatedAt: "2026-09-12T00:00:00.000Z" },
] as unknown as Book[];

const fixtureRecords = [
  { id: "00000000-0000-4000-8000-000000004311", bookId: fixtureBooks[0].id, bookTitle: fixtureBooks[0].title, bookImageUrl: null, contentType: "highlight", contentText: "A useful idea about attention.", pageNumber: 12, sourceId: "00000000-0000-4000-8000-000000004321", createdAt: now },
  { id: "00000000-0000-4000-8000-000000004312", bookId: fixtureBooks[0].id, bookTitle: fixtureBooks[0].title, bookImageUrl: null, contentType: "note", contentText: "Try this during the next reading session.", pageNumber: 18, sourceId: "00000000-0000-4000-8000-000000004322", createdAt: "2026-09-15T00:00:00.000Z" },
  { id: "00000000-0000-4000-8000-000000004313", bookId: fixtureBooks[2].id, bookTitle: fixtureBooks[2].title, bookImageUrl: null, contentType: "photo_ocr", contentText: "The final chapter reframes the question.", pageNumber: 180, sourceId: "00000000-0000-4000-8000-000000004323", createdAt: "2026-09-14T00:00:00.000Z" },
] as unknown as ReadingRecord[];

const recallHistory = [
  {
    id: "00000000-0000-4000-8000-000000004331",
    query: "attention",
    answer: "You saved a note about attention in The Reading Atlas.",
    sources: [{ type: "highlight", content: "A useful idea about attention.", pageNumber: 12, sourceId: "00000000-0000-4000-8000-000000004321", createdAt: now, bookId: fixtureBooks[0].id, bookTitle: fixtureBooks[0].title }],
    createdAt: "2026-09-15T12:00:00.000Z",
  },
] as unknown as RecallSearchHistory[];

const recallResult: RecallSearchResult = {
  answer: "Your records connect attention with a deliberate reading pace.",
  sources: recallHistory[0].sources,
  sourcesByBook: { [fixtureBooks[0].id]: recallHistory[0].sources },
};

function emptyPage(tab: LibraryPayload["tab"]): LibraryPayload {
  return { tab, books: [], records: [], history: [], recall: null, pageInfo: { nextCursor: null, hasMore: false }, counts: { reading: 0, review: 0, records: 0 } };
}

function pageInfo(items: number, offset: number, limit: number) {
  return { nextCursor: offset + limit < items ? String(offset + limit) : null, hasMore: offset + limit < items };
}

export async function getLibraryFixturePage(input: {
  fixture: string;
  tab: LibraryPayload["tab"];
  query: string;
  cursor: string | null;
  limit: number;
  recordType: string | null;
}): Promise<LibraryPayload> {
  if (input.fixture === "library-pending" || (input.fixture === "library-cancellation" && input.query === "slow")) {
    await new Promise((resolve) => setTimeout(resolve, 800));
  }
  if (["library-empty", "library-empty-reading", "library-empty-review", "library-empty-records", "library-recall-empty"].includes(input.fixture)) {
    return emptyPage(input.tab);
  }
  if (input.tab === "recall") {
    if (!input.query) {
      return { ...emptyPage("recall"), history: input.fixture === "library-recall-empty" ? [] : recallHistory };
    }
    return { ...emptyPage("recall"), recall: input.fixture === "library-recall-empty" ? { answer: "", sources: [] } : recallResult };
  }

  const sourceBooks = input.tab === "review"
    ? fixtureBooks.filter((book) => Boolean(book.review?.trim() || book.longReview?.trim()))
    : fixtureBooks;
  const normalizedQuery = input.query.trim().toLocaleLowerCase();
  const filteredBooks = normalizedQuery
    ? sourceBooks.filter((book) => `${book.title} ${book.author ?? ""}`.toLocaleLowerCase().includes(normalizedQuery))
    : sourceBooks;
  const filteredRecords = input.recordType
    ? fixtureRecords.filter((record) => record.contentType === input.recordType)
    : fixtureRecords;
  const source = input.tab === "records" ? filteredRecords : filteredBooks;
  const offset = input.cursor ? Math.max(0, Number.parseInt(input.cursor, 10) || 0) : 0;
  const next = source.slice(offset, offset + input.limit);
  const counts = {
    reading: fixtureBooks.filter((book) => book.status !== "completed").length,
    review: fixtureBooks.filter((book) => Boolean(book.review?.trim() || book.longReview?.trim())).length,
    records: fixtureRecords.length,
  };
  return {
    tab: input.tab,
    books: input.tab === "records" ? [] : next as Book[],
    records: input.tab === "records" ? next as ReadingRecord[] : [],
    history: [],
    recall: null,
    pageInfo: pageInfo(source.length, offset, input.limit),
    counts,
  };
}

export function getLibraryFixtureForbiddenMarkers() {
  return ["Foreign private title", "User A recall history", "foreign-user-id"];
}
