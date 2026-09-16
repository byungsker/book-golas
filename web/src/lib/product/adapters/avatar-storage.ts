import "server-only";

import { UserIdSchema } from "@/lib/product/contracts";
import {
  failure,
  success,
  validationError,
  type ProductResult,
} from "@/lib/product/dal/errors";
import {
  resolveProductSession,
  type ProductClientFactory,
  type ProductSession,
} from "@/lib/product/dal/context";
import { mapAdapterError } from "./errors";
import type { StorageUploadBody } from "./storage";

export const privateAvatarsBucket = "account-avatars";
export const avatarSignedUrlTtlSeconds = 15 * 60;

export type AvatarPathResult = Readonly<{
  bucket: typeof privateAvatarsBucket;
  path: string;
}>;

export type UploadedAvatar = AvatarPathResult &
  Readonly<{
    fullPath: string | null;
  }>;

export type SignedAvatarUrl = AvatarPathResult &
  Readonly<{
    signedUrl: string;
    expiresAt: string;
  }>;

export type AvatarUploadInput = Readonly<{
  body: StorageUploadBody;
  contentType: string;
}>;

const avatarExtensions = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

function safeAvatarFileName(value: string): boolean {
  return /^avatar\.(jpg|png|webp)$/.test(value);
}

function extensionFor(contentType: string): keyof typeof avatarExtensions | null {
  return Object.prototype.hasOwnProperty.call(avatarExtensions, contentType)
    ? contentType as keyof typeof avatarExtensions
    : null;
}

export function ownedAvatarPath(
  userId: string,
  contentType: string,
): ProductResult<AvatarPathResult> {
  const parsedUserId = UserIdSchema.safeParse(userId);
  const extension = extensionFor(contentType);
  if (!parsedUserId.success || !extension) {
    return failure(validationError("The avatar upload is invalid."));
  }

  return success({
    bucket: privateAvatarsBucket,
    path: `${parsedUserId.data}/avatar.${avatarExtensions[extension]}`,
  });
}

export function assertOwnedAvatarPath(
  userId: string,
  path: string,
): ProductResult<AvatarPathResult> {
  const parsedUserId = UserIdSchema.safeParse(userId);
  if (!parsedUserId.success || path.includes("\\") || path.includes("%2f") || path.includes("%2F")) {
    return failure(validationError("The avatar path is invalid."));
  }

  const segments = path.split("/");
  if (segments.length !== 2 || segments[0] !== parsedUserId.data || !safeAvatarFileName(segments[1])) {
    return failure({
      code: "forbidden",
      status: 403,
      message: "The storage object is outside the authenticated avatar scope.",
      retryable: false,
    });
  }

  return success({ bucket: privateAvatarsBucket, path });
}

export async function uploadOwnedAvatarForSession(
  session: ProductSession,
  input: AvatarUploadInput,
): Promise<ProductResult<UploadedAvatar>> {
  const path = ownedAvatarPath(session.userId, input.contentType);
  if (!path.ok) return failure(path.error);

  try {
    const { data, error } = await session.supabase.storage
      .from(privateAvatarsBucket)
      .upload(path.value.path, input.body, {
        cacheControl: "3600",
        contentType: input.contentType,
        upsert: true,
      });
    if (error) return failure(mapAdapterError(error));
    if (!data || data.path !== path.value.path) {
      return failure(validationError("The storage provider returned an unexpected avatar path."));
    }

    return success({
      bucket: privateAvatarsBucket,
      path: data.path,
      fullPath: typeof data.fullPath === "string" ? data.fullPath : null,
    });
  } catch (error) {
    return failure(mapAdapterError(error));
  }
}

export async function uploadOwnedAvatar(
  input: AvatarUploadInput,
  factory?: ProductClientFactory,
): Promise<ProductResult<UploadedAvatar>> {
  const session = await resolveProductSession(factory);
  if (!session.ok) return failure(session.error);
  return uploadOwnedAvatarForSession(session.value, input);
}

export async function getOwnedAvatarUrlForSession(
  session: ProductSession,
  path: string,
  now = Date.now,
  expiresIn = avatarSignedUrlTtlSeconds,
): Promise<ProductResult<SignedAvatarUrl>> {
  if (!Number.isInteger(expiresIn) || expiresIn < 60 || expiresIn > 86_400) {
    return failure(validationError("The avatar signed URL lifetime is invalid."));
  }
  const ownedPath = assertOwnedAvatarPath(session.userId, path);
  if (!ownedPath.ok) return failure(ownedPath.error);
  const nowMs = now();

  try {
    const { data, error } = await session.supabase.storage
      .from(privateAvatarsBucket)
      .createSignedUrl(ownedPath.value.path, expiresIn);
    if (error) return failure(mapAdapterError(error));
    if (!data || typeof data.signedUrl !== "string" || data.signedUrl.trim().length === 0) {
      return failure(validationError("The storage provider returned no avatar URL."));
    }
    try {
      new URL(data.signedUrl);
    } catch {
      return failure(validationError("The storage provider returned an invalid avatar URL."));
    }

    return success({
      bucket: privateAvatarsBucket,
      path: ownedPath.value.path,
      signedUrl: data.signedUrl,
      expiresAt: new Date(nowMs + expiresIn * 1_000).toISOString(),
    });
  } catch (error) {
    return failure(mapAdapterError(error));
  }
}

export async function getOwnedAvatarUrl(
  path: string,
  factory?: ProductClientFactory,
): Promise<ProductResult<SignedAvatarUrl>> {
  const session = await resolveProductSession(factory);
  if (!session.ok) return failure(session.error);
  return getOwnedAvatarUrlForSession(session.value, path);
}
