import { NextRequest, NextResponse } from "next/server";
import { AccountAvatarResponseSchema } from "@/lib/product/contracts";
import { uploadAccountSettingsAvatarFixture } from "@/lib/consumer/account-settings-fixtures";
import { getConsumerRouteFixture } from "@/lib/consumer/route-fixture";
import { uploadOwnedAccountAvatar } from "@/lib/product/dal";
import {
  payloadTooLargeError,
  validationError,
  type ProductError,
} from "@/lib/product/dal/errors";

const maxAvatarBytes = 2 * 1024 * 1024;
const avatarMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

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

function responseFor(value: unknown): NextResponse {
  const parsed = AccountAvatarResponseSchema.safeParse(value);
  return parsed.success
    ? privateJson(parsed.data)
    : privateError(validationError("The avatar response is malformed."));
}

function formHasCallerIdentity(form: FormData): boolean {
  return ["user_id", "userId", "owner_id", "p_user_id"].some((key) => form.has(key));
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return privateError(validationError("The avatar upload is invalid."));
  }
  if (formHasCallerIdentity(form)) {
    return privateError(validationError("Ownership is derived from the authenticated session."));
  }

  const entry = form.get("avatar");
  if (!(entry instanceof File)) return privateError(validationError("Choose an avatar image."));
  if (!avatarMimeTypes.has(entry.type)) return privateError(validationError("Use a JPEG, PNG or WebP avatar."));
  if (entry.size <= 0) return privateError(validationError("The avatar image is empty."));
  if (entry.size > maxAvatarBytes) return privateError(payloadTooLargeError("The avatar image is too large."));

  const fixture = fixtureFor(request);
  if (fixture?.startsWith("account-settings-")) {
    const result = uploadAccountSettingsAvatarFixture(fixture, entry.type);
    return result.ok ? responseFor(result.value) : privateError(result.error);
  }

  const result = await uploadOwnedAccountAvatar({ body: entry, contentType: entry.type });
  if (!result.ok) return privateError(result.error);
  if (!result.value.profile?.avatarUrl) return privateError(validationError("The avatar URL is unavailable."));
  return responseFor({
    kind: "avatar_updated",
    path: result.value.avatarPath,
    avatarUrl: result.value.profile.avatarUrl,
  });
}
