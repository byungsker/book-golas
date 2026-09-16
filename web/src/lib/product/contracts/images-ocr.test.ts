import { describe, expect, it } from "vitest";
import {
  BookImageSchema,
  ImagesOcrJsonMutationSchema,
  ImagesOcrUploadMetadataSchema,
  imageExtension,
  isPrivateBookImagePath,
  maxBookImageBytes,
  validateBookImageBytes,
} from "./images-ocr";

const bookId = "30000000-0000-4000-8000-000000000003";
const userId = "20000000-0000-4000-8000-000000000002";
const imageId = "50000000-0000-4000-8000-000000000005";
const idempotencyKey = "60000000-0000-4000-8000-000000000006";

const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0x00]);
const webp = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50]);

function uploadInput(overrides: Record<string, unknown> = {}) {
  return {
    action: "upload" as const,
    locale: "ko" as const,
    bookId,
    pageNumber: 12,
    caption: "A page",
    ocrConsent: true,
    manualText: "",
    idempotencyKey,
    ...overrides,
  };
}

describe("private images and OCR contract", () => {
  it("accepts supported image signatures and derives safe extensions", () => {
    expect(validateBookImageBytes({ mimeType: "image/png", byteLength: png.byteLength, bytes: png })).toEqual({ ok: true, mimeType: "image/png" });
    expect(validateBookImageBytes({ mimeType: "image/jpeg", byteLength: jpeg.byteLength, bytes: jpeg })).toEqual({ ok: true, mimeType: "image/jpeg" });
    expect(validateBookImageBytes({ mimeType: "image/webp", byteLength: webp.byteLength, bytes: webp })).toEqual({ ok: true, mimeType: "image/webp" });
    expect(imageExtension("image/jpeg")).toBe("jpg");
    expect(imageExtension("image/png")).toBe("png");
    expect(imageExtension("image/webp")).toBe("webp");
  });

  it("rejects oversize, wrong MIME and mismatched image bytes", () => {
    expect(validateBookImageBytes({ mimeType: "image/png", byteLength: maxBookImageBytes + 1, bytes: png })).toEqual({ ok: false, reason: "oversize" });
    expect(validateBookImageBytes({ mimeType: "image/gif", byteLength: png.byteLength, bytes: png })).toEqual({ ok: false, reason: "wrong_mime" });
    expect(validateBookImageBytes({ mimeType: "image/png", byteLength: jpeg.byteLength, bytes: jpeg })).toEqual({ ok: false, reason: "corrupt" });
    expect(validateBookImageBytes({ mimeType: "image/png", byteLength: png.byteLength + 1, bytes: png })).toEqual({ ok: false, reason: "corrupt" });
  });

  it("keeps image paths inside the authenticated user and book prefix", () => {
    expect(isPrivateBookImagePath(`${userId}/${bookId}/${imageId}.png`, userId, bookId)).toBe(true);
    expect(isPrivateBookImagePath(`${userId}/${bookId}/../other.png`, userId, bookId)).toBe(false);
    expect(isPrivateBookImagePath(`10000000-0000-4000-8000-000000000001/${bookId}/${imageId}.png`, userId, bookId)).toBe(false);
    expect(isPrivateBookImagePath(`${userId}/${bookId}/nested/${imageId}.png`, userId, bookId)).toBe(false);
    expect(isPrivateBookImagePath(`${userId}/${bookId}/${imageId}%2F.png`, userId, bookId)).toBe(false);
  });

  it("requires consent-aware, identity-free mutation shapes", () => {
    expect(ImagesOcrUploadMetadataSchema.safeParse(uploadInput()).success).toBe(true);
    expect(ImagesOcrUploadMetadataSchema.safeParse(uploadInput({ user_id: userId })).success).toBe(false);
    expect(ImagesOcrJsonMutationSchema.safeParse({
      action: "manual",
      locale: "en",
      bookId,
      imageId,
      manualText: "Manual transcription",
      idempotencyKey,
    }).success).toBe(true);
    expect(ImagesOcrJsonMutationSchema.safeParse({
      action: "manual",
      locale: "en",
      bookId,
      imageId,
      idempotencyKey,
    }).success).toBe(false);
    expect(ImagesOcrJsonMutationSchema.safeParse({
      action: "delete",
      locale: "en",
      bookId,
      imageId,
      manualText: "caller field",
      idempotencyKey,
    }).success).toBe(false);
  });

  it("parses only private signed image records", () => {
    const result = BookImageSchema.safeParse({
      id: imageId,
      bookId,
      storageBucket: "book-images",
      storagePath: `${userId}/${bookId}/${imageId}.png`,
      signedUrl: "https://storage.example.invalid/sign/image.png",
      signedUrlExpiresAt: "2026-09-16T00:15:00.000Z",
      mimeType: "image/png",
      byteSize: png.byteLength,
      caption: null,
      pageNumber: 12,
      extractedText: "",
      ocrStatus: "not_requested",
      ocrError: null,
      createdAt: "2026-09-16T00:00:00.000Z",
      updatedAt: "2026-09-16T00:00:00.000Z",
    });
    expect(result.success).toBe(true);
  });
});
