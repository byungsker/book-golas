import "server-only";

import { cookies } from "next/headers";
import { getConsumerAuthContext } from "@/shared/auth/index.server";
import { getConsumerRouteFixture } from "@/shared/config";
import { isBookId } from "@/entities/book";
import { ProgressEventSchema, type ProgressEvent } from "@/shared/api/contracts";
import { getProgressFixtureSnapshot } from "../model/progress-fixtures";

export type OwnedProgressHistoryResult = {
  history: ProgressEvent[];
  code: "ok" | "unauthenticated" | "unavailable" | "not_found";
  authenticated: boolean;
};

export async function fetchOwnedProgressHistory(
  bookId: string,
): Promise<OwnedProgressHistoryResult> {
  const context = await getConsumerAuthContext();
  if (!isBookId(bookId)) {
    return {
      history: [],
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
  if (routeFixture?.startsWith("progress-")) {
    const snapshot = getProgressFixtureSnapshot({ fixture: routeFixture, bookId });
    return snapshot
      ? { history: snapshot.history, code: "ok", authenticated: true }
      : { history: [], code: "not_found", authenticated: true };
  }

  if (context.unavailable || !context.supabase) {
    return context.user
      ? { history: [], code: "unavailable", authenticated: true }
      : { history: [], code: "unavailable", authenticated: false };
  }
  if (!context.user) {
    return { history: [], code: "unauthenticated", authenticated: false };
  }

  try {
    const ownedBook = await context.supabase
      .from("books")
      .select("id")
      .eq("id", bookId)
      .eq("user_id", context.user.id)
      .is("deleted_at", null)
      .maybeSingle();
    if (ownedBook.error) return { history: [], code: "unavailable", authenticated: true };
    if (!ownedBook.data) return { history: [], code: "not_found", authenticated: true };

    const { data, error } = await context.supabase
      .from("reading_progress_history")
      .select("id,book_id,page,previous_page,reading_time,created_at")
      .eq("book_id", bookId)
      .eq("user_id", context.user.id)
      .order("created_at", { ascending: true });
    if (error || !Array.isArray(data)) {
      return { history: [], code: "unavailable", authenticated: true };
    }

    const history: ProgressEvent[] = [];
    for (const row of data) {
      if (!row || typeof row !== "object") {
        return { history: [], code: "unavailable", authenticated: true };
      }
      const value = row as Record<string, unknown>;
      const parsed = ProgressEventSchema.safeParse({
        id: value.id,
        bookId: value.book_id,
        page: value.page,
        previousPage: value.previous_page ?? 0,
        ...(typeof value.reading_time === "number" ? { readingTime: value.reading_time } : {}),
        createdAt: value.created_at,
      });
      if (!parsed.success) return { history: [], code: "unavailable", authenticated: true };
      history.push(parsed.data);
    }
    return { history, code: "ok", authenticated: true };
  } catch {
    return { history: [], code: "unavailable", authenticated: true };
  }
}
