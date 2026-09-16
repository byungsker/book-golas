import "server-only";

import type { User } from "@supabase/supabase-js";
import { UserIdSchema, type UserId } from "@/lib/product/contracts";
import { SupabaseConfigurationError } from "@/lib/supabase-config";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import {
  configurationError,
  failure,
  success,
  unauthorizedError,
  unavailableError,
  type ProductResult,
} from "./errors";

export type ProductSupabaseClient = Awaited<ReturnType<typeof createServerSupabaseClient>>;
export type ProductClientFactory = () => Promise<ProductSupabaseClient>;

export type ProductSession = {
  readonly supabase: ProductSupabaseClient;
  readonly user: User;
  readonly userId: UserId;
};

function hasStatus(value: unknown): value is { readonly status?: unknown } {
  return typeof value === "object" && value !== null && "status" in value;
}

function readStatus(error: unknown): number | undefined {
  if (!hasStatus(error)) return undefined;
  const status = error.status;
  return typeof status === "number" ? status : undefined;
}

function isUnauthorized(error: unknown): boolean {
  if (readStatus(error) === 401) return true;
  const message = error instanceof Error ? error.message : "";
  return /jwt|token.*expired|invalid.*token|not authenticated|unauthorized/i.test(message);
}

export async function resolveProductSession(
  factory: ProductClientFactory = createServerSupabaseClient,
): Promise<ProductResult<ProductSession>> {
  let supabase: ProductSupabaseClient;
  try {
    supabase = await factory();
  } catch (error) {
    return failure(
      error instanceof SupabaseConfigurationError ? configurationError() : unavailableError(),
    );
  }

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) return failure(isUnauthorized(error) ? unauthorizedError() : unavailableError());
    if (!user) return failure(unauthorizedError());

    const userId = UserIdSchema.safeParse(user.id);
    if (!userId.success) return failure(unavailableError());

    return success({
      supabase,
      user,
      userId: userId.data,
    });
  } catch {
    return failure(unavailableError());
  }
}
