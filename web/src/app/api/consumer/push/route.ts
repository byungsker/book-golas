import { NextRequest, NextResponse } from "next/server";
import {
  WebPushRegistrationRequestSchema,
  WebPushRegistrationResponseSchema,
  WebPushRegistrationStatusSchema,
} from "@/lib/product/contracts";
import {
  getWebPushSettingsFixture,
  registerWebPushSubscriptionFixture,
  unregisterWebPushSubscriptionFixture,
} from "@/lib/consumer/web-push-fixtures";
import { getConsumerRouteFixture } from "@/lib/consumer/route-fixture";
import {
  readOwnedWebPushSettings,
  registerOwnedWebPushSubscription,
  unregisterOwnedWebPushSubscription,
} from "@/lib/product/dal";
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

function statusResponse(value: unknown): NextResponse {
  const parsed = WebPushRegistrationStatusSchema.safeParse(value);
  return parsed.success
    ? privateJson(parsed.data)
    : privateError(validationError("The Web Push registration status is malformed."));
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const fixture = fixtureFor(request);
  if (isWebPushFixture(fixture)) {
    const result = getWebPushSettingsFixture(fixture!);
    return result.ok ? statusResponse(result.value.push) : privateError(result.error);
  }

  const result = await readOwnedWebPushSettings();
  return result.ok ? statusResponse(result.value.push) : privateError(result.error);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return privateError(validationError("The Web Push subscription is invalid."));
  }
  if (hasCallerIdentity(body)) {
    return privateError(validationError("Ownership is derived from the authenticated session."));
  }
  const parsed = WebPushRegistrationRequestSchema.safeParse(body);
  if (!parsed.success) return privateError(validationError("The Web Push subscription is invalid."));

  const fixture = fixtureFor(request);
  const result = isWebPushFixture(fixture)
    ? registerWebPushSubscriptionFixture(fixture!, parsed.data)
    : await registerOwnedWebPushSubscription(parsed.data);
  if (!result.ok) return privateError(result.error);
  const response = WebPushRegistrationResponseSchema.safeParse(result.value);
  return response.success
    ? privateJson(response.data)
    : privateError(validationError("The Web Push registration response is malformed."));
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const fixture = fixtureFor(request);
  const result = isWebPushFixture(fixture)
    ? unregisterWebPushSubscriptionFixture(fixture!)
    : await unregisterOwnedWebPushSubscription();
  return result.ok ? privateJson(result.value) : privateError(result.error);
}
