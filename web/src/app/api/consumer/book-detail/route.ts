import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { applyBookDetailFixtureAction } from "@/lib/consumer/book-detail-fixtures";
import { getConsumerRouteFixture } from "@/lib/consumer/route-fixture";
import {
  BookDetailRequestSchema,
  canApplyBookDetailAction,
  type BookDetailRequest,
  type BookDetailResponse,
} from "@/lib/product/contracts";
import { deleteBook, getBook, updateBook } from "@/lib/product/dal";
import { productErrorResponse } from "@/lib/product/dal/http";
import {
  validationError,
  type ProductError,
} from "@/lib/product/dal/errors";

function privateJson(body: BookDetailResponse, status = 200): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
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
}) {
  const now = new Date().toISOString();
  if (input.action === "pause") {
    return updateBook({
      bookId: input.bookId,
      status: "will_retry",
      pausedAt: now,
    });
  }
  if (input.action === "complete") {
    return updateBook({
      bookId: input.bookId,
      status: "completed",
      pausedAt: null,
    });
  }
  return updateBook({
    bookId: input.bookId,
    status: "reading",
    startDate: now,
    targetDate: input.targetDate,
    plannedStartDate: null,
    pausedAt: null,
    ...(input.action === "resume" ? { attemptCount: input.currentAttemptCount + 1 } : {}),
  });
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return privateError(validationError());
  }

  const parsed = BookDetailRequestSchema.safeParse(body);
  if (!parsed.success) return privateError(validationError());

  const input = parsed.data;
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

  const current = await getBook(input.bookId);
  if (!current.ok) return privateError(current.error);
  if (!canApplyBookDetailAction(current.value.status, input.action)) {
    return privateError(validationError("This book action is not available for its current status."));
  }

  if (input.action === "delete") {
    const deleted = await deleteBook(input.bookId);
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
