import { describe, expect, it } from "vitest";
import {
  ApiErrorSchema,
  ApiErrorResponseSchema,
  BookSchema,
  BookSearchResultSchema,
  CancellationRequestSchema,
  ConsentSchema,
  DeleteAccountResultSchema,
  ExportReadingDataResultSchema,
  GoalSchema,
  HighlightSchema,
  ImageSchema,
  InsightSchema,
  NotificationSchema,
  NotificationSettingsSchema,
  NoteSchema,
  PaginationSchema,
  PageInfoSchema,
  ProgressEventSchema,
  RecommendationResultSchema,
  RecallSearchHistorySchema,
  RecallSearchRequestSchema,
  RecallSearchResultSchema,
  ReadingSessionSchema,
  SortSchema,
  UserSchema,
  consumerRoutes,
  type Locale,
  type ProductSchema,
} from "./index";

const ids = {
  user: "00000000-0000-4000-8000-000000000041",
  book: "00000000-0000-4000-8000-000000000101",
  image: "00000000-0000-4000-8000-000000000201",
  record: "00000000-0000-4000-8000-000000000301",
  session: "00000000-0000-4000-8000-000000000401",
};

const dates = {
  created: "2026-01-01T00:00:00.000Z",
  updated: "2026-01-02T00:00:00.000Z",
};

const recommendationProfile = {
  stats: {
    totalBooksCompleted: 3,
    averageRating: 4.5,
    favoriteGenres: [{ genre: "essay", count: 2 }],
    averageCompletionDays: 12,
    highEngagementBookCount: 1,
  },
  booksAnalyzed: 3,
};

const book = {
  id: ids.book,
  title: "Fixture Book",
  author: "Fixture Author",
  startDate: dates.created,
  targetDate: dates.updated,
  imageUrl: "/storage/book.png",
  currentPage: 12,
  totalPages: 240,
  status: "reading",
  attemptCount: 1,
  dailyTargetPages: 10,
  priority: 2,
  pausedAt: null,
  plannedStartDate: null,
  deletedAt: null,
  genre: "essay",
  publisher: "Fixture Publisher",
  isbn: "9781234567890",
  rating: 4,
  review: null,
  reviewLink: null,
  aladinUrl: null,
  longReview: null,
  price: 18000,
  createdAt: dates.created,
  updatedAt: dates.updated,
};

const schemaFixtures: readonly [string, ProductSchema<unknown>, unknown][] = [
  [
    "user",
    UserSchema,
    {
      id: ids.user,
      email: "fixture@local.invalid",
      nickname: "Fixture",
      name: "Fixture User",
      avatarUrl: null,
      metadata: { fixture: true },
      createdAt: dates.created,
      lastSignInAt: dates.updated,
    },
  ],
  ["book", BookSchema, book],
  [
    "book-search",
    BookSearchResultSchema,
    {
      title: "Search Result",
      author: "Author",
      imageUrl: null,
      totalPages: 200,
      isbn: "9781234567890",
      genre: "essay",
      publisher: "Publisher",
      aladinUrl: null,
      price: 12000,
    },
  ],
  [
    "progress-event",
    ProgressEventSchema,
    { id: ids.record, bookId: ids.book, page: 12, previousPage: 10, createdAt: dates.updated },
  ],
  [
    "reading-session",
    ReadingSessionSchema,
    {
      id: ids.session,
      bookId: ids.book,
      startedAt: dates.created,
      endedAt: dates.updated,
      durationSeconds: 1200,
      createdAt: dates.created,
    },
  ],
  ["goal", GoalSchema, { id: ids.record, year: 2026, targetBooks: 24, createdAt: dates.created, updatedAt: dates.updated }],
  [
    "image",
    ImageSchema,
    { id: ids.image, bookId: ids.book, imageUrl: "/storage/book.png", caption: "Page", pageNumber: 1 },
  ],
  [
    "highlight",
    HighlightSchema,
    {
      id: ids.record,
      points: [{ x: 0.1, y: 0.2 }, { x: 0.8, y: 0.2 }],
      color: "#FFEB3B",
      opacity: 0.5,
      strokeWidth: 0.05,
    },
  ],
  [
    "note",
    NoteSchema,
    {
      id: ids.record,
      bookId: ids.book,
      contentType: "note",
      contentText: "Fixture note",
      pageNumber: 12,
      sourceId: null,
      createdAt: dates.created,
    },
  ],
  [
    "recall-result",
    RecallSearchResultSchema,
    { answer: "Fixture answer", sources: [{ type: "note", content: "Fixture note", pageNumber: 12, sourceId: ids.record, createdAt: dates.created, bookId: ids.book, bookTitle: "Fixture Book" }] },
  ],
  ["recall-history", RecallSearchHistorySchema, { id: ids.record, query: "fixture", answer: "answer", sources: [], createdAt: dates.created }],
  [
    "insight",
    InsightSchema,
    { id: ids.record, title: "Pattern", description: "Description", category: "pattern", relatedBooks: [ids.book], generatedAt: dates.created },
  ],
  [
    "recommendation",
    RecommendationResultSchema,
    {
      success: true,
      recommendations: [{ title: "Recommended", author: "Author", reason: "Reason", keywords: ["essay"] }],
      profile: recommendationProfile,
    },
  ],
  ["consent", ConsentSchema, { kind: "ai", status: "granted", version: "2026-01", grantedAt: dates.created }],
  ["notification", NotificationSchema, { id: ids.record, category: "daily_reminder", title: "Read", body: "Read today", readAt: null, createdAt: dates.created }],
  [
    "notification-settings",
    NotificationSettingsSchema,
    { notificationEnabled: true, dailyReminderEnabled: true, dailyReminderHour: 18, dailyReminderMinute: 0, goalAlarmEnabled: true, goalAlarmHour: 20, goalAlarmMinute: 0, eventNudgeEnabled: true, announcementsEnabled: true },
  ],
  ["export-result", ExportReadingDataResultSchema, { exportId: ids.record, year: 2026, format: "json", status: "ready", bookCount: 1, recordCount: 3, downloadUrl: "/api/export/fixture", expiresAt: dates.updated }],
  ["delete-result", DeleteAccountResultSchema, { status: "accepted", acceptedAt: dates.updated }],
];

