"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import {
  consumerBookSelect,
  isBookId,
  parseConsumerBook,
  type ConsumerBook,
} from "@/lib/consumer/types";
import { isConsumerLocale } from "@/lib/consumer/paths";
import { RequestIdSchema } from "@/lib/product/contracts/common";

type UpdateReadingProgressInput = {
  locale: string;
  bookId: string;
  currentPage: number;
  expectedCurrentPage: number;
  idempotencyKey: string;
  readingTime?: number;
};

export type UpdateReadingProgressResult =
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
    input.currentPage < 0 ||
    !Number.isSafeInteger(input.expectedCurrentPage) ||
    input.expectedCurrentPage < 0 ||
    !RequestIdSchema.safeParse(input.idempotencyKey).success ||
    (input.readingTime !== undefined &&
      (!Number.isSafeInteger(input.readingTime) ||
        input.readingTime < 0 ||
        input.readingTime > 28_800))
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

    const { data: progressData, error: progressError } = await supabase.rpc(
      "update_reading_progress",
      {
        p_book_id: input.bookId,
        p_current_page: input.currentPage,
        p_expected_current_page: input.expectedCurrentPage,
        p_idempotency_key: input.idempotencyKey,
        p_reading_time: input.readingTime ?? 0,
      },
    );

    if (progressError) {
      return { ok: false, code: mapProgressError(progressError) };
    }

    const progressResult = getProgressResult(progressData);
    if (!progressResult || typeof progressResult.history_recorded !== "boolean") {
      return { ok: false, code: "unavailable" };
    }

    const { data: updatedBook, error: readError } = await supabase
      .from("books")
      .select(consumerBookSelect)
      .eq("id", input.bookId)
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .maybeSingle();

    if (readError) return { ok: false, code: "unavailable" };
    if (!updatedBook || typeof updatedBook !== "object") {
      return { ok: false, code: "not_found" };
    }

    const book = parseConsumerBook(updatedBook as Record<string, unknown>);
    if (!book) return { ok: false, code: "unavailable" };

    revalidateReadingProgressPaths(input);

    if (input.currentPage > input.expectedCurrentPage && !progressResult.history_recorded) {
      return { ok: false, code: "history_unavailable" };
    }

    return {
      ok: true,
      book,
      historyRecorded: progressResult.history_recorded,
    };
  } catch {
    return { ok: false, code: "unavailable" };
  }
}

function getProgressResult(data: unknown): Record<string, unknown> | null {
  const result = Array.isArray(data) ? data[0] : data;
  return result && typeof result === "object"
    ? (result as Record<string, unknown>)
    : null;
}

function mapProgressError(error: { code?: string; message?: string }) {
  if (error.code === "42501" || error.message === "unauthorized") {
    return "unauthenticated" as const;
  }
  if (error.code === "P0002" || error.message === "book_not_found") {
    return "not_found" as const;
  }
  if (error.code === "P0001") return "conflict" as const;
  if (error.code === "22023") return "invalid_input" as const;
  return "unavailable" as const;
}

function revalidateReadingProgressPaths(input: UpdateReadingProgressInput) {
  revalidatePath(`/${input.locale}/home`);
  revalidatePath(`/${input.locale}/books/${input.bookId}`);
  revalidatePath(`/${input.locale}/reading/${input.bookId}`);
}
