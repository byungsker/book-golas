import "server-only";

import {
  AccountProfileSchema,
  AccountProfileUpdateRequestSchema,
  AccountSettingsResponseSchema,
  type AccountProfile,
  type AccountProfileUpdateRequest,
  type AccountSettingsResponse,
} from "@/lib/product/contracts";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import {
  getOwnedAvatarUrlForSession,
  uploadOwnedAvatarForSession,
  type AvatarUploadInput,
} from "@/lib/product/adapters/avatar-storage";
import { resolveProductSession, type ProductClientFactory, type ProductSession } from "./context";
import {
  failure,
  mapDatabaseError,
  notFoundError,
  success,
  unavailableError,
  validationError,
  type ProductResult,
} from "./errors";

export const accountProfileColumns = "id,email,nickname,name,avatar_url,created_at,last_sign_in_at";

const privateAvatarPrefix = "storage://account-avatars/";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function safeUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

async function parseOwnedProfile(
  session: ProductSession,
  row: unknown,
): Promise<ProductResult<AccountProfile>> {
  if (!isRecord(row)) return failure(unavailableError("The account profile is malformed."));

  const rawAvatar = stringValue(row.avatar_url);
  let avatarUrl = safeUrl(rawAvatar);
  if (rawAvatar?.startsWith(privateAvatarPrefix)) {
    const signed = await getOwnedAvatarUrlForSession(session, rawAvatar.slice(privateAvatarPrefix.length));
    if (!signed.ok) return failure(signed.error);
    avatarUrl = signed.value.signedUrl;
  }

  const parsed = AccountProfileSchema.safeParse({
    id: row.id,
    email: row.email ?? null,
    nickname: row.nickname ?? null,
    name: row.name ?? null,
    avatarUrl,
    createdAt: row.created_at ?? null,
    lastSignInAt: row.last_sign_in_at ?? null,
  });
  return parsed.success
    ? success(parsed.data)
    : failure(unavailableError("The account profile is invalid."));
}

function responseForProfile(profile: AccountProfile): ProductResult<AccountSettingsResponse> {
  const response = AccountSettingsResponseSchema.safeParse({
    state: "ready",
    profile,
    subscription: { enabled: false, status: "free" },
  });
  return response.success
    ? success(response.data)
    : failure(unavailableError("The account settings response is invalid."));
}

export async function readOwnedAccountSettings(
  factory: ProductClientFactory = createServerSupabaseClient,
): Promise<ProductResult<AccountSettingsResponse>> {
  const session = await resolveProductSession(factory);
  if (!session.ok) return failure(session.error);

  try {
    const { data, error } = await session.value.supabase
      .from("users")
      .select(accountProfileColumns)
      .eq("id", session.value.userId)
      .maybeSingle();
    if (error) return failure(mapDatabaseError(error));
    if (!data) return failure(notFoundError());
    const profile = await parseOwnedProfile(session.value, data);
    if (!profile.ok) return failure(profile.error);
    return responseForProfile(profile.value);
  } catch (error) {
    return failure(mapDatabaseError(error));
  }
}

export async function updateOwnedAccountProfile(
  input: AccountProfileUpdateRequest,
  factory: ProductClientFactory = createServerSupabaseClient,
): Promise<ProductResult<AccountSettingsResponse>> {
  const parsedInput = AccountProfileUpdateRequestSchema.safeParse(input);
  if (!parsedInput.success) return failure(validationError("The account profile update is invalid."));

  const session = await resolveProductSession(factory);
  if (!session.ok) return failure(session.error);

  try {
    const { data, error } = await session.value.supabase
      .from("users")
      .update({ nickname: parsedInput.data.nickname })
      .eq("id", session.value.userId)
      .select(accountProfileColumns)
      .maybeSingle();
    if (error) return failure(mapDatabaseError(error));
    if (!data) return failure(notFoundError());
    const profile = await parseOwnedProfile(session.value, data);
    if (!profile.ok) return failure(profile.error);
    return responseForProfile(profile.value);
  } catch (error) {
    return failure(mapDatabaseError(error));
  }
}

export async function uploadOwnedAccountAvatar(
  input: AvatarUploadInput,
  factory: ProductClientFactory = createServerSupabaseClient,
): Promise<ProductResult<AccountSettingsResponse & { avatarPath: string }>> {
  const session = await resolveProductSession(factory);
  if (!session.ok) return failure(session.error);

  const uploaded = await uploadOwnedAvatarForSession(session.value, input);
  if (!uploaded.ok) return failure(uploaded.error);

  try {
    const storedReference = `${privateAvatarPrefix}${uploaded.value.path}`;
    const { data, error } = await session.value.supabase
      .from("users")
      .update({ avatar_url: storedReference })
      .eq("id", session.value.userId)
      .select(accountProfileColumns)
      .maybeSingle();
    if (error) return failure(mapDatabaseError(error));
    if (!data) return failure(notFoundError());
    const profile = await parseOwnedProfile(session.value, data);
    if (!profile.ok) return failure(profile.error);
    const response = responseForProfile(profile.value);
    return response.ok
      ? success({ ...response.value, avatarPath: uploaded.value.path })
      : failure(response.error);
  } catch (error) {
    return failure(mapDatabaseError(error));
  }
}
