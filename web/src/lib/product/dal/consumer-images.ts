import "server-only";

import {
  BookIdSchema,
  BookImageSchema,
  ImagesOcrJsonMutationSchema,
  ImagesOcrUploadMetadataSchema,
  ImageIdSchema,
  imageExtension,
  validateBookImageBytes,
  type BookImage,
  type BookImageOcrStatus,
  type ImagesOcrJsonMutation,
  type ImagesOcrUploadMetadata,
} from "@/lib/product/contracts";
import {
  downloadOwnedBookImage,
  getBookImageUrl,
  listOwnedBookImagePaths,
  removeOwnedBookImagePaths,
  runVisionOcr,
  uploadBookImage,
} from "@/lib/product/adapters";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { resolveProductSession, type ProductClientFactory, type ProductSession } from "./context";
import {
  failure,
  mapDatabaseError,
  notFoundError,
  payloadTooLargeError,
  providerError,
  success,
  unavailableError,
  validationError,
  consentRequiredError,
  type ProductError,
  type ProductResult,
} from "./errors";

const imageColumns = "id,book_id,storage_bucket,storage_path,mime_type,byte_size,caption,page_number,extracted_text,ocr_status,ocr_error,created_at,updated_at";

type StorageBookImageRow = Record<string, unknown>;

export type UploadOwnedBookImageInput = ImagesOcrUploadMetadata & Readonly<{
  fileName: string;
  mimeType: string;
  bytes: Uint8Array;
}>;

type ImageMutationResult = Readonly<{
  image: BookImage;
  duplicate: boolean;
  ocr: {
    status: BookImageOcrStatus;
    errorCode: ProductError["code"] | null;
    message: string | null;
  };
}>;

function isRecord(value: unknown): value is StorageBookImageRow {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sessionFactory(session: ProductSession): ProductClientFactory {
  return () => Promise.resolve(session.supabase);
}

async function ownedBook(session: ProductSession, bookId: string): Promise<ProductResult<{ totalPages: number }>> {
  const { data, error } = await session.supabase
    .from("books")
    .select("id,total_pages")
    .eq("id", bookId)
    .eq("user_id", session.userId)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) return failure(mapDatabaseError(error));
  if (!isRecord(data) || typeof data.total_pages !== "number") return failure(notFoundError());
  return success({ totalPages: data.total_pages });
}

function validatePage(pageNumber: number | null, totalPages: number): ProductResult<true> {
  if (pageNumber !== null && pageNumber > totalPages) return failure(validationError("The page number is outside the book."));
  return success(true);
}

function rowPath(row: StorageBookImageRow): string | null {
  return typeof row.storage_path === "string" && row.storage_path.trim().length > 0 ? row.storage_path : null;
}

function rowMimeType(row: StorageBookImageRow): string | null {
  return typeof row.mime_type === "string" ? row.mime_type : null;
}

function rowHasPrivateStorage(row: StorageBookImageRow): boolean {
  return row.storage_bucket === "book-images" && rowPath(row) !== null && rowMimeType(row) !== null && typeof row.byte_size === "number";
}

function outcome(status: BookImageOcrStatus, errorCode: ProductError["code"] | null = null, message: string | null = null) {
  return { status, errorCode, message };
}

function ocrErrorCode(message: string | null): ProductError["code"] | null {
  if (!message) return null;
  if (/consent/i.test(message)) return "consent_required";
  if (/quota|limit/i.test(message)) return "quota_exceeded";
  return "provider_error";
}

function parseImageRow(row: unknown, signedUrl: { signedUrl: string; expiresAt: string }): ProductResult<BookImage> {
  if (!isRecord(row)) return failure(unavailableError("Book image metadata is malformed."));
  const parsed = BookImageSchema.safeParse({
    id: row.id,
    bookId: row.book_id,
    storageBucket: row.storage_bucket,
    storagePath: row.storage_path,
    signedUrl: signedUrl.signedUrl,
    signedUrlExpiresAt: signedUrl.expiresAt,
    mimeType: row.mime_type,
    byteSize: row.byte_size,
    caption: row.caption ?? null,
    pageNumber: row.page_number ?? null,
    extractedText: row.extracted_text ?? "",
    ocrStatus: row.ocr_status,
    ocrError: row.ocr_error ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? row.created_at,
  });
  return parsed.success ? success(parsed.data) : failure(unavailableError("Book image metadata is malformed."));
}

