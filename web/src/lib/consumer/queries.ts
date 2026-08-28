import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import {
  consumerBookSelect,
  isBookId,
  parseConsumerBook,
  type ConsumerBook,
} from "@/lib/consumer/types";

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
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    return {
      supabase,
      user: error ? null : user,
      unavailable: false,
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
  const context = await getAuthContext();
  if (context.unavailable || !context.supabase) {
    return { books: [], code: "unavailable" };
  }
  if (!context.user) return { books: [], code: "unauthenticated" };

  try {
    const { data, error } = await context.supabase
      .from("books")
      .select(consumerBookSelect)
      .eq("user_id", context.user.id)
      .is("deleted_at", null)
      .order("updated_at", { ascending: false });

    if (error) return { books: [], code: "unavailable" };

    const books = (Array.isArray(data) ? data : []).flatMap((row) => {
      if (!row || typeof row !== "object") return [];
      const book = parseConsumerBook(row as Record<string, unknown>);
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
}> {
  if (!isBookId(bookId)) return { book: null, code: "not_found" };

  const context = await getAuthContext();
  if (context.unavailable || !context.supabase) {
    return { book: null, code: "unavailable" };
  }
  if (!context.user) return { book: null, code: "unauthenticated" };

  try {
    const { data, error } = await context.supabase
      .from("books")
      .select(consumerBookSelect)
      .eq("id", bookId)
      .eq("user_id", context.user.id)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) return { book: null, code: "unavailable" };
    if (!data || typeof data !== "object") return { book: null, code: "not_found" };

    const book = parseConsumerBook(data as Record<string, unknown>);
    return book ? { book, code: "ok" } : { book: null, code: "not_found" };
  } catch {
    return { book: null, code: "unavailable" };
  }
}
