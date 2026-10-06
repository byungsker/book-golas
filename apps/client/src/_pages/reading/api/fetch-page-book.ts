import "server-only";

import { cookies } from "next/headers";
import {
  fetchOwnedBookDetail,
  getBookDetailFixture,
  type OwnedBookDetailQueryResult,
} from "@/entities/book/index.server";
import { isBookId } from "@/entities/book";
import { getProgressFixtureSnapshot } from "@/features/reading-progress/index.server";
import { getTimerFixtureBook } from "@/features/reading-timer/index.server";
import { getReviewShareFixtureBook } from "@/features/review-share/index.server";
import { getConsumerAuthContext } from "@/shared/auth/index.server";
import { getConsumerRouteFixture } from "@/shared/config";
import type { Book } from "@/shared/api/contracts";
import type { ProductResult } from "@/shared/api/product/errors";

function readFixtureBook(result: ProductResult<Book>): OwnedBookDetailQueryResult {
  if (!result.ok) {
    return {
      book: null,
      code: result.error.code === "not_found" ? "not_found" : "unavailable",
      authenticated: true,
    };
  }
  return { book: result.value, code: "ok", authenticated: true };
}

export async function fetchPageBook(
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
  if (routeFixture?.startsWith("progress-")) {
    const snapshot = getProgressFixtureSnapshot({ fixture: routeFixture, bookId });
    return snapshot
      ? { book: snapshot.book, code: "ok", authenticated: true }
      : { book: null, code: "not_found", authenticated: true };
  }
  if (routeFixture?.startsWith("timer-")) {
    const result = getTimerFixtureBook(routeFixture, bookId);
    return result.ok
      ? { book: result.value, code: "ok", authenticated: true }
      : { book: null, code: "not_found", authenticated: true };
  }
  if (
    routeFixture?.startsWith("recall-") ||
    routeFixture?.startsWith("notes-highlights-") ||
    routeFixture?.startsWith("images-ocr-") ||
    routeFixture?.startsWith("ai-artifacts-")
  ) {
    return readFixtureBook(
      getBookDetailFixture({ fixture: "book-detail-reading", bookId }),
    );
  }
  if (routeFixture?.startsWith("review-share-")) {
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

  return fetchOwnedBookDetail(bookId, context);
}
