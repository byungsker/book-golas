import { beforeEach, describe, expect, it, vi } from "vitest";
import { BookIdSchema, ImageIdSchema } from "@/lib/product/contracts";
import { providerError, success } from "./dal/errors";
import {
  deleteOwnedBookImages,
  getOwnedBookImageWithSignedUrl,
  retryOwnedBookImageOcr,
  updateOwnedBookImageManualText,
  uploadOwnedBookImage,
} from "./dal";
import {
  downloadOwnedBookImage,
  getBookImageUrl,
  listOwnedBookImagePaths,
  removeOwnedBookImagePaths,
  runVisionOcr,
  uploadBookImage,
} from "@/lib/product/adapters";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/product/adapters", () => ({
  downloadOwnedBookImage: vi.fn(),
  getBookImageUrl: vi.fn(),
  listOwnedBookImagePaths: vi.fn(),
  removeOwnedBookImagePaths: vi.fn(),
  runVisionOcr: vi.fn(),
  uploadBookImage: vi.fn(),
}));

const userId = "20000000-0000-4000-8000-000000000002";
const bookId = BookIdSchema.parse("30000000-0000-4000-8000-000000000003");
const imageId = ImageIdSchema.parse("50000000-0000-4000-8000-000000000005");
const idempotencyKey = "60000000-0000-4000-8000-000000000006";
const now = "2026-09-16T00:00:00.000Z";
const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);

function makeQuery(response: { data: unknown; error: unknown }) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    is: vi.fn(() => query),
    order: vi.fn(() => query),
    insert: vi.fn(() => query),
    update: vi.fn(() => query),
    delete: vi.fn(() => query),
    maybeSingle: vi.fn().mockResolvedValue(response),
    then: (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) => Promise.resolve(response).then(resolve, reject),
  };
  return query;
}

function imageRow(overrides: Record<string, unknown> = {}) {
  return {
    id: imageId,
    book_id: bookId,
    storage_bucket: "book-images",
    storage_path: `${userId}/${bookId}/${imageId}.png`,
    mime_type: "image/png",
    byte_size: png.byteLength,
    caption: "A page",
    page_number: 12,
    extracted_text: "",
    ocr_status: "pending",
    ocr_error: null,
    ocr_idempotency_key: null,
    request_idempotency_key: idempotencyKey,
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

function makeSupabase(queries: ReturnType<typeof makeQuery>[]) {
  const from = vi.fn().mockImplementation(() => queries.shift() ?? makeQuery({ data: null, error: null }));
  const supabase = {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: userId } }, error: null }) },
    from,
    storage: { from: vi.fn() },
  };
  return { supabase, from };
}

function factoryFor(supabase: unknown) {
  return () => Promise.resolve(supabase as never);
}

function uploadInput(overrides: Record<string, unknown> = {}) {
  return {
    action: "upload" as const,
    locale: "en" as const,
    bookId,
    pageNumber: 12,
    caption: "A page",
    ocrConsent: true,
    manualText: "",
    idempotencyKey,
    fileName: "page.png",
    mimeType: "image/png",
    bytes: png,
    ...overrides,
  };
}

function signed(path: string) {
  return {
    ok: true as const,
    value: {
      bucket: "book-images" as const,
      path,
      signedUrl: `https://storage.example.invalid/sign/${imageId}.png`,
      expiresAt: "2026-09-16T00:15:00.000Z",
    },
  };
}

function configureAdapters() {
  vi.mocked(getBookImageUrl).mockImplementation(async (_bookId, path) => signed(path));
  vi.mocked(uploadBookImage).mockImplementation(async ({ bookId: nextBookId, fileName }) => ({
    ok: true,
    value: { bucket: "book-images", path: `${userId}/${nextBookId}/${fileName}`, fullPath: null },
  }));
  vi.mocked(listOwnedBookImagePaths).mockResolvedValue(success([]));
  vi.mocked(removeOwnedBookImagePaths).mockImplementation(async (_bookId, paths) => success([...paths]));
  vi.mocked(downloadOwnedBookImage).mockResolvedValue(success({
    path: `${userId}/${bookId}/${imageId}.png`,
    bytes: png,
  }));
}

