import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  ContractError,
  createServiceClient,
  enforceFunctionRateLimit,
  jsonResponse,
  methodGuard,
  optionsResponse,
  parseJsonBody,
  requireUser,
  responseForError,
} from "../_shared/consumer-contract.ts";

function extractStoragePath(value: unknown, bucket: string): string | null {
  if (typeof value !== "string" || value.length === 0) return null;
  const marker = new RegExp(`/storage/v1/object/(?:public|sign|authenticated)/${bucket}/`);
  const match = marker.exec(value);
  if (match) return value.slice(match.index + match[0].length).split(/[?#]/, 1)[0] || null;
  if (/^https?:\/\//i.test(value) || value.startsWith("/")) return null;
  return value.split(/[?#]/, 1)[0] || null;
}

function safeStoragePath(value: unknown, userId: string, bookId: string | null, imageUserId: string | null): string | null {
  const path = extractStoragePath(value, "book-images");
  if (!path || path.includes("..") || path.includes("\\") || path.startsWith("/")) return null;
  if (imageUserId !== null && imageUserId !== userId) return null;
  const segments = path.split("/");
  const firstSegment = segments[0];
  if (firstSegment === userId && (bookId === null || segments[1] === bookId)) return path;
  if (bookId !== null && firstSegment === bookId) return path;
  if (
    bookId !== null
    && (imageUserId === null || imageUserId === userId)
    && firstSegment === "book_images"
    && (segments[1] === bookId || new RegExp(`^\\d+_${bookId}\\.[A-Za-z0-9]+$`).test(segments[1] ?? ""))
  ) return path;
  if (
    bookId !== null
    && (imageUserId === null || imageUserId === userId)
    && firstSegment === "legacy"
    && (segments[1] === bookId || new RegExp(`^\\d+_${bookId}\\.[A-Za-z0-9]+$`).test(segments[1] ?? ""))
  ) return path;
  return null;
}

function safeAvatarPath(value: unknown, userId: string): string | null {
  const path = extractStoragePath(value, "avatars");
  if (!path || path.includes("..") || path.includes("\\") || path.startsWith("/")) return null;
  return path.split("/")[0] === userId ? path : null;
}

type StorageListEntry = {
  name?: unknown;
  id?: unknown;
  metadata?: unknown;
};

type StorageObjectEntry = {
  name?: unknown;
  owner?: unknown;
  owner_id?: unknown;
};

type DeletionOperationStatus = "started" | "data_deleted" | "completed";

function bearerToken(req: Request): string | null {
  const match = /^Bearer\s+(\S+)$/i.exec(req.headers.get("Authorization") ?? "");
  return match?.[1] ?? null;
}

async function tokenHash(token: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function findDeletionOperation(
  serviceClient: ReturnType<typeof createServiceClient>,
  filter: "token_hash" | "user_id",
  value: string,
): Promise<{ userId: string; status: DeletionOperationStatus; acceptedAt: string } | null> {
  const { data, error } = await serviceClient
    .from("account_deletion_operations")
    .select("user_id, status, updated_at, completed_at")
    .eq(filter, value)
    .maybeSingle();
  if (error) throw new ContractError(503, "unavailable", "Account deletion is unavailable");
  if (!data || (data.status !== "started" && data.status !== "data_deleted" && data.status !== "completed")) return null;
  const acceptedAt = data.completed_at ?? data.updated_at;
  if (typeof acceptedAt !== "string") throw new ContractError(503, "unavailable", "Account deletion is unavailable");
  if (typeof data.user_id !== "string") throw new ContractError(503, "unavailable", "Account deletion is unavailable");
  return { userId: data.user_id, status: data.status, acceptedAt };
}

async function markDeletionCompleted(
  serviceClient: ReturnType<typeof createServiceClient>,
  userId: string,
): Promise<string> {
  const completedAt = new Date().toISOString();
  const { error } = await serviceClient
    .from("account_deletion_operations")
    .update({ status: "completed", updated_at: completedAt, completed_at: completedAt })
    .eq("user_id", userId);
  if (error) throw new ContractError(503, "unavailable", "Account deletion is unavailable");
  return completedAt;
}

function safeStorageSegment(value: string): boolean {
  return value.length > 0 && value !== "." && value !== ".." && !value.includes("/") && !value.includes("\\");
}

async function listStoragePaths(
  serviceClient: ReturnType<typeof createServiceClient>,
  bucket: string,
  prefixes: string[],
  allowPath: (path: string) => boolean,
  search?: string,
): Promise<string[]> {
  const pending = [...prefixes];
  const paths: string[] = [];
  for (let index = 0; index < pending.length; index += 1) {
    const prefix = pending[index];
    for (let offset = 0; ; offset += 100) {
      const { data, error } = await serviceClient.storage.from(bucket).list(prefix, {
        limit: 100,
        offset,
        ...(search ? { search } : {}),
      });
      if (error) throw new ContractError(503, "unavailable", "Account deletion is unavailable");
      const entries = (data ?? []) as StorageListEntry[];
      if (entries.length === 0) break;
      for (const entry of entries) {
        if (typeof entry.name !== "string" || !safeStorageSegment(entry.name)) continue;
        const candidate = `${prefix}/${entry.name}`;
        const isFolder = entry.id === null && entry.metadata === null;
        if (isFolder) {
          pending.push(candidate);
        } else if (allowPath(candidate)) {
          paths.push(candidate);
        }
      }
      if (entries.length < 100) break;
    }
  }
  return paths;
}

async function filterOwnedStoragePaths(
  serviceClient: ReturnType<typeof createServiceClient>,
  bucket: string,
  userId: string,
  paths: string[],
): Promise<string[]> {
  const uniquePaths = [...new Set(paths)];
  const ownedPaths = new Set<string>();
  for (let index = 0; index < uniquePaths.length; index += 100) {
    const { data, error } = await serviceClient
      .schema("storage")
      .from("objects")
      .select("name, owner, owner_id")
      .eq("bucket_id", bucket)
      .in("name", uniquePaths.slice(index, index + 100));
    if (error) throw new ContractError(503, "unavailable", "Account deletion is unavailable");
    for (const entry of (data ?? []) as StorageObjectEntry[]) {
      if (typeof entry.name !== "string") continue;
      const owners = [entry.owner, entry.owner_id]
        .filter((owner): owner is string => typeof owner === "string" && owner.length > 0);
      if (!owners.some((owner) => owner !== userId)) {
        ownedPaths.add(entry.name);
      }
    }
  }
  return uniquePaths.filter((path) => ownedPaths.has(path));
}

async function listOwnedBookImagePaths(
  serviceClient: ReturnType<typeof createServiceClient>,
  userId: string,
  bookIds: string[],
): Promise<string[]> {
  const paths = await listStoragePaths(
    serviceClient,
    "book-images",
    [userId],
    (path) => safeStoragePath(path, userId, null, userId) !== null,
  );
  for (const bookId of bookIds) {
    paths.push(
      ...(await listStoragePaths(
        serviceClient,
        "book-images",
        ["book_images"],
        (path) => safeStoragePath(path, userId, bookId, null) !== null,
        bookId,
      )),
      ...(await listStoragePaths(
        serviceClient,
        "book-images",
        [`book_images/${bookId}`, `legacy/${bookId}`],
        (path) => safeStoragePath(path, userId, bookId, null) !== null,
      )),
    );
  }
  return filterOwnedStoragePaths(serviceClient, "book-images", userId, paths);
}

async function listOwnedAvatarPaths(
  serviceClient: ReturnType<typeof createServiceClient>,
  userId: string,
): Promise<string[]> {
  const paths = await listStoragePaths(
    serviceClient,
    "avatars",
    [userId],
    (path) => safeAvatarPath(path, userId) !== null,
  );
  return filterOwnedStoragePaths(serviceClient, "avatars", userId, paths);
}

async function removeStoragePaths(
  serviceClient: ReturnType<typeof createServiceClient>,
  bucket: string,
  paths: string[],
): Promise<void> {
  const uniquePaths = [...new Set(paths)];
  for (let index = 0; index < uniquePaths.length; index += 100) {
    const { error } = await serviceClient.storage.from(bucket).remove(uniquePaths.slice(index, index + 100));
    if (error) throw new ContractError(503, "unavailable", "Account deletion is unavailable");
  }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return optionsResponse(req);

  try {
    methodGuard(req);
    const body = await parseJsonBody(req);
    if (body.confirmation !== true) {
      throw new ContractError(400, "invalid_request", "confirmation must be true");
    }

    const token = bearerToken(req);
    let user: Awaited<ReturnType<typeof requireUser>>["user"];
    let serviceClient: ReturnType<typeof createServiceClient> | null = null;
    let operation: { userId: string; status: DeletionOperationStatus; acceptedAt: string } | null = null;
    try {
      ({ user } = await requireUser(req));
    } catch (authenticationError) {
      if (!token) throw authenticationError;
      serviceClient = createServiceClient();
      operation = await findDeletionOperation(serviceClient, "token_hash", await tokenHash(token));
      if (operation?.status === "completed") {
        return jsonResponse({ status: "already_deleted", acceptedAt: operation.acceptedAt }, req);
      }
      if (operation?.status === "data_deleted") {
        // A revoked or expired bearer cannot resume the destructive Auth step.
        // Data deletion is already terminal from the caller's perspective; a
        // currently verified identity can still reconcile the Auth receipt below.
        return jsonResponse({ status: "already_deleted", acceptedAt: operation.acceptedAt }, req);
      }
      throw authenticationError;
    }

    if (!token) throw new ContractError(401, "unauthorized", "Authentication is required");
    serviceClient ??= createServiceClient();
    const operationHash = await tokenHash(token);
    operation = await findDeletionOperation(serviceClient, "user_id", user.id);
    if (operation && operation.userId !== user.id) {
      throw new ContractError(401, "unauthorized", "Authentication is required");
    }
    if (operation?.status === "completed") {
      return jsonResponse({ status: "already_deleted", acceptedAt: operation.acceptedAt }, req);
    }
    if (!operation) {
      await enforceFunctionRateLimit(serviceClient, user.id, "delete-user", 2, 24 * 60 * 60);
      const { error: operationError } = await serviceClient
        .from("account_deletion_operations")
        .upsert(
          { token_hash: operationHash, user_id: user.id, status: "started" },
          { onConflict: "token_hash" },
        );
      if (operationError) throw new ContractError(503, "unavailable", "Account deletion is unavailable");
      operation = { userId: user.id, status: "started", acceptedAt: new Date().toISOString() };
    } else if (operation.status === "started") {
      await enforceFunctionRateLimit(serviceClient, user.id, "delete-user-resume", 10, 24 * 60 * 60);
    }

    let existingProfile: unknown = null;
    let bookIds: string[] = [];
    let profileWasMissing = false;
    const dataWasAlreadyDeleted = operation.status === "data_deleted";
    if (operation.status === "started") {
      const { data: profile, error: profileLookupError } = await serviceClient
        .from("users")
        .select("id, avatar_url")
        .eq("id", user.id)
        .maybeSingle();
      if (profileLookupError) throw new ContractError(503, "unavailable", "Account deletion is unavailable");
      existingProfile = profile;
      profileWasMissing = !existingProfile;
      const { data: books, error: booksError } = await serviceClient
        .from("books")
        .select("id")
        .eq("user_id", user.id);
      if (booksError) throw new ContractError(503, "unavailable", "Account deletion is unavailable");
      bookIds = (books ?? [])
        .map((row) => (row as { id?: string }).id)
        .filter((id): id is string => typeof id === "string");

      const imageQueries = [
        serviceClient.from("book_images").select("id, image_url, book_id, user_id").eq("user_id", user.id),
      ];
      if (bookIds.length > 0) {
        imageQueries.push(
          serviceClient.from("book_images").select("id, image_url, book_id, user_id").in("book_id", bookIds),
        );
      }
      const imageResults = await Promise.all(imageQueries);
      if (imageResults.some((result) => result.error)) {
        throw new ContractError(503, "unavailable", "Account deletion is unavailable");
      }
      const images = [...new Map(
        imageResults
          .flatMap((result) => result.data ?? [])
          .map((row) => [String((row as { id: unknown }).id), row]),
      ).values()];

      const rowPaths = images
        .map((row) => {
          const image = row as { image_url?: unknown; book_id?: string | null; user_id?: string | null };
          const candidateBookIds = image.book_id === null || image.book_id === undefined
            ? bookIds
            : bookIds.includes(image.book_id) ? [image.book_id] : [];
          return safeStoragePath(image.image_url, user.id, null, image.user_id ?? null)
            ?? candidateBookIds.map((bookId) => safeStoragePath(image.image_url, user.id, bookId, image.user_id ?? null)).find((path): path is string => path !== null)
            ?? null;
        })
        .filter((path): path is string => Boolean(path));
      const listedBookImagePaths = await listOwnedBookImagePaths(serviceClient, user.id, bookIds);
      const ownedRowPaths = await filterOwnedStoragePaths(serviceClient, "book-images", user.id, rowPaths);
      if (ownedRowPaths.length > 0 || listedBookImagePaths.length > 0) {
        await removeStoragePaths(serviceClient, "book-images", [...ownedRowPaths, ...listedBookImagePaths]);
      }

      const childTables = [
        "reading_progress_history",
        "reading_progress_requests",
        "reading_sessions",
        "reading_goals",
        "reading_content_embeddings",
        "recall_search_history",
        "note_structures",
        "reading_insights_memory",
        "reading_insights_rate_limit",
        "book_recommendations",
        "ai_recall_usage",
        "subscription_events",
        "fcm_tokens",
        "push_logs",
        "user_consents",
        "edge_function_usage",
      ];
      for (const table of childTables) {
        const { error } = await serviceClient.from(table).delete().eq("user_id", user.id);
        if (error) throw new ContractError(503, "unavailable", "Account deletion is unavailable");
      }
      const { error: userImageDeleteError } = await serviceClient
        .from("book_images")
        .delete()
        .eq("user_id", user.id);
      if (userImageDeleteError) throw new ContractError(503, "unavailable", "Account deletion is unavailable");
      if (bookIds.length > 0) {
        const { error: imageDeleteError } = await serviceClient
          .from("book_images")
          .delete()
          .in("book_id", bookIds)
          .eq("user_id", user.id);
        if (imageDeleteError) throw new ContractError(503, "unavailable", "Account deletion is unavailable");
        const { error: legacyImageDeleteError } = await serviceClient
          .from("book_images")
          .delete()
          .in("book_id", bookIds)
          .is("user_id", null);
        if (legacyImageDeleteError) throw new ContractError(503, "unavailable", "Account deletion is unavailable");
      }
      const avatarPath = safeAvatarPath(existingProfile && (existingProfile as { avatar_url?: unknown }).avatar_url, user.id);
      const listedAvatarPaths = await listOwnedAvatarPaths(serviceClient, user.id);
      const ownedAvatarPaths = await filterOwnedStoragePaths(serviceClient, "avatars", user.id, [
        `${user.id}/avatar.png`,
        ...(avatarPath ? [avatarPath] : []),
      ]);
      await removeStoragePaths(serviceClient, "avatars", [...ownedAvatarPaths, ...listedAvatarPaths]);
      if (bookIds.length > 0) {
        const { error } = await serviceClient.from("books").delete().in("id", bookIds).eq("user_id", user.id);
        if (error) throw new ContractError(503, "unavailable", "Account deletion is unavailable");
      }

      const { error: profileError } = await serviceClient.from("users").delete().eq("id", user.id);
      if (profileError) throw new ContractError(503, "unavailable", "Account deletion is unavailable");

      const { error: dataDeletedError } = await serviceClient
        .from("account_deletion_operations")
        .update({ status: "data_deleted", updated_at: new Date().toISOString() })
        .eq("user_id", user.id);
      if (dataDeletedError) throw new ContractError(503, "unavailable", "Account deletion is unavailable");
    }

    const { error: authError } = await serviceClient.auth.admin.deleteUser(user.id);
    if (authError && !/not found|already deleted/i.test(authError.message)) {
      throw new ContractError(503, "unavailable", "Account deletion is unavailable");
    }
    const completedAt = await markDeletionCompleted(serviceClient, user.id);
    return jsonResponse({ status: profileWasMissing || dataWasAlreadyDeleted || authError ? "already_deleted" : "completed", acceptedAt: completedAt }, req);
  } catch (error) {
    return responseForError(error, req, "delete-user");
  }
});