async function signedImage(
  session: ProductSession,
  bookId: string,
  row: StorageBookImageRow,
): Promise<ProductResult<BookImage>> {
  const path = rowPath(row);
  if (!path || !rowHasPrivateStorage(row)) return failure(unavailableError("Book image storage metadata is unavailable."));
  const signed = await getBookImageUrl(bookId, path, {}, sessionFactory(session));
  if (!signed.ok) return failure(signed.error);
  return parseImageRow(row, { signedUrl: signed.value.signedUrl, expiresAt: signed.value.expiresAt });
}

async function fetchOwnedImage(
  session: ProductSession,
  bookId: string,
  imageId: string,
): Promise<ProductResult<{ row: StorageBookImageRow; image: BookImage }>> {
  const { data, error } = await session.supabase
    .from("book_images")
    .select(imageColumns)
    .eq("id", imageId)
    .eq("book_id", bookId)
    .eq("user_id", session.userId)
    .maybeSingle();
  if (error) return failure(mapDatabaseError(error));
  if (!isRecord(data)) return failure(notFoundError());
  const image = await signedImage(session, bookId, data);
  return image.ok ? success({ row: data, image: image.value }) : failure(image.error);
}

async function updateOcrState(
  session: ProductSession,
  imageId: string,
  updates: Record<string, unknown>,
): Promise<ProductResult<StorageBookImageRow>> {
  const { data, error } = await session.supabase
    .from("book_images")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", imageId)
    .eq("user_id", session.userId)
    .select(imageColumns)
    .maybeSingle();
  if (error) return failure(mapDatabaseError(error));
  if (!isRecord(data)) return failure(notFoundError());
  return success(data);
}

async function applyOcr(
  session: ProductSession,
  image: BookImage,
  bytes: Uint8Array,
  idempotencyKey: string,
): Promise<ProductResult<ImageMutationResult>> {
  const pending = await updateOcrState(session, image.id, {
    ocr_status: "pending",
    ocr_error: null,
    ocr_idempotency_key: idempotencyKey,
  });
  if (!pending.ok) return failure(pending.error);

  const result = await runVisionOcr(
    {
      bookId: image.bookId,
      imageId: image.id,
      imageBase64: Buffer.from(bytes).toString("base64"),
    },
    { factory: sessionFactory(session) },
  );
  const failed = !result.ok || result.value.text.trim().length === 0;
  const finalStatus: BookImageOcrStatus = failed ? "failed" : "ready";
  const finalError = failed
    ? result.ok
      ? providerError("OCR did not detect readable text.")
      : result.error
    : null;
  const updated = await updateOcrState(session, image.id, {
    extracted_text: result.ok ? result.value.text : image.extractedText,
    ocr_status: finalStatus,
    ocr_error: finalError?.message ?? null,
    ocr_idempotency_key: idempotencyKey,
  });
  const candidate = updated.ok ? await signedImage(session, image.bookId, updated.value) : success(image);
  if (!candidate.ok) return failure(candidate.error);
  return success({
    image: candidate.value,
    duplicate: false,
    ocr: outcome(finalStatus, finalError?.code ?? null, finalError?.message ?? null),
  });
}

