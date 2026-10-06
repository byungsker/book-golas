import { z } from "zod";
import type {
  Book,
  PageInfo,
  RecallSearchHistory,
  RecallSearchResult,
} from "@/shared/api/contracts";
import {
  BookSchema,
  PageInfoSchema,
  RecallSearchHistorySchema,
  RecallSearchResultSchema,
} from "@/shared/api/contracts";
import { ReadingRecordSchema, type ReadingRecord } from "./library-contracts";

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
