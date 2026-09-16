import type { User } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import {
  AccountDeletionRequestSchema,
  DeleteAccountRequestSchema,
  DeleteAccountResultSchema,
  deleteAccountConfirmationValues,
} from "@/lib/product/contracts";
import { deleteAccountFixture } from "@/lib/consumer/account-deletion-fixtures";
import { getConsumerRouteFixture } from "@/lib/consumer/route-fixture";
import { invokeProductFunctionForSession } from "@/lib/product/adapters";
import { resolveProductSession } from "@/lib/product/dal/context";
import {
  unauthorizedError,
  unavailableError,
  validationError,
  type ProductError,
} from "@/lib/product/dal/errors";
import { createServerSupabaseClient } from "@/lib/supabase-server";

type ServerSupabaseClient = Awaited<ReturnType<typeof createServerSupabaseClient>>;
type AuthenticatedSessionResult =
  | { ok: true; supabase: ServerSupabaseClient; user: User }
  | { ok: false; error: ProductError };

function privateJson(body: unknown, status = 200): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}

function privateError(error: ProductError): NextResponse {
  return privateJson({ error }, error.status);
}

function fixtureFor(request: NextRequest): string | null {
  return getConsumerRouteFixture(request.cookies.get("bookgolas-route-fixture")?.value);
}

function isAccountDeletionFixture(fixture: string | null): boolean {
  return fixture?.startsWith("account-deletion-") ?? false;
}

function hasCallerIdentity(value: unknown): boolean {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? ["user_id", "userId", "owner_id", "p_user_id"].some((key) => key in value)
    : false;
}

function hasPasswordIdentity(user: User): boolean {
  const providers = [
    ...(user.identities ?? []).map((identity) => identity.provider),
    typeof user.app_metadata?.provider === "string" ? user.app_metadata.provider : null,
  ];
  return providers.includes("email") || providers.includes("password");
}

async function authenticatedSession(): Promise<AuthenticatedSessionResult> {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) return { ok: false, error: unauthorizedError() };
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();
    if (sessionError || !session?.access_token) return { ok: false, error: unauthorizedError() };
    return { ok: true as const, supabase, user };
  } catch {
    return { ok: false, error: unavailableError("Account deletion is unavailable.") };
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return privateError(validationError("The account deletion request is invalid."));
  }
  if (hasCallerIdentity(body)) {
    return privateError(validationError("Ownership is derived from the authenticated session."));
  }

  const parsed = AccountDeletionRequestSchema.safeParse(body);
  if (!parsed.success) {
    return privateError(validationError("The account deletion confirmation is invalid."));
  }
  if (!deleteAccountConfirmationValues.includes(parsed.data.confirmationText as (typeof deleteAccountConfirmationValues)[number])) {
    return privateError(validationError("The account deletion confirmation is invalid."));
  }

  const fixture = fixtureFor(request);
  if (isAccountDeletionFixture(fixture)) {
    const result = deleteAccountFixture(fixture!);
    return result.ok ? privateJson(result.value) : privateError(result.error);
  }

  const context = await authenticatedSession();
  if (!context.ok) return privateError(context.error);

  if (hasPasswordIdentity(context.user)) {
    if (!context.user.email || !parsed.data.currentPassword) return privateError(unauthorizedError());
    const { error } = await context.supabase.auth.signInWithPassword({
      email: context.user.email,
      password: parsed.data.currentPassword,
    });
    if (error) return privateError(unauthorizedError());
  }

  const session = await resolveProductSession(() => Promise.resolve(context.supabase));
  if (!session.ok) return privateError(session.error);

  const canonicalRequest = DeleteAccountRequestSchema.parse({ confirmation: true });
  const result = await invokeProductFunctionForSession(
    session.value,
    "delete-user",
    canonicalRequest,
    DeleteAccountResultSchema,
  );
  if (!result.ok) return privateError(result.error);

  try {
    await context.supabase.auth.signOut();
  } catch {
    return privateJson(result.value);
  }
  return privateJson(result.value);
}