export async function listOwnedBookImagesWithSignedUrls(
  bookId: string,
  factory: ProductClientFactory = createServerSupabaseClient,
): Promise<ProductResult<BookImage[]>> {
  const parsedBookId = BookIdSchema.safeParse(bookId);
  if (!parsedBookId.success) return failure(validationError());
  const session = await resolveProductSession(factory);
  if (!session.ok) return failure(session.error);
  const book = await ownedBook(session.value, parsedBookId.data);
  if (!book.ok) return failure(book.error);
  try {
    const { data, error } = await session.value.supabase
      .from("book_images")
      .select(imageColumns)
      .eq("book_id", parsedBookId.data)
      .eq("user_id", session.value.userId)
      .order("created_at", { ascending: false });
    if (error) return failure(mapDatabaseError(error));
    const images: BookImage[] = [];
    for (const row of Array.isArray(data) ? data : []) {
      if (!isRecord(row) || !rowHasPrivateStorage(row)) continue;
      const signed = await signedImage(session.value, parsedBookId.data, row);
      if (!signed.ok) return failure(signed.error);
      images.push(signed.value);
    }
    return success(images);
  } catch (error) {
    return failure(mapDatabaseError(error));
  }
}

export async function getOwnedBookImageWithSignedUrl(
  bookId: string,
  imageId: string,
  factory: ProductClientFactory = createServerSupabaseClient,
): Promise<ProductResult<BookImage>> {
  const parsedBookId = BookIdSchema.safeParse(bookId);
  const parsedImageId = ImageIdSchema.safeParse(imageId);
  if (!parsedBookId.success || !parsedImageId.success) return failure(validationError());
  const session = await resolveProductSession(factory);
  if (!session.ok) return failure(session.error);
  const book = await ownedBook(session.value, parsedBookId.data);
  if (!book.ok) return failure(book.error);
  const image = await fetchOwnedImage(session.value, parsedBookId.data, parsedImageId.data);
  return image.ok ? success(image.value.image) : failure(image.error);
}

export async function uploadOwnedBookImage(
  input: UploadOwnedBookImageInput,
  factory: ProductClientFactory = createServerSupabaseClient,
): Promise<ProductResult<ImageMutationResult>> {
  const parsed = ImagesOcrUploadMetadataSchema.safeParse({
    action: input.action,
    locale: input.locale,
    bookId: input.bookId,
    pageNumber: input.pageNumber,
    caption: input.caption,
    ocrConsent: input.ocrConsent,
    manualText: input.manualText,
    idempotencyKey: input.idempotencyKey,
  });
  if (!parsed.success) return failure(validationError());
  const validation = validateBookImageBytes({ mimeType: input.mimeType, byteLength: input.bytes.byteLength, bytes: input.bytes });
  if (!validation.ok) {
    return failure(validation.reason === "oversize" ? payloadTooLargeError("Images must be 8 MiB or smaller.") : validationError("The image file is invalid."));
  }
  const session = await resolveProductSession(factory);
  if (!session.ok) return failure(session.error);
  const book = await ownedBook(session.value, parsed.data.bookId);
  if (!book.ok) return failure(book.error);
  const page = validatePage(parsed.data.pageNumber, book.value.totalPages);
  if (!page.ok) return failure(page.error);

  const existing = await session.value.supabase
    .from("book_images")
    .select(imageColumns)
    .eq("book_id", parsed.data.bookId)
    .eq("user_id", session.value.userId)
    .eq("request_idempotency_key", parsed.data.idempotencyKey)
    .maybeSingle();
  if (existing.error) return failure(mapDatabaseError(existing.error));
  if (isRecord(existing.data)) {
    const image = await signedImage(session.value, parsed.data.bookId, existing.data);
    if (!image.ok) return failure(image.error);
    return success({
      image: image.value,
      duplicate: true,
      ocr: outcome(
        image.value.ocrStatus,
        image.value.ocrStatus === "failed" ? ocrErrorCode(image.value.ocrError) : null,
        image.value.ocrError,
      ),
    });
  }

  const imageId = ImageIdSchema.parse(crypto.randomUUID());
  const fileName = `${imageId}.${imageExtension(validation.mimeType)}`;
  const uploaded = await uploadBookImage({
    bookId: parsed.data.bookId,
    fileName,
    body: new Blob([new Uint8Array(input.bytes)], { type: validation.mimeType }),
    contentType: validation.mimeType,
  }, sessionFactory(session.value));
  if (!uploaded.ok) return failure(uploaded.error);

  const now = new Date().toISOString();
  const initialStatus: BookImageOcrStatus = parsed.data.manualText.trim().length > 0
    ? "manual"
    : parsed.data.ocrConsent ? "pending" : "not_requested";
  const { data: created, error } = await session.value.supabase
    .from("book_images")
    .insert({
      id: imageId,
      book_id: parsed.data.bookId,
      user_id: session.value.userId,
      image_url: null,
      storage_bucket: uploaded.value.bucket,
      storage_path: uploaded.value.path,
      mime_type: validation.mimeType,
      byte_size: input.bytes.byteLength,
      caption: parsed.data.caption,
      page_number: parsed.data.pageNumber,
      extracted_text: parsed.data.manualText,
      ocr_status: initialStatus,
      ocr_error: null,
      request_idempotency_key: parsed.data.idempotencyKey,
      ocr_idempotency_key: parsed.data.ocrConsent ? parsed.data.idempotencyKey : null,
      created_at: now,
      updated_at: now,
    })
    .select(imageColumns)
    .maybeSingle();
  if (error || !isRecord(created)) {
    await removeOwnedBookImagePaths(parsed.data.bookId, [uploaded.value.path], sessionFactory(session.value));
    return failure(error ? mapDatabaseError(error) : unavailableError("The image record was not saved."));
  }

  const saved = await signedImage(session.value, parsed.data.bookId, created);
  if (!saved.ok) return failure(saved.error);
  if (!parsed.data.ocrConsent || parsed.data.manualText.trim().length > 0) {
    return success({ image: saved.value, duplicate: false, ocr: outcome(initialStatus) });
  }
  return applyOcr(session.value, saved.value, input.bytes, parsed.data.idempotencyKey);
}

