import { z } from "zod";
import { BookIdSchema, ErrorCodeSchema, ImageIdSchema, IsoDateSchema, LocaleSchema, RecordIdSchema } from "./common";

export const maxBookImageBytes = 8 * 1024 * 1024;
export const bookImageMimeTypeValues = ["image/jpeg", "image/png", "image/webp"] as const;
export const BookImageMimeTypeSchema = z.enum(bookImageMimeTypeValues);
export type BookImageMimeType = z.infer<typeof BookImageMimeTypeSchema>;

export const bookImageOcrStatusValues = ["not_requested", "pending", "ready", "failed", "manual"] as const;
export const BookImageOcrStatusSchema = z.enum(bookImageOcrStatusValues);
export type BookImageOcrStatus = z.infer<typeof BookImageOcrStatusSchema>;

export const imageCaptureStateValues = [
  "idle",
  "camera_ready",
  "camera_unavailable",
  "insecure_context",
  "permission_denied",
  "unsupported",
  "file_ready",
  "uploading",
  "saved",
  "error",
] as const;
export const ImageCaptureStateSchema = z.enum(imageCaptureStateValues);
export type ImageCaptureState = z.infer<typeof ImageCaptureStateSchema>;

export const BookImageSchema = z
  .object({
    id: ImageIdSchema,
    bookId: BookIdSchema,
    storageBucket: z.literal("book-images"),
    storagePath: z.string().trim().min(1).max(500),
    signedUrl: z.string().url(),
    signedUrlExpiresAt: IsoDateSchema,
    mimeType: BookImageMimeTypeSchema,
    byteSize: z.number().int().positive().max(maxBookImageBytes),
    caption: z.string().max(2_000).nullable(),
    pageNumber: z.number().int().min(1).nullable(),
    extractedText: z.string().max(20_000),
    ocrStatus: BookImageOcrStatusSchema,
    ocrError: z.string().trim().max(500).nullable(),
    createdAt: IsoDateSchema,
    updatedAt: IsoDateSchema,
  })
  .strict();
export type BookImage = z.infer<typeof BookImageSchema>;

export const ImagesOcrUploadMetadataSchema = z
  .object({
    action: z.literal("upload"),
    locale: LocaleSchema,
    bookId: BookIdSchema,
    pageNumber: z.number().int().min(1).nullable(),
    caption: z.string().trim().max(2_000).nullable(),
    ocrConsent: z.boolean(),
    manualText: z.string().max(20_000).default(""),
    idempotencyKey: z.string().uuid(),
  })
  .strict();
export type ImagesOcrUploadMetadata = z.infer<typeof ImagesOcrUploadMetadataSchema>;

export const ImagesOcrJsonMutationSchema = z
  .object({
    action: z.enum(["manual", "delete", "retry_ocr"]),
    locale: LocaleSchema,
    bookId: BookIdSchema,
    imageId: ImageIdSchema,
    manualText: z.string().max(20_000).optional(),
    ocrConsent: z.boolean().optional().default(false),
    idempotencyKey: z.string().uuid(),
  })
  .strict()
  .superRefine((input, context) => {
    if (input.action === "manual" && input.manualText === undefined) {
      context.addIssue({ code: "custom", path: ["manualText"], message: "manualText is required" });
    }
    if (input.action !== "manual" && input.manualText !== undefined) {
      context.addIssue({ code: "custom", path: ["manualText"], message: "manualText is only valid for manual updates" });
    }
  });
export type ImagesOcrJsonMutation = z.infer<typeof ImagesOcrJsonMutationSchema>;

export const ImageOcrOutcomeSchema = z
  .object({
    status: BookImageOcrStatusSchema,
    errorCode: ErrorCodeSchema.nullable(),
    message: z.string().trim().max(500).nullable(),
  })
  .strict();
export type ImageOcrOutcome = z.infer<typeof ImageOcrOutcomeSchema>;

export const ImagesOcrListResponseSchema = z
  .object({ kind: z.literal("list"), images: z.array(BookImageSchema) })
  .strict();

export const ImagesOcrSavedResponseSchema = z
  .object({
    kind: z.literal("saved"),
    image: BookImageSchema,
    duplicate: z.boolean(),
    ocr: ImageOcrOutcomeSchema,
    invalidatedPaths: z.array(z.string().startsWith("/")).min(1),
  })
  .strict();

export const ImagesOcrDeletedResponseSchema = z
  .object({
    kind: z.literal("deleted"),
    imageId: ImageIdSchema,
    invalidatedPaths: z.array(z.string().startsWith("/")).min(1),
  })
  .strict();

export const ImagesOcrResponseSchema = z.discriminatedUnion("kind", [
  ImagesOcrListResponseSchema,
  ImagesOcrSavedResponseSchema,
  ImagesOcrDeletedResponseSchema,
]);
export type ImagesOcrResponse = z.infer<typeof ImagesOcrResponseSchema>;

export type ImageValidationResult =
  | { ok: true; mimeType: BookImageMimeType }
  | { ok: false; reason: "oversize" | "wrong_mime" | "corrupt" };

function startsWithBytes(bytes: Uint8Array, expected: readonly number[]): boolean {
  return expected.every((value, index) => bytes[index] === value);
}

export function isSupportedBookImageMimeType(value: string): value is BookImageMimeType {
  return BookImageMimeTypeSchema.safeParse(value.toLowerCase()).success;
}

export function imageSignatureMatches(mimeType: BookImageMimeType, bytes: Uint8Array): boolean {
  if (mimeType === "image/jpeg") return startsWithBytes(bytes, [0xff, 0xd8, 0xff]);
  if (mimeType === "image/png") return startsWithBytes(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return startsWithBytes(bytes, [0x52, 0x49, 0x46, 0x46]) &&
    bytes.length >= 12 &&
    startsWithBytes(bytes.slice(8, 12), [0x57, 0x45, 0x42, 0x50]);
}

export function validateBookImageBytes(input: {
  mimeType: string;
  byteLength: number;
  bytes: Uint8Array;
}): ImageValidationResult {
  if (!Number.isInteger(input.byteLength) || input.byteLength <= 0 || input.byteLength > maxBookImageBytes) {
    return { ok: false, reason: "oversize" };
  }
  const mimeType = input.mimeType.toLowerCase();
  if (!isSupportedBookImageMimeType(mimeType)) return { ok: false, reason: "wrong_mime" };
  if (input.bytes.byteLength !== input.byteLength || !imageSignatureMatches(mimeType, input.bytes)) {
    return { ok: false, reason: "corrupt" };
  }
  return { ok: true, mimeType };
}

export function imageExtension(mimeType: BookImageMimeType): string {
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/png") return "png";
  return "webp";
}

export function isPrivateBookImagePath(path: string, userId: string, bookId: string): boolean {
  const prefix = `${userId}/${bookId}/`;
  const fileName = path.startsWith(prefix) ? path.slice(prefix.length) : "";
  return /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(fileName) && !fileName.includes("..");
}

export const imageRecordId = RecordIdSchema;
