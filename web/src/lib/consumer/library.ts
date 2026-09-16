import { z } from "zod";
import type {
  Book,
  LibraryRecordType,
  PageInfo,
  RecallSearchHistory,
  RecallSearchResult,
  ReadingRecord,
} from "@/lib/product/contracts";
import {
  BookSchema,
  PageInfoSchema,
  RecallSearchHistorySchema,
  RecallSearchResultSchema,
  ReadingRecordSchema,
} from "@/lib/product/contracts";

export const libraryTabs = ["reading", "review", "records"] as const;
export type LibraryViewTab = (typeof libraryTabs)[number];

export type LibraryCounts = Readonly<{
  reading: number;
  review: number;
  records: number;
}>;

export type LibraryPayload = Readonly<{
  tab: "reading" | "review" | "records" | "recall";
  books: Book[];
  records: ReadingRecord[];
  history: RecallSearchHistory[];
  recall: RecallSearchResult | null;
  pageInfo: PageInfo;
  counts: LibraryCounts;
}>;

const LibraryCountsSchema = z.object({
  reading: z.number().int().min(0),
  review: z.number().int().min(0),
  records: z.number().int().min(0),
}).strict();

export const LibraryPayloadSchema = z.object({
  tab: z.enum(["reading", "review", "records", "recall"]),
  books: z.array(BookSchema),
  records: z.array(ReadingRecordSchema),
  history: z.array(RecallSearchHistorySchema),
  recall: RecallSearchResultSchema.nullable(),
  pageInfo: PageInfoSchema,
  counts: LibraryCountsSchema,
}).strict();

export function parseLibraryPayload(value: unknown): LibraryPayload | null {
  const parsed = LibraryPayloadSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export type LibraryRequest = Readonly<{
  locale: "ko" | "en";
  tab: LibraryPayload["tab"];
  query?: string;
  cursor?: string | null;
  limit?: number;
  recordType?: LibraryRecordType | null;
}>;

export function buildLibraryApiUrl(request: LibraryRequest): string {
  const params = new URLSearchParams({ locale: request.locale, tab: request.tab });
  if (request.query?.trim()) params.set("query", request.query.trim());
  if (request.cursor) params.set("cursor", request.cursor);
  if (request.limit !== undefined) params.set("limit", String(request.limit));
  if (request.recordType) params.set("recordType", request.recordType);
  return `/api/consumer/library?${params.toString()}`;
}

export function mergeById<T extends { id: string }>(current: readonly T[], next: readonly T[]): T[] {
  const seen = new Set<string>();
  return [...current, ...next].filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

export function groupRecordsByBook(records: readonly ReadingRecord[]) {
  const groups = new Map<string, { bookId: string; bookTitle: string; bookImageUrl: string | null; records: ReadingRecord[] }>();
  for (const record of records) {
    const group = groups.get(record.bookId) ?? {
      bookId: record.bookId,
      bookTitle: record.bookTitle,
      bookImageUrl: record.bookImageUrl,
      records: [],
    };
    group.records.push(record);
    groups.set(record.bookId, group);
  }
  return [...groups.values()];
}

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

export function getLibraryTab(value: string | null | undefined): LibraryViewTab {
  return libraryTabs.includes(value as LibraryViewTab) ? value as LibraryViewTab : "reading";
}
