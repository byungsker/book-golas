import { describe, expect, it } from "vitest";
import {
  ConsumerRecordSchema,
  NormalizedHighlightRectangleSchema,
  NotesHighlightsMutationSchema,
  normalizeHighlightRectangles,
} from "./notes-highlights";

const bookId = "00000000-0000-4000-8000-000000004332";
const recordId = "00000000-0000-4000-8000-000000004321";
const createdAt = "2026-09-16T00:00:00.000Z";

describe("notes and highlights contract", () => {
  it("accepts owner records with normalized highlight rectangles", () => {
    const parsed = ConsumerRecordSchema.safeParse({
      id: recordId,
      bookId: bookId,
      recordType: "highlight",
      pageNumber: 12,
      contentText: "A saved thought.",
      caption: null,
      imageUrl: null,
      rectangles: [{ x: 0.1234567, y: 0.2, width: 0.4, height: 0.1 }],
      sourceId: recordId,
      sourceHref: null,
      indexStatus: "pending",
      indexError: null,
      createdAt: createdAt,
      updatedAt: createdAt,
    });
    expect(parsed.success).toBe(true);
    expect(normalizeHighlightRectangles(parsed.success ? parsed.data.rectangles : [])).toEqual([
      { x: 0.123457, y: 0.2, width: 0.4, height: 0.1 },
    ]);
  });

  it("rejects zero-size and overflowing rectangles", () => {
    expect(NormalizedHighlightRectangleSchema.safeParse({ x: 0.2, y: 0.2, width: 0, height: 0.2 }).success).toBe(false);
    expect(NormalizedHighlightRectangleSchema.safeParse({ x: 0.8, y: 0.2, width: 0.3, height: 0.2 }).success).toBe(false);
    expect(NormalizedHighlightRectangleSchema.safeParse({ x: 0.2, y: 0.8, width: 0.2, height: 0.3 }).success).toBe(false);
  });

  it("requires record type and consent-aware mutation data", () => {
    const valid = NotesHighlightsMutationSchema.safeParse({
      action: "create",
      locale: "ko",
      bookId,
      recordType: "note",
      pageNumber: 1,
      contentText: "A note",
      rectangles: [],
      aiConsent: false,
      idempotencyKey: "00000000-0000-4000-8000-000000000901",
    });
    expect(valid.success).toBe(true);
    expect(NotesHighlightsMutationSchema.safeParse({
      action: "create",
      locale: "ko",
      bookId,
      contentText: "A note",
      rectangles: [],
      idempotencyKey: "00000000-0000-4000-8000-000000000902",
    }).success).toBe(false);
    expect(NotesHighlightsMutationSchema.safeParse({
      action: "create",
      locale: "ko",
      bookId,
      recordType: "note",
      contentText: "A note",
      rectangles: [],
      sourceHref: "http://unsafe.example.test/source",
      idempotencyKey: "00000000-0000-4000-8000-000000000903",
    }).success).toBe(false);
  });

  it("rejects caller-selected identity fields", () => {
    const result = NotesHighlightsMutationSchema.safeParse({
      action: "create",
      locale: "en",
      bookId,
      recordType: "note",
      contentText: "A note",
      rectangles: [],
      user_id: "foreign-user",
      idempotencyKey: "00000000-0000-4000-8000-000000000904",
    });
    expect(result.success).toBe(false);
  });
});
