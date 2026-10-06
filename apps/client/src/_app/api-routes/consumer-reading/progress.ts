import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import {
  applyProgressFixture,
  applyProgressScheduleFixture,
  fetchOwnedProgressHistory,
  ProgressUiMutationRequestSchema,
  type ProgressScheduleRequest,
  type ProgressScheduleSuccess,
  type ProgressUiRequest,
  type ProgressUiSuccess,
  updateReadingProgress,
  type UpdateReadingProgressResult,
} from "@/features/reading-progress/index.server";
import { getConsumerRouteFixture } from "@/shared/config";
import { getBook, updateBook } from "@/entities/book/index.server";
import {
  conflictError,
  historyUnavailableError,
  notFoundError,
  offlineError,
  unauthorizedError,
  unavailableError,
  validationError,
  type ProductError,
} from "@/shared/api/product/errors";

function privateJson(body: ProgressUiSuccess | ProgressScheduleSuccess, status = 200): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}

function mutationHeaders(
  request: NextRequest,
  input: ProgressUiRequest | ProgressScheduleRequest,
): { readonly ok: true } | { readonly ok: false; readonly response: NextResponse } {
  const revision = "action" in input ? input.expectedUpdatedAt : String(input.expectedCurrentPage);
  const ifMatch = request.headers.get("if-match");
  if (!ifMatch) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: { code: "precondition_required", status: 428, message: "If-Match is required.", retryable: false } },
        { status: 428, headers: { "Cache-Control": "private, no-store" } },
      ),
    };
  }
  if (ifMatch !== `"${revision}"`) {
    return { ok: false, response: privateError(validationError("If-Match does not match the request revision.")) };
  }
  const operation = "action" in input ? "schedule" : "progress";
  const expectedKey = `${input.bookId}:${operation}:${revision}:${input.idempotencyKey}`;
  if (request.headers.get("x-bookgolas-action-key") !== expectedKey) {
    return { ok: false, response: privateError(validationError("The action key is invalid.")) };
  }
  return { ok: true };
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

async function updateSchedule(
  input: ProgressScheduleRequest,
  fixture: string | null,
  paths: string[],
): Promise<NextResponse> {
  if (fixture?.startsWith("progress-")) {
    const result = applyProgressScheduleFixture(fixture, input);
    if (!result.ok) return privateError(result.error);
    refreshPaths(paths);
    return privateJson({
      kind: "schedule_updated",
      book: result.value,
      duplicate: false,
      invalidatedPaths: paths,
    });
  }

  const current = await getBook(input.bookId);
  if (!current.ok) return privateError(current.error);
  if (current.value.updatedAt !== input.expectedUpdatedAt) return privateError(conflictError());
  if (
    input.dailyTargetPages !== undefined &&
    input.dailyTargetPages > Math.max(1, current.value.totalPages)
  ) {
    return privateError(validationError("The daily target must not exceed the total page count."));
  }
  const result = await updateBook({
    bookId: input.bookId,
    ...(input.targetDate ? { targetDate: input.targetDate } : {}),
    ...(input.dailyTargetPages !== undefined ? { dailyTargetPages: input.dailyTargetPages } : {}),
  }, undefined, input.expectedUpdatedAt);
  if (!result.ok) return privateError(result.error);
  refreshPaths(paths);
  return privateJson({
    kind: "schedule_updated",
    book: result.value,
    duplicate: false,
    invalidatedPaths: paths,
  });
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return privateError(validationError());
  }

  const parsed = ProgressUiMutationRequestSchema.safeParse(body);
  if (!parsed.success) return privateError(validationError());

  const input = parsed.data;
  const headers = mutationHeaders(request, input);
  if (!headers.ok) return headers.response;
  const paths = invalidatedPaths(input.locale, input.bookId);
  const fixture = getConsumerRouteFixture(
    request.cookies.get("bookgolas-route-fixture")?.value,
  );

  if ("action" in input) return updateSchedule(input, fixture, paths);

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

export const postConsumerProgress = POST;
