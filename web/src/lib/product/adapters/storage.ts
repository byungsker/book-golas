import "server-only";

import { BookIdSchema, isPrivateBookImagePath } from "@/lib/product/contracts";
import {
  failure,
  success,
  validationError,
  type ProductResult,
} from "@/lib/product/dal/errors";
import {
  resolveProductSession,
  type ProductClientFactory,
  type ProductSupabaseClient,
} from "@/lib/product/dal/context";
import { mapAdapterError } from "./errors";

export const privateBookImagesBucket = "book-images";
export const defaultSignedUrlTtlSeconds = 15 * 60;
export const signedUrlRefreshSkewSeconds = 30;

export type StorageUploadBody = Parameters<
  ReturnType<ProductSupabaseClient["storage"]["from"]>["upload"]
>[1];

export type BookImagePathResult = Readonly<{
  bucket: typeof privateBookImagesBucket;
  path: string;
}>;

export type UploadedBookImage = BookImagePathResult &
  Readonly<{
    fullPath: string | null;
  }>;

export type SignedBookImageUrl = BookImagePathResult &
  Readonly<{
    signedUrl: string;
    expiresAt: string;
  }>;

export type SignedUrlCache = Map<string, SignedBookImageUrl>;

export type PrivateBookImageBytes = Readonly<{
  path: string;
  bytes: Uint8Array;
}>;

const defaultSignedUrlCache: SignedUrlCache = new Map();

function safeFileName(fileName: string): boolean {
  return (
    fileName.length > 0 &&
    fileName.length <= 128 &&
    /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(fileName) &&
    !fileName.includes("..")
  );
}

function validatePathSegments(
  userId: string,
  bookId: string,
  path: string,
): ProductResult<BookImagePathResult> {
  if (path.includes("\\") || path.includes("%2f") || path.includes("%2F")) {
    return failure(validationError("The storage path is invalid."));
  }

  const segments = path.split("/");
  if (segments.length !== 3 || !safeFileName(segments[2])) {
    return failure(validationError("The storage path is invalid."));
  }
  if (segments[0] !== userId || segments[1] !== bookId) {
    return failure({
      code: "forbidden",
      status: 403,
      message: "The storage object is outside the authenticated book scope.",
      retryable: false,
    });
  }

  return success({ bucket: privateBookImagesBucket, path });
}

export function ownedBookImagePath(
  userId: string,
  bookId: string,
  fileName: string,
): ProductResult<BookImagePathResult> {
  if (!BookIdSchema.safeParse(bookId).success || !safeFileName(fileName)) {
    return failure(validationError("The book image path is invalid."));
  }
  return success({
    bucket: privateBookImagesBucket,
    path: `${userId}/${bookId}/${fileName}`,
  });
}

export function assertOwnedBookImagePath(
  userId: string,
  bookId: string,
  path: string,
): ProductResult<BookImagePathResult> {
  if (!BookIdSchema.safeParse(bookId).success) {
    return failure(validationError("The book image path is invalid."));
  }
  return validatePathSegments(userId, bookId, path);
}

function validTtl(expiresIn: number): boolean {
  return Number.isInteger(expiresIn) && expiresIn >= 60 && expiresIn <= 86_400;
}

export type UploadBookImageInput = Readonly<{
  bookId: string;
  fileName: string;
  body: StorageUploadBody;
  contentType: string;
  upsert?: boolean;
}>;

export async function uploadBookImage(
  input: UploadBookImageInput,
  factory?: ProductClientFactory,
): Promise<ProductResult<UploadedBookImage>> {
  const bookId = BookIdSchema.safeParse(input.bookId);
  if (!bookId.success || !safeFileName(input.fileName) || !/^[-\w.+]+\/[\w.+-]+$/.test(input.contentType)) {
    return failure(validationError("The book image upload is invalid."));
  }

  const session = await resolveProductSession(factory);
  if (!session.ok) return failure(session.error);
  const path = ownedBookImagePath(session.value.userId, bookId.data, input.fileName);
  if (!path.ok) return failure(path.error);

  try {
    const { data, error } = await session.value.supabase.storage
      .from(privateBookImagesBucket)
      .upload(path.value.path, input.body, {
        cacheControl: "31536000",
        contentType: input.contentType,
        upsert: input.upsert ?? false,
    });
    if (error) return failure(mapAdapterError(error));
    if (!data) return failure(validationError("The storage upload returned no object."));
    if (data.path !== path.value.path) {
      return failure(validationError("The storage provider returned an unexpected object path."));
    }

    return success({
      bucket: privateBookImagesBucket,
      path: data.path,
      fullPath: typeof data.fullPath === "string" ? data.fullPath : null,
    });
  } catch (error) {
    return failure(mapAdapterError(error));
  }
}

export type SignedBookImageOptions = Readonly<{
  expiresIn?: number;
  now?: () => number;
  cache?: SignedUrlCache;
}>;

