import type { SupabaseClient, User } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { getConsumerRouteFixture } from "@/lib/consumer/route-fixture";
import {
  consumerBookSelect,
  isBookId,
  parseConsumerBook,
  type ConsumerBook,
} from "@/lib/consumer/types";
import { getHomeBookListFixtureBooks } from "@/lib/consumer/home-book-list-fixtures";
import { getBookLifecycleFixtureConsumerBook } from "@/lib/consumer/book-lifecycle-fixtures";
import { getBookDetailFixture, getBookDetailFixtureConsumerBook } from "@/lib/consumer/book-detail-fixtures";
import { bookDtoSelect, parseBookRow } from "@/lib/product/dal/codec";
import type { Book } from "@/lib/product/contracts";

type AuthContext = {
  supabase: SupabaseClient | null;
  user: User | null;
  unavailable: boolean;
};

export type ConsumerQueryCode =
  | "ok"
  | "unauthenticated"
  | "unavailable"
  | "not_found";

async function getAuthContext(): Promise<AuthContext> {
  let routeFixture = null;
  try {
    routeFixture = getConsumerRouteFixture(
      (await cookies()).get("bookgolas-route-fixture")?.value,
    );
  } catch {
    routeFixture = null;
  }
  if (routeFixture === "anonymous" || routeFixture === "expired-session") {
    return { supabase: null, user: null, unavailable: false };
  }
  if (routeFixture === "unavailable") {
    return {
      supabase: null,
      user: { id: "00000000-0000-4000-8000-000000000001" } as User,
      unavailable: true,
    };
  }
  if (routeFixture === "bootstrap-network") {
    return { supabase: null, user: null, unavailable: true };
  }
  if ([
    "authenticated-not-found",
    "deleted-book",
    "home-book-list",
    "home-empty-completed",
    "home-empty-paused",
    "home-empty-planned",
    "home-empty-reading",
    "unauthorized-private-data",
    "pending",
  ].includes(routeFixture ?? "")) {
    return {
      supabase: null,
      user: { id: "00000000-0000-4000-8000-000000000001" } as User,
      unavailable: false,
    };
  }

  if (routeFixture?.startsWith("library-")) {
    return {
      supabase: null,
      user: { id: "00000000-0000-4000-8000-000000000001" } as User,
      unavailable: false,
    };
  }

  if (routeFixture?.startsWith("book-discovery-")) {
    return {
      supabase: null,
      user: { id: "00000000-0000-4000-8000-000000000001" } as User,
      unavailable: false,
    };
  }

  if (routeFixture?.startsWith("book-lifecycle-")) {
    return {
      supabase: null,
      user: { id: "00000000-0000-4000-8000-000000000001" } as User,
      unavailable: false,
    };
  }

  if (routeFixture?.startsWith("book-detail-")) {
    return {
      supabase: null,
      user: { id: "00000000-0000-4000-8000-000000000001" } as User,
      unavailable: false,
    };
  }

  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    return {
      supabase,
      user: error ? null : user,
      unavailable: Boolean(error),
    };
  } catch {
    return { supabase: null, user: null, unavailable: true };
  }
}

export async function getCurrentConsumerUser(): Promise<{
  user: User | null;
  unavailable: boolean;
}> {
  const context = await getAuthContext();
  return { user: context.user, unavailable: context.unavailable };
}

export async function fetchOwnedBooks(): Promise<{
  books: ConsumerBook[];
  code: ConsumerQueryCode;
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
  const context = await getAuthContext();
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

export async function fetchOwnedBook(bookId: string): Promise<{
  book: ConsumerBook | null;
  code: ConsumerQueryCode;
  authenticated: boolean;
}> {
  const context = await getAuthContext();
  if (!isBookId(bookId)) {
    return {
      book: null,
      code: context.unavailable ? "unavailable" : "not_found",
      authenticated: Boolean(context.user),
    };
  }

  if (context.unavailable || !context.supabase) {
    if (context.user) {
      return { book: null, code: "not_found", authenticated: true };
    }
    return { book: null, code: "unavailable", authenticated: false };
  }
  if (!context.user) {
    return { book: null, code: "unauthenticated", authenticated: false };
  }

  try {
    const { data, error } = await context.supabase
      .from("books")
      .select(consumerBookSelect)
      .eq("id", bookId)
      .eq("user_id", context.user.id)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) return { book: null, code: "unavailable", authenticated: true };
    if (!data || typeof data !== "object") {
      return { book: null, code: "not_found", authenticated: true };
    }

    const book = parseConsumerBook(data as Record<string, unknown>);
    return book
      ? { book, code: "ok", authenticated: true }
      : { book: null, code: "not_found", authenticated: true };
  } catch {
    return { book: null, code: "unavailable", authenticated: true };
  }
}

export async function fetchOwnedBookDetail(bookId: string): Promise<{
  book: Book | null;
  code: ConsumerQueryCode;
  authenticated: boolean;
}> {
  const context = await getAuthContext();
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
