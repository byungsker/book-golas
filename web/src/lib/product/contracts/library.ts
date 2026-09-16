import { z } from "zod";
import { BookIdSchema, IsoDateSchema, PageInfoSchema, RecordIdSchema } from "./common";

export const libraryTabValues = ["reading", "review", "records", "recall"] as const;
export const LibraryTabSchema = z.enum(libraryTabValues);

export const libraryRecordTypeValues = ["highlight", "note", "photo_ocr"] as const;
export const LibraryRecordTypeSchema = z.enum(libraryRecordTypeValues);

export const ReadingRecordSchema = z
  .object({
    id: RecordIdSchema,
    bookId: BookIdSchema,
    bookTitle: z.string().trim().min(1).max(500),
    bookImageUrl: z.string().trim().min(1).nullable(),
    contentType: LibraryRecordTypeSchema,
    contentText: z.string(),
    pageNumber: z.number().int().min(1).nullable(),
    sourceId: RecordIdSchema.nullable(),
    createdAt: IsoDateSchema,
  })
  .strict();

export const ReadingRecordPageSchema = z
  .object({
    records: z.array(ReadingRecordSchema),
    pageInfo: PageInfoSchema,
  })
  .strict();

export type LibraryTab = z.infer<typeof LibraryTabSchema>;
export type LibraryRecordType = z.infer<typeof LibraryRecordTypeSchema>;
export type ReadingRecord = z.infer<typeof ReadingRecordSchema>;
export type ReadingRecordPage = z.infer<typeof ReadingRecordPageSchema>;
