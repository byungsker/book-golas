import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { applyReviewShareFixtureGenerate, applyReviewShareFixtureSave, getReviewShareFixtureBook } from "@/lib/consumer/review-share-fixtures";
import { getConsumerRouteFixture } from "@/lib/consumer/route-fixture";
import { generateBookReview } from "@/lib/product/adapters";
import {
  BookIdSchema,
  LocaleSchema,
  ReviewMutationSchema,
  type ReviewResponse,
} from "@/lib/product/contracts";
import { getBook, updateBook } from "@/lib/product/dal";
import { productErrorResponse } from "@/lib/product/dal/http";
import { consentRequiredError, validationError, type ProductError } from "@/lib/product/dal/errors";
import { consumerRoutes } from "@/lib/product/contracts/routes";

function privateJson(body: ReviewResponse, status = 200): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}

function privateError(error: ProductError): NextResponse {
  const response = productErrorResponse(error);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

function canonicalUrl(request: NextRequest, locale: "ko" | "en", bookId: string): string {
  return new URL(consumerRoutes.review(locale, bookId), request.url).toString();
}

function invalidatedPaths(locale: "ko" | "en", bookId: string): string[] {
  return [
    consumerRoutes.review(locale, bookId),
    consumerRoutes.book(locale, bookId),
    consumerRoutes.library(locale),
  ];
}

function isReviewFixture(fixture: string | null): boolean {
  return fixture?.startsWith("review-share-") ?? false;
}

function fixtureFrom(request: NextRequest): string | null {
  return getConsumerRouteFixture(request.cookies.get("bookgolas-route-fixture")?.value);
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  if (["user_id", "userId", "owner_id", "p_user_id"].some((key) => params.has(key))) {
    return privateError(validationError("Ownership is derived from the authenticated session."));
  }
  const parsedBookId = BookIdSchema.safeParse(params.get("bookId"));
  if (!parsedBookId.success) return privateError(validationError());
  const parsedLocale = LocaleSchema.safeParse(params.get("locale") ?? "en");
  if (!parsedLocale.success) return privateError(validationError());

  const fixture = fixtureFrom(request);
  const result = isReviewFixture(fixture)
    ? getReviewShareFixtureBook(fixture!, parsedBookId.data)
    : await getBook(parsedBookId.data);
  if (!result.ok) return privateError(result.error);

  return privateJson({
    kind: "saved",
    book: result.value,
    canonicalUrl: canonicalUrl(request, parsedLocale.data, parsedBookId.data),
    duplicate: false,
    invalidatedPaths: [],
  });
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return privateError(validationError());
  }

  const parsed = ReviewMutationSchema.safeParse(body);
  if (!parsed.success) return privateError(validationError());
  const input = parsed.data;
  const fixture = fixtureFrom(request);

  if (input.action === "generate") {
    if (!input.aiConsent) return privateError(consentRequiredError("AI review consent is required."));
    const result = isReviewFixture(fixture)
      ? applyReviewShareFixtureGenerate(fixture!, input)
      : await generateBookReview(input.bookId);
    if (!result.ok) return privateError(result.error);
    return privateJson({
      kind: "draft",
      draft: result.value.draft,
      memosUsed: result.value.memosUsed,
    });
  }

  const paths = invalidatedPaths(input.locale, input.bookId);
  let book;
  let duplicate = false;
  if (isReviewFixture(fixture)) {
    const result = applyReviewShareFixtureSave(fixture!, input);
    if (!result.ok) return privateError(result.error);
    book = result.value.book;
    duplicate = result.value.duplicate;
  } else {
    const result = await updateBook({
      bookId: input.bookId,
      rating: input.rating,
      review: input.review,
      reviewLink: input.reviewLink,
      longReview: input.longReview,
    });
    if (!result.ok) return privateError(result.error);
    book = result.value;
  }
  if (!book) return privateError(validationError("The saved review response is invalid."));
  for (const path of paths) revalidatePath(path);

  return privateJson({
    kind: "saved",
    book,
    canonicalUrl: canonicalUrl(request, input.locale, input.bookId),
    duplicate,
    invalidatedPaths: paths,
  });
}