export async function updateOwnedBookImageManualText(
  input: ImagesOcrJsonMutation,
  factory: ProductClientFactory = createServerSupabaseClient,
): Promise<ProductResult<ImageMutationResult>> {
  const parsed = ImagesOcrJsonMutationSchema.safeParse(input);
  if (!parsed.success || parsed.data.action !== "manual" || parsed.data.manualText === undefined) return failure(validationError());
  const session = await resolveProductSession(factory);
  if (!session.ok) return failure(session.error);
  const book = await ownedBook(session.value, parsed.data.bookId);
  if (!book.ok) return failure(book.error);
  const current = await fetchOwnedImage(session.value, parsed.data.bookId, parsed.data.imageId);
  if (!current.ok) return failure(current.error);
  const updated = await updateOcrState(session.value, parsed.data.imageId, {
    extracted_text: parsed.data.manualText,
    ocr_status: "manual",
    ocr_error: null,
    ocr_idempotency_key: parsed.data.idempotencyKey,
  });
  if (!updated.ok) return failure(updated.error);
  const image = await signedImage(session.value, parsed.data.bookId, updated.value);
  if (!image.ok) return failure(image.error);
  return success({ image: image.value, duplicate: false, ocr: outcome("manual") });
}

export async function retryOwnedBookImageOcr(
  input: ImagesOcrJsonMutation,
  factory: ProductClientFactory = createServerSupabaseClient,
): Promise<ProductResult<ImageMutationResult>> {
  const parsed = ImagesOcrJsonMutationSchema.safeParse(input);
  if (!parsed.success || parsed.data.action !== "retry_ocr") return failure(validationError());
  if (!parsed.data.ocrConsent) return failure(consentRequiredError("OCR consent is required before retrying."));
  const session = await resolveProductSession(factory);
  if (!session.ok) return failure(session.error);
  const book = await ownedBook(session.value, parsed.data.bookId);
  if (!book.ok) return failure(book.error);
  const current = await fetchOwnedImage(session.value, parsed.data.bookId, parsed.data.imageId);
  if (!current.ok) return failure(current.error);
  if (current.value.image.ocrStatus === "ready") return success({ image: current.value.image, duplicate: true, ocr: outcome("ready") });
  if (current.value.row.ocr_idempotency_key === parsed.data.idempotencyKey) {
    return success({ image: current.value.image, duplicate: true, ocr: outcome(current.value.image.ocrStatus, current.value.image.ocrStatus === "failed" ? "provider_error" : null, current.value.image.ocrError) });
  }
  const downloaded = await downloadOwnedBookImage(parsed.data.bookId, rowPath(current.value.row) ?? "", sessionFactory(session.value));
  if (!downloaded.ok) return failure(downloaded.error);
  const validation = validateBookImageBytes({
    mimeType: rowMimeType(current.value.row) ?? "",
    byteLength: downloaded.value.bytes.byteLength,
    bytes: downloaded.value.bytes,
  });
  if (!validation.ok) return failure(validation.reason === "oversize" ? payloadTooLargeError("The stored image is too large.") : validationError("The stored image is invalid."));
  return applyOcr(session.value, current.value.image, downloaded.value.bytes, parsed.data.idempotencyKey);
}