describe("private book image and OCR DAL", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    configureAdapters();
    vi.mocked(runVisionOcr).mockResolvedValue(success({ text: "OCR text", imageId, bookId }));
  });

  it("uploads to an owner-scoped path, saves metadata first and returns a signed URL", async () => {
    const setup = makeSupabase([
      makeQuery({ data: { id: bookId, total_pages: 240 }, error: null }),
      makeQuery({ data: null, error: null }),
      makeQuery({ data: imageRow(), error: null }),
      makeQuery({ data: imageRow({ ocr_status: "pending", ocr_idempotency_key: idempotencyKey }), error: null }),
      makeQuery({ data: imageRow({ ocr_status: "ready", extracted_text: "OCR text", ocr_idempotency_key: idempotencyKey }), error: null }),
    ]);

    const result = await uploadOwnedBookImage(uploadInput(), factoryFor(setup.supabase));

    expect(result).toMatchObject({ ok: true, value: { image: { storageBucket: "book-images", storagePath: expect.stringMatching(new RegExp(`^${userId}/${bookId}/`)), ocrStatus: "ready" }, duplicate: false, ocr: { status: "ready" } } });
    expect(uploadBookImage).toHaveBeenCalledWith(expect.objectContaining({ bookId, contentType: "image/png", body: expect.any(Blob) }), expect.any(Function));
    const inserted = setup.from.mock.results[2]?.value.insert;
    expect(inserted).toHaveBeenCalledWith(expect.objectContaining({ user_id: userId, image_url: null, storage_bucket: "book-images", storage_path: expect.stringMatching(new RegExp(`^${userId}/${bookId}/`)), ocr_status: "pending" }));
    expect(inserted.mock.invocationCallOrder[0]).toBeLessThan(vi.mocked(runVisionOcr).mock.invocationCallOrder[0]);
  });

  it("preserves the image when the OCR provider fails", async () => {
    vi.mocked(runVisionOcr).mockResolvedValue({ ok: false, error: providerError("OCR provider unavailable") });
    const setup = makeSupabase([
      makeQuery({ data: { id: bookId, total_pages: 240 }, error: null }),
      makeQuery({ data: null, error: null }),
      makeQuery({ data: imageRow(), error: null }),
      makeQuery({ data: imageRow({ ocr_status: "pending", ocr_idempotency_key: idempotencyKey }), error: null }),
      makeQuery({ data: imageRow({ ocr_status: "failed", ocr_error: "OCR provider unavailable", ocr_idempotency_key: idempotencyKey }), error: null }),
    ]);

    const result = await uploadOwnedBookImage(uploadInput(), factoryFor(setup.supabase));

    expect(result).toMatchObject({ ok: true, value: { image: { ocrStatus: "failed", ocrError: "OCR provider unavailable" }, ocr: { status: "failed", errorCode: "provider_error" } } });
    expect(removeOwnedBookImagePaths).not.toHaveBeenCalled();
  });

  it("updates manual text only for the owned image", async () => {
    const updatedRow = imageRow({ ocr_status: "manual", extracted_text: "Manual text", ocr_error: null });
    const setup = makeSupabase([
      makeQuery({ data: { id: bookId, total_pages: 240 }, error: null }),
      makeQuery({ data: imageRow({ ocr_status: "failed", ocr_error: "OCR provider unavailable" }), error: null }),
      makeQuery({ data: updatedRow, error: null }),
    ]);

    const result = await updateOwnedBookImageManualText({
      action: "manual",
      locale: "en",
      bookId,
      imageId,
      manualText: "Manual text",
      ocrConsent: false,
      idempotencyKey,
    }, factoryFor(setup.supabase));

    expect(result).toMatchObject({ ok: true, value: { image: { ocrStatus: "manual", extractedText: "Manual text" } } });
    expect(setup.from.mock.results[2]?.value.update).toHaveBeenCalledWith(expect.objectContaining({ extracted_text: "Manual text", ocr_status: "manual" }));
  });

  it("fails closed for a foreign book before storage or image access", async () => {
    const setup = makeSupabase([makeQuery({ data: null, error: null })]);

    const result = await uploadOwnedBookImage(uploadInput(), factoryFor(setup.supabase));

    expect(result).toMatchObject({ ok: false, error: { code: "not_found", status: 404 } });
    expect(uploadBookImage).not.toHaveBeenCalled();
    expect(setup.from).toHaveBeenCalledTimes(1);
  });

  it("returns a signed URL only after verifying the owned book and image", async () => {
    const setup = makeSupabase([
      makeQuery({ data: { id: bookId, total_pages: 240 }, error: null }),
      makeQuery({ data: imageRow(), error: null }),
    ]);

    const result = await getOwnedBookImageWithSignedUrl(bookId, imageId, factoryFor(setup.supabase));

    expect(result).toMatchObject({ ok: true, value: { id: imageId, bookId, signedUrl: `https://storage.example.invalid/sign/${imageId}.png` } });
    expect(getBookImageUrl).toHaveBeenCalledWith(bookId, `${userId}/${bookId}/${imageId}.png`, {}, expect.any(Function));
    expect(setup.from).toHaveBeenCalledTimes(2);
  });

  it("deletes database rows and both recorded and orphaned private objects", async () => {
    const orphanPath = `${userId}/${bookId}/orphan.png`;
    vi.mocked(listOwnedBookImagePaths).mockResolvedValue(success([orphanPath]));
    const setup = makeSupabase([
      makeQuery({ data: { id: bookId, total_pages: 240 }, error: null }),
      makeQuery({ data: [{ storage_path: `${userId}/${bookId}/${imageId}.png` }], error: null }),
      makeQuery({ data: null, error: null }),
    ]);

    const result = await deleteOwnedBookImages(bookId, factoryFor(setup.supabase));

    expect(result).toEqual({ ok: true, value: { deleted: true } });
    expect(removeOwnedBookImagePaths).toHaveBeenCalledWith(bookId, expect.arrayContaining([`${userId}/${bookId}/${imageId}.png`, orphanPath]), expect.any(Function));
    expect(setup.from.mock.results[2]?.value.delete).toHaveBeenCalled();
  });

  it("requires consent and downloads only the owned stored image for retry", async () => {
    const denied = await retryOwnedBookImageOcr({ action: "retry_ocr", locale: "en", bookId, imageId, ocrConsent: false, idempotencyKey });
    expect(denied).toMatchObject({ ok: false, error: { code: "consent_required", status: 403 } });

    const setup = makeSupabase([
      makeQuery({ data: { id: bookId, total_pages: 240 }, error: null }),
      makeQuery({ data: imageRow({ ocr_status: "failed", ocr_error: "OCR provider unavailable" }), error: null }),
      makeQuery({ data: imageRow({ ocr_status: "pending", ocr_idempotency_key: idempotencyKey }), error: null }),
      makeQuery({ data: imageRow({ ocr_status: "ready", extracted_text: "OCR text", ocr_idempotency_key: idempotencyKey }), error: null }),
    ]);
    const retried = await retryOwnedBookImageOcr({ action: "retry_ocr", locale: "en", bookId, imageId, ocrConsent: true, idempotencyKey }, factoryFor(setup.supabase));

    expect(retried).toMatchObject({ ok: true, value: { image: { ocrStatus: "ready" } } });
    expect(downloadOwnedBookImage).toHaveBeenCalledWith(bookId, `${userId}/${bookId}/${imageId}.png`, expect.any(Function));
  });
});
