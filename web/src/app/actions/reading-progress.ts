"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import {
  consumerBookSelect,
  isBookId,
  isValidReadingPage,
  parseConsumerBook,
  type ConsumerBook,
} from "@/lib/consumer/types";
import { isConsumerLocale } from "@/lib/consumer/paths";

type UpdateReadingProgressInput = {
  locale: string;
  bookId: string;
  currentPage: number;
};

type UpdateReadingProgressResult =
  | { ok: true; book: ConsumerBook; historyRecorded: boolean }
  | {
      ok: false;
      code:
        | "invalid_input"
        | "unauthenticated"
        | "not_found"
        | "conflict"
        | "history_unavailable"
        | "unavailable";
    };

export async function updateReadingProgress(
  input: UpdateReadingProgressInput,
): Promise<UpdateReadingProgressResult> {
  if (
    !isConsumerLocale(input.locale) ||
    !isBookId(input.bookId) ||
    !Number.isSafeInteger(input.currentPage) ||
    input.currentPage < 0
  ) {
    return { ok: false, code: "invalid_input" };
  }

  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) return { ok: false, code: "unauthenticated" };

    const { data: currentBook, error: readError } = await supabase
      .from("books")
      .select("id,current_page,total_pages,status")
      .eq("id", input.bookId)
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .maybeSingle();

    if (readError) return { ok: false, code: "unavailable" };
    if (!currentBook) return { ok: false, code: "not_found" };

    const previousPage = Number.isSafeInteger(currentBook.current_page)
      ? currentBook.current_page
      : 0;
    const totalPages = Number.isSafeInteger(currentBook.total_pages)
      ? currentBook.total_pages
      : 0;

    if (!isValidReadingPage(input.currentPage, totalPages)) {
      return { ok: false, code: "invalid_input" };
    }

    const nextStatus =
      totalPages > 0 && input.currentPage >= totalPages
        ? "completed"
        : currentBook.status ?? "reading";

    const { data: updatedBook, error: updateError } = await supabase
      .from("books")
      .update({
        current_page: input.currentPage,
        status: nextStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.bookId)
      .eq("user_id", user.id)
      .eq("current_page", previousPage)
      .is("deleted_at", null)
      .select(consumerBookSelect)
      .maybeSingle();

    if (updateError) return { ok: false, code: "unavailable" };
    if (!updatedBook || typeof updatedBook !== "object") {
      return { ok: false, code: "conflict" };
    }

    const book = parseConsumerBook(updatedBook as Record<string, unknown>);
    if (!book) return { ok: false, code: "unavailable" };

    if (input.currentPage > previousPage) {
      const { error: historyError } = await supabase
        .from("reading_progress_history")
        .insert({
          user_id: user.id,
          book_id: input.bookId,
          page: input.currentPage,
          previous_page: previousPage,
        });
      if (historyError) {
        revalidateReadingProgressPaths(input);
        return { ok: false, code: "history_unavailable" };
      }
    }

    revalidateReadingProgressPaths(input);

    return { ok: true, book, historyRecorded: true };
  } catch {
    return { ok: false, code: "unavailable" };
  }
}

function revalidateReadingProgressPaths(input: UpdateReadingProgressInput) {
  revalidatePath(`/${input.locale}/home`);
  revalidatePath(`/${input.locale}/books/${input.bookId}`);
  revalidatePath(`/${input.locale}/reading/${input.bookId}`);
}
