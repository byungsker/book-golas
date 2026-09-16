import { describe, expect, it } from "vitest";
import {
  AuthRequestSchema,
  BookListRequestSchema,
  BookSearchRequestSchema,
  ConsentUpdateRequestSchema,
  CreateBookRequestSchema,
  DeleteAccountRequestSchema,
  ExportReadingDataRequestSchema,
  GoalUpsertRequestSchema,
  InsightRequestSchema,
  NotificationSettingsUpdateRequestSchema,
  ProgressUpdateRequestSchema,
  RecommendationRequestSchema,
  RecallSearchRequestSchema,
  ReadingSessionCommandSchema,
  UpdateBookRequestSchema,
  type ProductSchema,
} from "./index";

const id = "00000000-0000-4000-8000-000000000101";
const date = "2026-01-01T00:00:00.000Z";
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const requestFixtures: readonly [string, ProductSchema<unknown>, unknown][] = [
  ["auth", AuthRequestSchema, { email: "fixture@local.invalid", password: "password123", locale: "ko", next: "/ko/home" }],
  ["book-list", BookListRequestSchema, { pagination: { limit: 25 }, sort: { field: "updated_at", direction: "desc" }, status: "reading" }],
  ["book-search", BookSearchRequestSchema, { query: "fixture", locale: "en", pagination: { limit: 10 } }],
  [
    "create-book",
    CreateBookRequestSchema,
    {
      title: "Fixture Book",
      author: "Fixture Author",
      startDate: date,
      targetDate: date,
      totalPages: 240,
      status: "planned",
      imageUrl: null,
      genre: "essay",
      publisher: "Publisher",
      isbn: "9781234567890",
      aladinUrl: null,
      price: 18000,
      dailyTargetPages: 10,
      priority: 1,
    },
  ],
  ["update-book", UpdateBookRequestSchema, { bookId: id, status: "reading" }],
  ["progress", ProgressUpdateRequestSchema, { bookId: id, currentPage: 12, expectedCurrentPage: 10, idempotencyKey: "00000000-0000-4000-8000-000000000501" }],
  ["reading-session", ReadingSessionCommandSchema, { action: "finish", bookId: id, startedAt: date, endedAt: date, durationSeconds: 1200 }],
  ["goal", GoalUpsertRequestSchema, { year: 2026, targetBooks: 24 }],
  ["recall", RecallSearchRequestSchema, { query: "fixture", locale: "ko", bookId: id, pagination: { limit: 10 } }],
  ["insight", InsightRequestSchema, { locale: "en", range: "monthly" }],
  ["recommendation", RecommendationRequestSchema, { locale: "ko" }],
  ["consent", ConsentUpdateRequestSchema, { kind: "ai", status: "granted", version: "2026-01" }],
  ["notification-settings", NotificationSettingsUpdateRequestSchema, { dailyReminderEnabled: false }],
  ["export", ExportReadingDataRequestSchema, { year: 2026, email: "reader@example.com", format: "json", includeImages: true }],
  ["delete-account", DeleteAccountRequestSchema, { confirmation: true }],
];

describe("consumer request contracts", () => {
  it.each(requestFixtures)("accepts the canonical %s request", (name, schema, fixture) => {
    expect(schema.parse(fixture), name).toEqual(fixture);
  });

  it("does not accept a caller-selected user_id on any request", () => {
    for (const [name, schema, fixture] of requestFixtures) {
      if (!isRecord(fixture)) throw new Error("request fixture must be an object");
      expect(() => schema.parse({ ...fixture, user_id: "00000000-0000-4000-8000-000000000041" }), name).toThrow();
    }
  });

  it("requires a bounded date range for custom insights", () => {
    expect(() => InsightRequestSchema.parse({ locale: "ko", range: "custom" })).toThrow();
    expect(() => InsightRequestSchema.parse({ locale: "ko", range: "custom", from: "2026-01-02T00:00:00.000Z", to: "2026-01-01T00:00:00.000Z" })).toThrow();
  });

  it("keeps auth continuation paths localized and traversal-safe", () => {
    const auth = { email: "fixture@local.invalid", password: "password123", locale: "ko" as const };
    expect(AuthRequestSchema.parse({ ...auth, next: "/ko/home" }).next).toBe("/ko/home");
    expect(() => AuthRequestSchema.parse({ ...auth, next: "/ko/../../admin" })).toThrow();
    expect(() => AuthRequestSchema.parse({ ...auth, next: "/ko/%2e%2e/admin" })).toThrow();
    expect(() => AuthRequestSchema.parse({ ...auth, next: "/en/home" })).toThrow();
  });
});
