import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { applyBookDetailFixtureAction } from "@/entities/book/index.server";
import { getConsumerRouteFixture } from "@/shared/config";
import {
  BookDetailRequestSchema,
  canApplyBookDetailAction,
  type BookDetailRequest,
  type BookDetailResponse,
} from "@/entities/book";
import { getBook, updateBook } from "@/entities/book/index.server";
import { productErrorResponse } from "@/shared/api/product/index.server";
import {
  conflictError,
  validationError,
  type ProductError,
} from "@/shared/api/product/errors";
import { deleteBookAndImages } from "../book-deletion";

function privateJson(body: BookDetailResponse, status = 200): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}

function mutationHeaders(request: NextRequest, input: BookDetailRequest):
  | { readonly ok: true; readonly revision: string }
  | { readonly ok: false; readonly response: NextResponse } {
  const ifMatch = request.headers.get("if-match");
  if (!ifMatch) {
    return { ok: false, response: NextResponse.json({ error: { code: "precondition_required", status: 428, message: "If-Match is required.", retryable: false } }, { status: 428, headers: { "Cache-Control": "private, no-store" } }) };
  }
  const revision = ifMatch.match(/^"(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)"$/)?.[1];
  const revisionTimestamp = revision ? Date.parse(revision) : Number.NaN;
  if (
    !revision ||
    !Number.isFinite(revisionTimestamp) ||
    new Date(revisionTimestamp).toISOString() !== revision
  ) {
    return { ok: false, response: privateError(validationError("If-Match must be a quoted revision.")) };
  }
  const expectedKey = `${input.bookId}:${input.action}:${revision}`;
  if (request.headers.get("x-bookgolas-action-key") !== expectedKey) {
    return { ok: false, response: privateError(validationError("The action key is invalid.")) };
  }
  return { ok: true, revision };
}

function privateError(error: ProductError): NextResponse {
  const response = productErrorResponse(error);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

function invalidatedPaths(locale: "ko" | "en", bookId: string): string[] {
  return [
    `/${locale}/home`,
    `/${locale}/library`,
    `/${locale}/books/${bookId}`,
    `/${locale}/reading/${bookId}`,
    `/${locale}/books/${bookId}/review`,
    `/${locale}/books/${bookId}/mind-map`,
  ];
}

function currentActionUpdate(input: {
  action: "start" | "resume" | "pause" | "complete";
  bookId: BookDetailRequest["bookId"];
  targetDate?: string;
  currentAttemptCount: number;
  revision: string;
}) {
  const now = new Date().toISOString();
  if (input.action === "pause") {
    return updateBook({
      bookId: input.bookId,
      status: "will_retry",
      pausedAt: now,
    }, undefined, input.revision);
  }
  if (input.action === "complete") {
    return updateBook({
      bookId: input.bookId,
      status: "completed",
      pausedAt: null,
    }, undefined, input.revision);
  }
  return updateBook({
    bookId: input.bookId,
    status: "reading",
    startDate: now,
    targetDate: input.targetDate,
    plannedStartDate: null,
    pausedAt: null,
    ...(input.action === "resume" ? { attemptCount: input.currentAttemptCount + 1 } : {}),
  }, undefined, input.revision);
}

export async function postConsumerBookDetail(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return privateError(validationError());
  }

  const parsed = BookDetailRequestSchema.safeParse(body);
  if (!parsed.success) return privateError(validationError());

  const input = parsed.data;
  const headers = mutationHeaders(request, input);
  if (!headers.ok) return headers.response;
  const fixture = getConsumerRouteFixture(
    request.cookies.get("bookgolas-route-fixture")?.value,
  );
  const paths = invalidatedPaths(input.locale, input.bookId);

  if (fixture?.startsWith("book-detail-")) {
    const result = applyBookDetailFixtureAction({
      fixture,
      action: input.action,
      bookId: input.bookId,
      ...(input.targetDate ? { targetDate: input.targetDate } : {}),
    });
    if (!result.ok) return privateError(result.error);
    for (const path of paths) revalidatePath(path);
    if (input.action === "delete") {
      return privateJson({
        kind: "deleted",
        action: "delete",
        book: null,
        invalidatedPaths: paths,
      });
    }
    return privateJson({
      kind: "updated",
      action: input.action,
      book: result.value,
      invalidatedPaths: paths,
    });
  }

  const current = await getBook(input.bookId, undefined, input.action === "delete");
  if (!current.ok) return privateError(current.error);
  if (current.value.deletedAt) return privateError(conflictError("This action key has already been applied."));
  if (current.value.updatedAt !== headers.revision) return privateError(conflictError());
  if (!canApplyBookDetailAction(current.value.status, input.action)) {
    return privateError(validationError("This book action is not available for its current status."));
  }

  if (input.action === "delete") {
    const deleted = await deleteBookAndImages(input.bookId, headers.revision);
    if (!deleted.ok) return privateError(deleted.error);
    for (const path of paths) revalidatePath(path);
    return privateJson({
      kind: "deleted",
      action: "delete",
      book: null,
      invalidatedPaths: paths,
    });
  }

  const updated = await currentActionUpdate({
    action: input.action,
    bookId: input.bookId,
    ...(input.targetDate ? { targetDate: input.targetDate } : {}),
    currentAttemptCount: current.value.attemptCount,
    revision: headers.revision,
  });
  if (!updated.ok) return privateError(updated.error);
  for (const path of paths) revalidatePath(path);
  return privateJson({
    kind: "updated",
    action: input.action,
    book: updated.value,
    invalidatedPaths: paths,
  });
}
