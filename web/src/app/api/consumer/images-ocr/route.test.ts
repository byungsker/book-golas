import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { BookIdSchema, BookImageSchema } from "@/lib/product/contracts";
import {
  deleteOwnedBookImage,
  listOwnedBookImagesWithSignedUrls,
  retryOwnedBookImageOcr,
  updateOwnedBookImageManualText,
  uploadOwnedBookImage,
} from "@/lib/product/dal";
import { GET, POST } from "./route";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/product/dal", () => ({
  deleteOwnedBookImage: vi.fn(),
  listOwnedBookImagesWithSignedUrls: vi.fn(),
  retryOwnedBookImageOcr: vi.fn(),
  updateOwnedBookImageManualText: vi.fn(),
  uploadOwnedBookImage: vi.fn(),
}));

const bookId = BookIdSchema.parse("30000000-0000-4000-8000-000000000003");
const imageId = "50000000-0000-4000-8000-000000000005";
const userId = "20000000-0000-4000-8000-000000000002";
const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);

function image() {
  return BookImageSchema.parse({
    id: imageId,
    bookId,
    storageBucket: "book-images",
    storagePath: `${userId}/${bookId}/${imageId}.png`,
    signedUrl: "https://storage.example.invalid/sign/image.png",
    signedUrlExpiresAt: "2026-09-16T00:15:00.000Z",
    mimeType: "image/png",
    byteSize: png.byteLength,
    caption: "A page",
    pageNumber: 12,
    extractedText: "OCR text",
    ocrStatus: "ready",
    ocrError: null,
    createdAt: "2026-09-16T00:00:00.000Z",
    updatedAt: "2026-09-16T00:00:00.000Z",
  });
}

function jsonRequest(body: unknown, fixture?: string) {
  return new NextRequest("http://localhost/api/consumer/images-ocr", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(fixture ? { Cookie: `bookgolas-route-fixture=${fixture}` } : {}),
    },
    body: JSON.stringify(body),
  });
}

function uploadRequest(fixture: string, idempotencyKey: string) {
  const form = new FormData();
  form.set("action", "upload");
  form.set("locale", "en");
  form.set("bookId", bookId);
  form.set("pageNumber", "12");
  form.set("caption", "A page");
  form.set("ocrConsent", "true");
  form.set("manualText", "");
  form.set("idempotencyKey", idempotencyKey);
  form.set("file", new File([png], "page.png", { type: "image/png" }));
  return new NextRequest("http://localhost/api/consumer/images-ocr", {
    method: "POST",
    headers: { Cookie: `bookgolas-route-fixture=${fixture}` },
    body: form,
  });
}

describe("/api/consumer/images-ocr", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    delete process.env.BOOKGOLAS_ROUTE_TEST_MODE;
  });

  it("lists private signed images with a no-store response", async () => {
    vi.mocked(listOwnedBookImagesWithSignedUrls).mockResolvedValue({ ok: true, value: [image()] });

    const response = await GET(new NextRequest(`http://localhost/api/consumer/images-ocr?bookId=${bookId}&locale=en`));

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(await response.json()).toMatchObject({ kind: "list", images: [{ storageBucket: "book-images", storagePath: `${userId}/${bookId}/${imageId}.png` }] });
    expect(listOwnedBookImagesWithSignedUrls).toHaveBeenCalledWith(bookId);
  });

  it("accepts a valid multipart image through the browser fixture boundary", async () => {
    process.env.BOOKGOLAS_ROUTE_TEST_MODE = "enabled";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54321";

    const response = await POST(uploadRequest("images-ocr-happy", "60000000-0000-4000-8000-000000000006"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(body).toMatchObject({ kind: "saved", image: { storageBucket: "book-images", ocrStatus: "ready" }, ocr: { status: "ready" } });
    expect(body.image.signedUrl).toMatch(/^https:\/\//);
    expect(uploadOwnedBookImage).not.toHaveBeenCalled();
  });

  it("routes manual, retry and delete JSON mutations through typed DAL operations", async () => {
    vi.mocked(updateOwnedBookImageManualText).mockResolvedValue({ ok: true, value: { image: image(), duplicate: false, ocr: { status: "manual", errorCode: null, message: null } } });
    vi.mocked(retryOwnedBookImageOcr).mockResolvedValue({ ok: true, value: { image: image(), duplicate: false, ocr: { status: "ready", errorCode: null, message: null } } });
    vi.mocked(deleteOwnedBookImage).mockResolvedValue({ ok: true, value: { imageId } });

    const common = { locale: "en", bookId, imageId, idempotencyKey: "60000000-0000-4000-8000-000000000007" };
    const manual = await POST(jsonRequest({ ...common, action: "manual", manualText: "Manual text" }));
    const retry = await POST(jsonRequest({ ...common, action: "retry_ocr", ocrConsent: true }));
    const deleted = await POST(jsonRequest({ ...common, action: "delete" }));

    expect(manual.status).toBe(200);
    expect(retry.status).toBe(200);
    expect(deleted.status).toBe(200);
    expect(updateOwnedBookImageManualText).toHaveBeenCalledOnce();
    expect(retryOwnedBookImageOcr).toHaveBeenCalledOnce();
    expect(deleteOwnedBookImage).toHaveBeenCalledOnce();
    expect((await deleted.json()).kind).toBe("deleted");
  });

  it("rejects caller identity fields and keeps foreign fixture responses private", async () => {
    const malformed = await POST(jsonRequest({ action: "delete", locale: "en", bookId, imageId, user_id: "foreign-user", idempotencyKey: "60000000-0000-4000-8000-000000000008" }));
    expect(malformed.status).toBe(400);
    expect((await malformed.json()).error.code).toBe("validation_error");
    expect(deleteOwnedBookImage).not.toHaveBeenCalled();

    process.env.BOOKGOLAS_ROUTE_TEST_MODE = "enabled";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54321";
    const foreign = await GET(new NextRequest(`http://localhost/api/consumer/images-ocr?bookId=${bookId}`, { headers: { Cookie: "bookgolas-route-fixture=images-ocr-foreign" } }));
    expect(foreign.status).toBe(404);
    expect(foreign.headers.get("cache-control")).toBe("private, no-store");
  });
});
