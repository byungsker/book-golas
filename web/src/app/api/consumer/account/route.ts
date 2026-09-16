import { NextRequest, NextResponse } from "next/server";
import {
  AccountProfileUpdateRequestSchema,
  AccountSettingsResponseSchema,
} from "@/lib/product/contracts";
import {
  getAccountSettingsFixture,
  updateAccountSettingsFixture,
} from "@/lib/consumer/account-settings-fixtures";
import { getConsumerRouteFixture } from "@/lib/consumer/route-fixture";
import {
  readOwnedAccountSettings,
  updateOwnedAccountProfile,
} from "@/lib/product/dal";
import {
  validationError,
  type ProductError,
} from "@/lib/product/dal/errors";

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

function isAccountSettingsFixture(fixture: string | null): boolean {
  return fixture?.startsWith("account-settings-") || fixture?.startsWith("account-deletion-") || fixture?.startsWith("export-") || false;
}

function hasCallerIdentity(value: unknown): boolean {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? ["user_id", "userId", "owner_id", "p_user_id"].some((key) => key in value)
    : false;
}

function responseFor(value: unknown): NextResponse {
  const parsed = AccountSettingsResponseSchema.safeParse(value);
  return parsed.success
    ? privateJson(parsed.data)
    : privateError(validationError("The account settings response is malformed."));
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const fixture = fixtureFor(request);
  if (isAccountSettingsFixture(fixture)) {
    const result = getAccountSettingsFixture(fixture!);
    return result.ok ? responseFor(result.value) : privateError(result.error);
  }

  const result = await readOwnedAccountSettings();
  return result.ok ? responseFor(result.value) : privateError(result.error);
}

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return privateError(validationError());
  }
  if (hasCallerIdentity(body)) {
    return privateError(validationError("Ownership is derived from the authenticated session."));
  }

  const parsed = AccountProfileUpdateRequestSchema.safeParse(body);
  if (!parsed.success) return privateError(validationError("The account profile update is invalid."));

  const fixture = fixtureFor(request);
  if (isAccountSettingsFixture(fixture)) {
    const result = updateAccountSettingsFixture(fixture!, parsed.data.nickname);
    return result.ok ? responseFor(result.value) : privateError(result.error);
  }

  const result = await updateOwnedAccountProfile(parsed.data);
  return result.ok ? responseFor(result.value) : privateError(result.error);
}

export async function PUT(request: NextRequest): Promise<NextResponse> {
  return PATCH(request);
}
