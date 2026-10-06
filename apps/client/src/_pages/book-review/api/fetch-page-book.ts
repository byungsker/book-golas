import "server-only";

import { cookies } from "next/headers";
import {
  fetchOwnedBookDetail,
  type OwnedBookDetailQueryResult,
} from "@/entities/book/index.server";
import { isBookId } from "@/entities/book";
import { getReviewShareFixtureBook } from "@/features/review-share/index.server";
import { getConsumerAuthContext } from "@/shared/auth/index.server";
import { getConsumerRouteFixture } from "@/shared/config";

export async function fetchBookReviewPageBook(
  bookId: string,
): Promise<OwnedBookDetailQueryResult> {
  const context = await getConsumerAuthContext();
  if (!isBookId(bookId)) return fetchOwnedBookDetail(bookId, context);

  let routeFixture = null;
  try {
    routeFixture = getConsumerRouteFixture(
      (await cookies()).get("bookgolas-route-fixture")?.value,
    );
  } catch {
    routeFixture = null;
  }
  if (!routeFixture?.startsWith("review-share-")) {
    return fetchOwnedBookDetail(bookId, context);
  }

  const result = getReviewShareFixtureBook(routeFixture, bookId);
  if (!result.ok) {
    return {
      book: null,
      code:
        result.error.code === "not_found"
          ? "not_found"
          : result.error.code === "unauthorized"
            ? "unauthenticated"
            : "unavailable",
      authenticated: true,
    };
  }
  return { book: result.value, code: "ok", authenticated: true };
}
