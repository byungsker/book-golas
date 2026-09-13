import { z } from "zod";
import { BookIdSchema, sortFieldValues, sortDirectionValues } from "@/lib/product/contracts";
import { failure, success, validationError, type ProductResult } from "./errors";

const BookCursorSchema = z
  .object({
    version: z.literal(1),
    field: z.enum(sortFieldValues),
    direction: z.enum(sortDirectionValues),
    value: z.union([z.string().max(500), z.number().int()]).nullable(),
    id: BookIdSchema,
  })
  .strict();

export type BookCursor = z.infer<typeof BookCursorSchema>;

export function encodeBookCursor(cursor: BookCursor): string {
  const parsed = BookCursorSchema.parse(cursor);
  return Buffer.from(JSON.stringify(parsed), "utf8").toString("base64url");
}

export function decodeBookCursor(value: string): ProductResult<BookCursor> {
  if (value.length === 0 || value.length > 256) {
    return failure(validationError("The pagination cursor is invalid."));
  }

  try {
    const decoded: unknown = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
    const parsed = BookCursorSchema.safeParse(decoded);
    return parsed.success
      ? success(parsed.data)
      : failure(validationError("The pagination cursor is invalid."));
  } catch {
    return failure(validationError("The pagination cursor is invalid."));
  }
}
