import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { getBookLifecycleFixture } from "@/entities/book/index.server";
import { getBookDetailFixture } from "@/entities/book/index.server";
import { getConsumerRouteFixture } from "@/shared/config";
import { BookLifecycleRequestSchema, type BookLifecycleResponse } from "@/entities/book";
import { createBook, getBook, updateBook } from "@/entities/book/index.server";
import { productErrorResponse } from "@/shared/api/product/index.server";
import { conflictError, validationError, type ProductError } from "@/shared/api/product/errors";

function privateJson(body: BookLifecycleResponse, status = 200): NextResponse {
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

function updateRevision(request: NextRequest):
  | { readonly ok: true; readonly value: string }
  | { readonly ok: false; readonly response: NextResponse } {
  const value = request.headers.get("if-match");
  if (!value) return { ok: false, response: NextResponse.json({ error: { code: "precondition_required", status: 428, message: "If-Match is required.", retryable: false } }, { status: 428, headers: { "Cache-Control": "private, no-store" } }) };
  const revision = value.match(/^"([^"\\]+)"$/)?.[1];
  return revision && Number.isFinite(Date.parse(revision))
    ? { ok: true, value: revision }
    : { ok: false, response: privateError(validationError("If-Match must be a quoted revision.")) };
}

function invalidatedPaths(locale: "ko" | "en", bookId: string): string[] {
  return [
    `/${locale}/home`,
    `/${locale}/library`,
    `/${locale}/books/${bookId}`,
    `/${locale}/reading/${bookId}`,
  ];
}

export async function postConsumerBookLifecycle(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return privateError(validationError());
  }

  const parsed = BookLifecycleRequestSchema.safeParse(body);
  if (!parsed.success) return privateError(validationError());

  const input = parsed.data;
  const revision = input.action === "update" ? updateRevision(request) : null;
  if (revision && !revision.ok) return revision.response;
  const actionKey = request.headers.get("x-bookgolas-action-key");
  const validActionKey = input.action === "create"
    ? actionKey !== null && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(actionKey)
    : actionKey === `${input.book.bookId}:update:${revision?.value}`;
  if (!validActionKey || !actionKey) return privateError(validationError("The action key is invalid."));
  const fixture = getConsumerRouteFixture(request.cookies.get("bookgolas-route-fixture")?.value);
  if (fixture?.startsWith("book-detail-") && input.action === "update") {
    const current = getBookDetailFixture({ fixture, bookId: input.book.bookId });
    if (!current.ok) return privateError(current.error);
    if (current.value.status !== "planned") {
      return privateError(validationError("Only planned books can be edited from this dialog."));
    }
    const book = {
      ...current.value,
      plannedStartDate: input.book.plannedStartDate ?? current.value.plannedStartDate,
      priority: input.book.priority === undefined ? current.value.priority : input.book.priority,
      updatedAt: new Date().toISOString(),
    };
    const paths = invalidatedPaths(input.locale, book.id);
    for (const path of paths) revalidatePath(path);
    return privateJson({ kind: "saved", action: "update", book, invalidatedPaths: paths });
  }
  if (!fixture?.startsWith("book-lifecycle-") && input.action === "update") {
    const current = await getBook(input.book.bookId);
    if (!current.ok) return privateError(current.error);
    if (current.value.updatedAt !== revision?.value) {
      return privateError(conflictError("This book changed after the editor was opened."));
    }
  }
  let result: Awaited<ReturnType<typeof createBook>>;
  if (fixture?.startsWith("book-lifecycle-")) {
    result = await getBookLifecycleFixture({ fixture, action: input.action, book: input.book });
  } else if (input.action === "create") {
    const existing = await getBook(actionKey);
    if (existing.ok) return privateError(conflictError("This action key has already been applied."));
    if (existing.error.code !== "not_found") return privateError(existing.error);
    result = await createBook(input.book, undefined, actionKey);
  } else {
    result = await updateBook(input.book, undefined, revision?.value);
  }

  if (!result.ok) return privateError(result.error);

  const paths = invalidatedPaths(input.locale, result.value.id);
  for (const path of paths) revalidatePath(path);

  return privateJson({
    kind: "saved",
    action: input.action,
    book: result.value,
    invalidatedPaths: paths,
  }, input.action === "create" ? 201 : 200);
}