export async function deleteOwnedBookImage(
  input: ImagesOcrJsonMutation,
  factory: ProductClientFactory = createServerSupabaseClient,
): Promise<ProductResult<{ imageId: string }>> {
  const parsed = ImagesOcrJsonMutationSchema.safeParse(input);
  if (!parsed.success || parsed.data.action !== "delete") return failure(validationError());
  const session = await resolveProductSession(factory);
  if (!session.ok) return failure(session.error);
  const book = await ownedBook(session.value, parsed.data.bookId);
  if (!book.ok) return failure(book.error);
  const current = await fetchOwnedImage(session.value, parsed.data.bookId, parsed.data.imageId);
  if (!current.ok) return failure(current.error);
  const path = rowPath(current.value.row);
  if (path) {
    const removed = await removeOwnedBookImagePaths(parsed.data.bookId, [path], sessionFactory(session.value));
    if (!removed.ok) return failure(removed.error);
  }
  const { data, error } = await session.value.supabase
    .from("book_images")
    .delete()
    .eq("id", parsed.data.imageId)
    .eq("book_id", parsed.data.bookId)
    .eq("user_id", session.value.userId)
    .select("id")
    .maybeSingle();
  if (error) return failure(mapDatabaseError(error));
  if (!isRecord(data) || typeof data.id !== "string") return failure(notFoundError());
  return success({ imageId: data.id });
}

export async function deleteOwnedBookImages(
  bookId: string,
  factory: ProductClientFactory = createServerSupabaseClient,
): Promise<ProductResult<{ deleted: true }>> {
  const parsedBookId = BookIdSchema.safeParse(bookId);
  if (!parsedBookId.success) return failure(notFoundError());
  const session = await resolveProductSession(factory);
  if (!session.ok) return failure(session.error);
  const book = await ownedBook(session.value, parsedBookId.data);
  if (!book.ok) return failure(book.error);
  const storage = (session.value.supabase as unknown as { storage?: { from?: unknown } }).storage;
  if (storage && typeof storage.from === "function") {
    const { data, error } = await session.value.supabase
      .from("book_images")
      .select("storage_path")
      .eq("book_id", parsedBookId.data)
      .eq("user_id", session.value.userId);
    if (error) return failure(mapDatabaseError(error));
    const rowPaths = (Array.isArray(data) ? data : [])
      .filter(isRecord)
      .map(rowPath)
      .filter((path): path is string => path !== null);
    const listed = await listOwnedBookImagePaths(parsedBookId.data, sessionFactory(session.value));
    if (!listed.ok) return failure(listed.error);
    const removed = await removeOwnedBookImagePaths(parsedBookId.data, [...new Set([...rowPaths, ...listed.value])], sessionFactory(session.value));
    if (!removed.ok) return failure(removed.error);
  }
  const { error } = await session.value.supabase
    .from("book_images")
    .delete()
    .eq("book_id", parsedBookId.data)
    .eq("user_id", session.value.userId);
  if (error) return failure(mapDatabaseError(error));
  return success({ deleted: true });
}
