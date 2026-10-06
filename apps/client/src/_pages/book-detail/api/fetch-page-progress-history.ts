import "server-only";

import { cookies } from "next/headers";
import {
  fetchOwnedProgressHistory,
  type OwnedProgressHistoryResult,
} from "@/features/reading-progress/index.server";
import { getTimerFixtureBook } from "@/features/reading-timer/index.server";
import { getReviewShareFixtureBook } from "@/features/review-share/index.server";
import { getBookDetailFixture } from "@/entities/book/index.server";
import { isBookId } from "@/entities/book";
import { getConsumerRouteFixture } from "@/shared/config";

export async function fetchPageProgressHistory(
  bookId: string,
): Promise<OwnedProgressHistoryResult> {
  if (!isBookId(bookId)) return fetchOwnedProgressHistory(bookId);

  let routeFixture = null;
  try {
    routeFixture = getConsumerRouteFixture(
      (await cookies()).get("bookgolas-route-fixture")?.value,
    );
  } catch {
    routeFixture = null;
  }
  if (routeFixture?.startsWith("timer-")) {
    const book = getTimerFixtureBook(routeFixture, bookId);
    return {
      history: [],
      code: book.ok ? "ok" : "not_found",
      authenticated: true,
    };
  }
  if (
    routeFixture?.startsWith("notes-highlights-") ||
    routeFixture?.startsWith("images-ocr-")
  ) {
    const book = getBookDetailFixture({ fixture: "book-detail-reading", bookId });
    return {
      history: [],
      code: book.ok ? "ok" : "not_found",
      authenticated: true,
    };
  }
  if (routeFixture?.startsWith("review-share-")) {
    const book = getReviewShareFixtureBook(routeFixture, bookId);
    return {
      history: [],
      code: book.ok ? "ok" : "not_found",
      authenticated: true,
    };
  }
  return fetchOwnedProgressHistory(bookId);
}
