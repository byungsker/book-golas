import "server-only";

import { getConsumerAuthContext } from "@/shared/auth/index.server";
import {
  consumerBookSelect,
  isBookId,
  parseConsumerBook,
  type ConsumerBook,
} from "../model/book";
import type { BookQueryCode } from "../model/book-query";

export async function fetchOwnedBook(bookId: string): Promise<{
  book: ConsumerBook | null;
  code: BookQueryCode;
  authenticated: boolean;
}> {
  const context = await getConsumerAuthContext();
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
