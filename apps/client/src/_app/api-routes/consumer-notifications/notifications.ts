import { NextRequest, NextResponse } from "next/server";
import {
  WebPushSettingsResponseSchema,
  WebPushSettingsUpdateRequestSchema,
} from "@/features/web-push/index.server";
import {
  getWebPushSettingsFixture,
  updateWebPushSettingsFixture,
} from "@/features/web-push/index.server";
import { getConsumerRouteFixture } from "@/shared/config";
import { readOwnedWebPushSettings, updateOwnedWebPushSettings } from "@/features/web-push/index.server";
import { validationError, type ProductError } from "@/shared/api/product/errors";

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

export async function getConsumerNotifications(request: NextRequest): Promise<NextResponse> {
  const fixture = fixtureFor(request);
  if (isWebPushFixture(fixture)) {
    const result = getWebPushSettingsFixture(fixture!);
    return result.ok ? responseFor(result.value) : privateError(result.error);
  }

  const result = await readOwnedWebPushSettings();
  return result.ok ? responseFor(result.value) : privateError(result.error);
}

export async function patchConsumerNotifications(request: NextRequest): Promise<NextResponse> {
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
