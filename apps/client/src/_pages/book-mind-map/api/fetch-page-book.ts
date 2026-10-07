import "server-only";

import { cookies } from "next/headers";
import {
  fetchOwnedBookDetail,
  getBookDetailFixture,
  type OwnedBookDetailQueryResult,
} from "@/entities/book/index.server";
import { isBookId } from "@/entities/book";
import { getConsumerAuthContext } from "@/shared/auth/index.server";
import { getConsumerRouteFixture } from "@/shared/config";

export async function fetchBookMindMapPageBook(
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
  if (!routeFixture?.startsWith("recall-") && !routeFixture?.startsWith("ai-artifacts-")) {
    return fetchOwnedBookDetail(bookId, context);
  }

  const result = getBookDetailFixture({ fixture: "book-detail-reading", bookId });
  if (!result.ok) {
    return {
      book: null,
      code: result.error.code === "not_found" ? "not_found" : "unavailable",
      authenticated: true,
    };
  }
  return { book: result.value, code: "ok", authenticated: true };
}