export async function getBookImageUrl(
  bookId: string,
  path: string,
  options: SignedBookImageOptions = {},
  factory?: ProductClientFactory,
): Promise<ProductResult<SignedBookImageUrl>> {
  const parsedBookId = BookIdSchema.safeParse(bookId);
  if (!parsedBookId.success) return failure(validationError("The book image path is invalid."));
  const expiresIn = options.expiresIn ?? defaultSignedUrlTtlSeconds;
  if (!validTtl(expiresIn)) return failure(validationError("The signed URL lifetime is invalid."));

  const session = await resolveProductSession(factory);
  if (!session.ok) return failure(session.error);
  const ownedPath = assertOwnedBookImagePath(session.value.userId, parsedBookId.data, path);
  if (!ownedPath.ok) return failure(ownedPath.error);

  const now = options.now ?? Date.now;
  const nowMs = now();
  const cache = options.cache ?? defaultSignedUrlCache;
  const cacheKey = `${session.value.userId}:${ownedPath.value.path}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.parse(cached.expiresAt) > nowMs + signedUrlRefreshSkewSeconds * 1_000) {
    return success(cached);
  }

  try {
    const { data, error } = await session.value.supabase.storage
      .from(privateBookImagesBucket)
      .createSignedUrl(ownedPath.value.path, expiresIn);
    if (error) return failure(mapAdapterError(error));
    if (!data || typeof data.signedUrl !== "string" || data.signedUrl.trim().length === 0) {
      return failure(validationError("The storage provider returned no signed URL."));
    }
    try {
      new URL(data.signedUrl);
    } catch {
      return failure(validationError("The storage provider returned an invalid signed URL."));
    }

    const result: SignedBookImageUrl = {
      bucket: privateBookImagesBucket,
      path: ownedPath.value.path,
      signedUrl: data.signedUrl,
      expiresAt: new Date(nowMs + expiresIn * 1_000).toISOString(),
    };
    cache.set(cacheKey, result);
    return success(result);
  } catch (error) {
    return failure(mapAdapterError(error));
  }
}

export async function listOwnedBookImagePaths(
  bookId: string,
  factory?: ProductClientFactory,
): Promise<ProductResult<string[]>> {
  const parsedBookId = BookIdSchema.safeParse(bookId);
  if (!parsedBookId.success) return failure(validationError("The book image path is invalid."));
  const session = await resolveProductSession(factory);
  if (!session.ok) return failure(session.error);

  const prefix = `${session.value.userId}/${parsedBookId.data}`;
  const paths: string[] = [];
  try {
    for (let offset = 0; ; offset += 100) {
      const { data, error } = await session.value.supabase.storage
        .from(privateBookImagesBucket)
        .list(prefix, { limit: 100, offset, sortBy: { column: "name", order: "asc" } });
      if (error) return failure(mapAdapterError(error));
      const entries = Array.isArray(data) ? data : [];
      for (const entry of entries) {
        if (!entry || typeof entry.name !== "string" || entry.id === null) continue;
        const candidate = `${prefix}/${entry.name}`;
        if (isPrivateBookImagePath(candidate, session.value.userId, parsedBookId.data)) paths.push(candidate);
      }
      if (entries.length < 100) break;
    }
    return success([...new Set(paths)]);
  } catch (error) {
    return failure(mapAdapterError(error));
  }
}

export async function removeOwnedBookImagePaths(
  bookId: string,
  paths: readonly string[],
  factory?: ProductClientFactory,
): Promise<ProductResult<string[]>> {
  const parsedBookId = BookIdSchema.safeParse(bookId);
  if (!parsedBookId.success) return failure(validationError("The book image path is invalid."));
  const session = await resolveProductSession(factory);
  if (!session.ok) return failure(session.error);

  const requestedPaths = [...new Set(paths)];
  if (requestedPaths.some((path) => !isPrivateBookImagePath(path, session.value.userId, parsedBookId.data))) return failure({
    code: "forbidden",
    status: 403,
    message: "The storage object is outside the authenticated book scope.",
    retryable: false,
  });

  try {
    for (let index = 0; index < requestedPaths.length; index += 100) {
      const { error } = await session.value.supabase.storage
        .from(privateBookImagesBucket)
      .remove(requestedPaths.slice(index, index + 100));
      if (error) return failure(mapAdapterError(error));
    }
    return success(requestedPaths);
  } catch (error) {
    return failure(mapAdapterError(error));
  }
}

export async function downloadOwnedBookImage(
  bookId: string,
  path: string,
  factory?: ProductClientFactory,
): Promise<ProductResult<PrivateBookImageBytes>> {
  const parsedBookId = BookIdSchema.safeParse(bookId);
  if (!parsedBookId.success) return failure(validationError("The book image path is invalid."));
  const session = await resolveProductSession(factory);
  if (!session.ok) return failure(session.error);
  const ownedPath = assertOwnedBookImagePath(session.value.userId, parsedBookId.data, path);
  if (!ownedPath.ok) return failure(ownedPath.error);

  try {
    const { data, error } = await session.value.supabase.storage
      .from(privateBookImagesBucket)
      .download(ownedPath.value.path);
    if (error) return failure(mapAdapterError(error));
    if (!data || typeof data.arrayBuffer !== "function") return failure(validationError("The storage provider returned no image bytes."));
    return success({ path: ownedPath.value.path, bytes: new Uint8Array(await data.arrayBuffer()) });
  } catch (error) {
    return failure(mapAdapterError(error));
  }
}

export const refreshBookImageUrl = getBookImageUrl;
export const uploadPrivateBookImage = uploadBookImage;
export const listPrivateBookImagePaths = listOwnedBookImagePaths;
export const removePrivateBookImagePaths = removeOwnedBookImagePaths;
export const downloadPrivateBookImage = downloadOwnedBookImage;
