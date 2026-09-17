import { NextRequest, NextResponse } from "next/server";
import {
  WebPushSettingsResponseSchema,
  WebPushSettingsUpdateRequestSchema,
} from "@/lib/product/contracts";
import {
  getWebPushSettingsFixture,
  updateWebPushSettingsFixture,
} from "@/lib/consumer/web-push-fixtures";
import { getConsumerRouteFixture } from "@/lib/consumer/route-fixture";
import { readOwnedWebPushSettings, updateOwnedWebPushSettings } from "@/lib/product/dal";
import { validationError, type ProductError } from "@/lib/product/dal/errors";

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

function isWebPushFixture(fixture: string | null): boolean {
  return fixture?.startsWith("web-push-") ?? false;
}

function hasCallerIdentity(value: unknown): boolean {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? ["user_id", "userId", "owner_id", "p_user_id"].some((key) => key in value)
    : false;
}

function responseFor(value: unknown): NextResponse {
  const parsed = WebPushSettingsResponseSchema.safeParse(value);
  return parsed.success
    ? privateJson(parsed.data)
    : privateError(validationError("The Web notification settings response is malformed."));
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const fixture = fixtureFor(request);
  if (isWebPushFixture(fixture)) {
    const result = getWebPushSettingsFixture(fixture!);
    return result.ok ? responseFor(result.value) : privateError(result.error);
  }

  const result = await readOwnedWebPushSettings();
  return result.ok ? responseFor(result.value) : privateError(result.error);
}

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return privateError(validationError("The Web notification settings are invalid."));
  }
  if (hasCallerIdentity(body)) {
    return privateError(validationError("Ownership is derived from the authenticated session."));
  }
  const parsed = WebPushSettingsUpdateRequestSchema.safeParse(body);
  if (!parsed.success) return privateError(validationError("The Web notification settings are invalid."));

  const fixture = fixtureFor(request);
  if (isWebPushFixture(fixture)) {
    const result = updateWebPushSettingsFixture(fixture!, parsed.data);
    return result.ok ? responseFor(result.value) : privateError(result.error);
  }

  const result = await updateOwnedWebPushSettings(parsed.data);
  return result.ok ? responseFor(result.value) : privateError(result.error);
}
