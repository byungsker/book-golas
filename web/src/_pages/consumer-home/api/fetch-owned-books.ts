import "server-only";

import { cookies } from "next/headers";
import { getConsumerAuthContext } from "@/shared/auth/index.server";
import { getConsumerRouteFixture } from "@/shared/config";
import {
  consumerBookSelect,
  parseConsumerBook,
  type ConsumerBook,
  type BookQueryCode,
} from "@/entities/book";
import { getHomeBookListFixtureBooks } from "../model/home-book-list-fixtures";
import { getBookLifecycleFixtureConsumerBook } from "@/entities/book/index.server";
import { getBookDetailFixtureConsumerBook } from "@/entities/book/index.server";

export async function fetchOwnedBooks(): Promise<{
  books: ConsumerBook[];
  code: BookQueryCode;
}> {
  let routeFixture = null;
  try {
    routeFixture = getConsumerRouteFixture(
      (await cookies()).get("bookgolas-route-fixture")?.value,
    );
  } catch {
    routeFixture = null;
  }
  if (routeFixture === "pending") {
    await new Promise((resolve) => setTimeout(resolve, 1_200));
  }
  const context = await getConsumerAuthContext();
  if (context.unavailable) {
    return { books: [], code: "unavailable" };
  }
  if (context.user && !context.supabase) {
    if (routeFixture === "home-book-list") {
      return { books: getHomeBookListFixtureBooks(), code: "ok" };
    }
    if (routeFixture?.startsWith("book-lifecycle-")) {
      return { books: [getBookLifecycleFixtureConsumerBook()], code: "ok" };
    }
    if (routeFixture?.startsWith("book-detail-")) {
      const book = getBookDetailFixtureConsumerBook({ fixture: routeFixture, bookId: "" });
      return { books: book ? [book] : [], code: "ok" };
    }
    return { books: [], code: "ok" };
  }
  if (!context.supabase) {
    return { books: [], code: "unavailable" };
  }
  if (!context.user) return { books: [], code: "unauthenticated" };

  try {
    const { data, error } = await context.supabase
      .from("books")
      .select(consumerBookSelect)
      .eq("user_id", context.user.id)
      .is("deleted_at", null)
      .order("updated_at", { ascending: false, nullsFirst: false })
      .order("id", { ascending: false });

    if (error) return { books: [], code: "unavailable" };

    const books = (Array.isArray(data) ? data : []).flatMap((row) => {
      if (!row || typeof row !== "object") return [];
      const rowValue = row as Record<string, unknown>;
      if (rowValue.deleted_at !== null && rowValue.deleted_at !== undefined) return [];
      const book = parseConsumerBook(rowValue);
      return book ? [book] : [];
    });

    return { books, code: "ok" };
  } catch {
    return { books: [], code: "unavailable" };
  }
}