describe("product contract schemas", () => {
  it.each(schemaFixtures)("accepts the canonical %s fixture", (_name, schema, fixture) => {
    expect(schema.parse(fixture)).toEqual(fixture);
  });

  it("defines canonical localized and auth routes", () => {
    expect(consumerRoutes.login("ko")).toBe("/ko/auth/sign-in");
    expect(consumerRoutes.signup("en")).toBe("/en/auth/sign-up");
    expect(consumerRoutes.forgotPassword("ko")).toBe("/ko/auth/reset-password");
    expect(consumerRoutes.app("en")).toBe("/en/home");
    expect(consumerRoutes.library("ko")).toBe("/ko/library");
    expect(consumerRoutes.stats("ko")).toBe("/ko/stats");
    expect(consumerRoutes.calendar("ko")).toBe("/ko/calendar");
    expect(consumerRoutes.account("ko")).toBe("/ko/account");
    expect(consumerRoutes.newBook("ko")).toBe("/ko/books/new");
    expect(consumerRoutes.book("ko", ids.book)).toBe(`/ko/books/${ids.book}`);
    expect(consumerRoutes.reading("ko", ids.book)).toBe(`/ko/reading/${ids.book}`);
    expect(consumerRoutes.recall("ko")).toBe("/ko/library?mode=recall");
    expect(consumerRoutes.privacy("en")).toBe("/en/privacy");
    expect(consumerRoutes.authCallback).toBe("/auth/callback");
    expect(consumerRoutes.authResetPassword).toBe("/auth/reset-password");
  });
});

describe("product contract boundaries", () => {
  it("rejects malformed dates, statuses and pagination", () => {
    expect(() => BookSchema.parse({ ...book, startDate: "tomorrow" })).toThrow();
    expect(() => BookSchema.parse({ ...book, status: "paused" })).toThrow();
    expect(() => PaginationSchema.parse({ limit: 0 })).toThrow();
    expect(() => PaginationSchema.parse({ limit: 101 })).toThrow();
    expect(PaginationSchema.parse({})).toEqual({ limit: 25 });
    expect(SortSchema.parse({ field: "updated_at", direction: "desc" })).toEqual({ field: "updated_at", direction: "desc" });
    expect(PageInfoSchema.parse({ nextCursor: null, hasMore: false })).toEqual({ nextCursor: null, hasMore: false });
  });

  it("preserves stable HTTP meanings in typed errors", () => {
    const error = ApiErrorSchema.parse({ code: "rate_limited", status: 429, message: "Retry later", retryable: true });
    expect(error.status).toBe(429);
    expect(error.code).toBe("rate_limited");
    expect(() => ApiErrorSchema.parse({ code: "unauthorized", status: 403, message: "Denied", retryable: false })).toThrow();
    expect(ApiErrorResponseSchema.parse({ error }).error.code).toBe("rate_limited");
  });

  it("rejects cross-user-request fields", () => {
    const request = { query: "fixture", locale: "ko", pagination: { limit: 10 } };
    expect(RecallSearchRequestSchema.parse(request)).toEqual(request);
    expect(() => RecallSearchRequestSchema.parse({ ...request, user_id: ids.user })).toThrow();
  });

  it("models cancellation without an authorization identity", () => {
    const cancellation = CancellationRequestSchema.parse({ requestId: ids.record, reason: "navigation" });
    expect(cancellation.requestId).toBe(ids.record);
    expect("user_id" in cancellation).toBe(false);
    expect(() => CancellationRequestSchema.parse({ ...cancellation, user_id: ids.user })).toThrow();
  });

  it("rejects unsafe dynamic route segments", () => {
    expect(() => consumerRoutes.book("ko", "../account")).toThrow();
    expect(() => consumerRoutes.reading("ko", "x/y")).toThrow();
  });

  it("rejects unsafe locale route segments", () => {
    expect(() => consumerRoutes.login("../en" as Locale)).toThrow();
    expect(() => consumerRoutes.book("ko/../../admin" as Locale, ids.book)).toThrow();
  });

  it("keeps recommendation success and failure states exclusive", () => {
    const success = {
      success: true,
      recommendations: [],
      profile: recommendationProfile,
    };
    const failure = {
      success: false,
      recommendations: [],
      profile: { ...recommendationProfile, booksAnalyzed: 0 },
      error: "No completed books found",
    };

    expect(RecommendationResultSchema.parse(success)).toEqual(success);
    expect(RecommendationResultSchema.parse(failure)).toEqual(failure);
    expect(() => RecommendationResultSchema.parse({ ...success, error: "unexpected" })).toThrow();
    expect(() => RecommendationResultSchema.parse({ ...failure, error: undefined })).toThrow();
    expect(() => RecommendationResultSchema.parse({ ...failure, success: true })).toThrow();
  });
});
