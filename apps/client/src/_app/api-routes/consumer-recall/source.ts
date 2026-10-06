import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { RecallSourceImageResponseSchema, RecallSourceRequestSchema } from "@/shared/api/contracts";
import { getOwnedBookImageWithSignedUrl } from "@/features/images-ocr/index.server";
import { productErrorResponse } from "@/shared/api/product/index.server";
import { validationError, type ProductError } from "@/shared/api/product/errors";
import { getConsumerRouteFixture } from "@/shared/config";
import { getRecallFixtureSourceImage } from "@/features/recall/index.server";

function privateJson(body: unknown, status = 200): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}

function identityError(request: NextRequest): NextResponse | null {
  return ["user_id", "userId", "p_user_id", "owner_id"].some((key) => request.nextUrl.searchParams.has(key))
    ? productErrorResponse(validationError("Ownership is derived from the authenticated session."))
    : null;
}

export async function getConsumerRecallSource(request: NextRequest) {
  const rejected = identityError(request);
  if (rejected) return rejected;
  const params = request.nextUrl.searchParams;
  const parsed = RecallSourceRequestSchema.safeParse({
    locale: params.get("locale") ?? "en",
    bookId: params.get("bookId"),
    sourceId: params.get("sourceId"),
  });
  if (!parsed.success) return productErrorResponse(validationError());

  let routeFixture: string | null = null;
  try {
    routeFixture = getConsumerRouteFixture((await cookies()).get("bookgolas-route-fixture")?.value ?? request.cookies.get("bookgolas-route-fixture")?.value);
  } catch {
    routeFixture = null;
  }
  if (routeFixture?.startsWith("recall-")) {
    if (routeFixture === "recall-unauthorized") return productErrorResponse({ code: "unauthorized", status: 401, message: "Sign-in required.", retryable: false } satisfies ProductError);
    const result = getRecallFixtureSourceImage({ fixture: routeFixture, ...parsed.data });
    return result.ok ? privateJson(RecallSourceImageResponseSchema.parse(result.value)) : productErrorResponse(result.error);
  }

  const result = await getOwnedBookImageWithSignedUrl(parsed.data.bookId, parsed.data.sourceId);
  if (!result.ok) return productErrorResponse(result.error);
  if (String(result.value.id) !== String(parsed.data.sourceId) || String(result.value.bookId) !== String(parsed.data.bookId)) {
    return productErrorResponse(validationError("The source image is outside the book scope."));
  }
  return privateJson({
    kind: "source_image",
    sourceId: result.value.id,
    bookId: result.value.bookId,
    signedUrl: result.value.signedUrl,
    expiresAt: result.value.signedUrlExpiresAt,
  });
}
