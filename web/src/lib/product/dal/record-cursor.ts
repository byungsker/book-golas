import { z } from "zod";
import { BookIdSchema, paginationCursorMaxLength, RecordIdSchema } from "@/lib/product/contracts";
import { failure, success, validationError, type ProductResult } from "./errors";

const ReadingRecordCursorSchema = z
  .object({
    version: z.literal(1),
    value: z.string().datetime({ offset: true }),
    id: RecordIdSchema,
    bookId: BookIdSchema,
  })
  .strict();

export type ReadingRecordCursor = z.infer<typeof ReadingRecordCursorSchema>;

export function encodeReadingRecordCursor(cursor: ReadingRecordCursor): string {
  const parsed = ReadingRecordCursorSchema.parse(cursor);
  const encoded = Buffer.from(JSON.stringify(parsed), "utf8").toString("base64url");
  if (encoded.length > paginationCursorMaxLength) throw new Error("The record cursor exceeds the maximum length.");
  return encoded;
}

export function decodeReadingRecordCursor(value: string): ProductResult<ReadingRecordCursor> {
  if (value.length === 0 || value.length > paginationCursorMaxLength) {
    return failure(validationError("The record pagination cursor is invalid."));
  }
  try {
    const parsed = ReadingRecordCursorSchema.safeParse(
      JSON.parse(Buffer.from(value, "base64url").toString("utf8")),
    );
    return parsed.success
      ? success(parsed.data)
      : failure(validationError("The record pagination cursor is invalid."));
  } catch {
    return failure(validationError("The record pagination cursor is invalid."));
  }
}
