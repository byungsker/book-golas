import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { updateReadingProgress } from "@/app/actions/reading-progress";
import { applyProgressFixture } from "@/lib/consumer/progress-fixtures";
import { fetchOwnedProgressHistory } from "@/lib/consumer/queries";
import { getConsumerRouteFixture } from "@/lib/consumer/route-fixture";
import {
  ProgressUiRequestSchema,
  type ProgressUiSuccess,
} from "@/lib/product/contracts";
import {
  conflictError,
  historyUnavailableError,
  notFoundError,
  offlineError,
  unauthorizedError,
  unavailableError,
  validationError,
  type ProductError,
} from "@/lib/product/dal/errors";
import type { UpdateReadingProgressResult } from "@/app/actions/reading-progress";

function privateJson(body: ProgressUiSuccess, status = 200): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}

function privateError(error: ProductError): NextResponse {
  const response = NextResponse.json({ error }, { status: error.status });
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

function invalidatedPaths(locale: "ko" | "en", bookId: string): string[] {
  return [
    `/${locale}/home`,
    `/${locale}/library`,
    `/${locale}/books/${bookId}`,
    `/${locale}/reading/${bookId}`,
  ];
}

function actionError(code: UpdateReadingProgressResult extends infer Result
  ? Result extends { ok: false; code: infer Code }
    ? Code
    : never
  : never): ProductError {
  if (code === "invalid_input") return validationError();
  if (code === "unauthenticated") return unauthorizedError();
  if (code === "not_found") return notFoundError();
  if (code === "conflict") return conflictError();
  if (code === "history_unavailable") return historyUnavailableError();
  if (code === "unavailable") return unavailableError();
  return unavailableError();
}

function refreshPaths(paths: string[]) {
  for (const path of paths) revalidatePath(path);
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return privateError(validationError());
  }

  const parsed = ProgressUiRequestSchema.safeParse(body);
  if (!parsed.success) return privateError(validationError());

  const input = parsed.data;
  const paths = invalidatedPaths(input.locale, input.bookId);
  const fixture = getConsumerRouteFixture(
    request.cookies.get("bookgolas-route-fixture")?.value,
  );

  if (fixture?.startsWith("progress-")) {
    const result = applyProgressFixture(fixture, input);
    if (!result.ok) return privateError(result.error);
    refreshPaths(paths);
    return privateJson({
      kind: "updated",
      book: result.value.book,
      history: result.value.history,
      historyRecorded: result.value.historyRecorded,
      duplicate: result.value.duplicate,
      invalidatedPaths: paths,
    });
  }

  const result = await updateReadingProgress(input);
  if (!result.ok) return privateError(actionError(result.code));

  const history = await fetchOwnedProgressHistory(input.bookId);
  if (history.code !== "ok") {
    if (history.code === "unauthenticated") return privateError(unauthorizedError());
    if (history.code === "not_found") return privateError(notFoundError());
    if (history.code === "unavailable") return privateError(historyUnavailableError());
    return privateError(offlineError());
  }

  refreshPaths(paths);
  return privateJson({
    kind: "updated",
    book: result.book,
    history: history.history,
    historyRecorded: result.historyRecorded,
    duplicate: false,
    invalidatedPaths: paths,
  });
}
