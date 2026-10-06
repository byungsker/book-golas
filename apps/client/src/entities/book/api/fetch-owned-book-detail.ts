import "server-only";

import { cookies } from "next/headers";
import { getConsumerAuthContext, type ConsumerAuthContext } from "@/shared/auth/index.server";
import { getConsumerRouteFixture } from "@/shared/config";
import { bookDtoSelect, parseBookRow } from "./codec";
import type { Book } from "@/shared/api/contracts";
import { getBookDetailFixture } from "../model/book-detail-fixtures";
import { isBookId } from "../model/book";
import type { BookQueryCode } from "../model/book-query";

export type OwnedBookDetailQueryResult = {
  book: Book | null;
  code: BookQueryCode;
  authenticated: boolean;
};

export async function fetchOwnedBookDetail(
  bookId: string,
  authContext?: ConsumerAuthContext,
): Promise<OwnedBookDetailQueryResult> {
  const context = authContext ?? await getConsumerAuthContext();
  if (!isBookId(bookId)) {
    return {
      book: null,
      code: context.unavailable ? "unavailable" : "not_found",
      authenticated: Boolean(context.user),
    };
  }

  let routeFixture = null;
  try {
    routeFixture = getConsumerRouteFixture(
      (await cookies()).get("bookgolas-route-fixture")?.value,
    );
  } catch {
    routeFixture = null;
  }
  if (routeFixture?.startsWith("book-detail-")) {
    const result = getBookDetailFixture({ fixture: routeFixture, bookId });
    if (!result.ok) {
      return {
        book: null,
        code: result.error.code === "not_found" ? "not_found" : "unavailable",
        authenticated: true,
      };
    }
    return { book: result.value, code: "ok", authenticated: true };
  }

  if (context.unavailable || !context.supabase) {
    if (context.user) return { book: null, code: "not_found", authenticated: true };
    return { book: null, code: "unavailable", authenticated: false };
  }
  if (!context.user) return { book: null, code: "unauthenticated", authenticated: false };

  try {
    const { data, error } = await context.supabase
      .from("books")
      .select(bookDtoSelect)
      .eq("id", bookId)
      .eq("user_id", context.user.id)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) return { book: null, code: "unavailable", authenticated: true };
    if (!data || typeof data !== "object") return { book: null, code: "not_found", authenticated: true };
    const result = parseBookRow(data);
    return result.ok
      ? { book: result.value, code: "ok", authenticated: true }
      : { book: null, code: "unavailable", authenticated: true };
  } catch {
    return { book: null, code: "unavailable", authenticated: true };
  }
}
