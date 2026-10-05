import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import {
  BookIdSchema,
  RecordIdSchema,
} from "@/shared/api/contracts";
import {
  NotesHighlightsMutationSchema,
  type NotesHighlightsResponse,
} from "@/features/notes-highlights/index.server";
import {
  createOwnedConsumerRecord,
  deleteOwnedConsumerRecord,
  listOwnedConsumerRecords,
  retryOwnedConsumerRecordIndex,
  updateOwnedConsumerRecord,
} from "@/features/notes-highlights/index.server";
import { productErrorResponse } from "@/shared/api/product/index.server";
import { validationError, type ProductError } from "@/shared/api/product/errors";
import { getConsumerRouteFixture } from "@/shared/config";
import {
  applyNotesHighlightsFixtureMutation,
  getNotesHighlightsFixtureRecords,
} from "@/features/notes-highlights/index.server";

function privateJson(body: NotesHighlightsResponse, status = 200): NextResponse {
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
    `/${locale}/books/${bookId}`,
    `/${locale}/reading/${bookId}`,
    `/${locale}/library`,
  ];
}

function revalidatePrivateViews(paths: readonly string[]) {
  for (const path of paths) revalidatePath(path);
}

function isNotesFixture(fixture: string | null): boolean {
  return fixture?.startsWith("notes-highlights-") ?? false;
}

function routeFixture(cookieValue: string | undefined): string | null {
  return getConsumerRouteFixture(cookieValue);
}

export async function getConsumerNotesHighlights(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  if (["user_id", "userId", "p_user_id", "owner_id"].some((key) => params.has(key))) {
    return privateError(validationError("Ownership is derived from the authenticated session."));
  }
  const bookId = BookIdSchema.safeParse(params.get("bookId"));
  if (!bookId.success) return privateError(validationError());

  const fixture = routeFixture(request.cookies.get("bookgolas-route-fixture")?.value);
  if (isNotesFixture(fixture)) {
    const result = getNotesHighlightsFixtureRecords(fixture!, bookId.data);
    return result.ok
      ? privateJson({ kind: "list", records: result.value })
      : privateError(result.error);
  }

  const result = await listOwnedConsumerRecords(bookId.data);
  return result.ok
    ? privateJson({ kind: "list", records: result.value })
    : privateError(result.error);
}

export async function postConsumerNotesHighlights(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return privateError(validationError());
  }
  const parsed = NotesHighlightsMutationSchema.safeParse(body);
  if (!parsed.success) return privateError(validationError());
  const input = parsed.data;
  const paths = invalidatedPaths(input.locale, input.bookId);
  const fixture = routeFixture(request.cookies.get("bookgolas-route-fixture")?.value);

  if (isNotesFixture(fixture)) {
    const result = applyNotesHighlightsFixtureMutation(fixture!, input);
    if (!result.ok) return privateError(result.error);
    revalidatePrivateViews(paths);
    if (input.action === "delete") {
      if (!result.value.recordId) return privateError(validationError());
      return privateJson({ kind: "deleted", recordId: RecordIdSchema.parse(result.value.recordId), invalidatedPaths: paths });
    }
    if (!result.value.record) return privateError(validationError());
    return privateJson({
      kind: input.action === "retry" ? "retry" : "saved",
      record: result.value.record,
      duplicate: result.value.duplicate,
      invalidatedPaths: paths,
    });
  }

  if (input.action === "create") {
    const result = await createOwnedConsumerRecord(input);
    if (!result.ok) return privateError(result.error);
    revalidatePrivateViews(paths);
    return privateJson({ kind: "saved", record: result.value.record, duplicate: result.value.duplicate, invalidatedPaths: paths });
  }
  if (input.action === "update") {
    const result = await updateOwnedConsumerRecord(input);
    if (!result.ok) return privateError(result.error);
    revalidatePrivateViews(paths);
    return privateJson({ kind: "saved", record: result.value.record, duplicate: result.value.duplicate, invalidatedPaths: paths });
  }
  if (input.action === "retry") {
    const result = await retryOwnedConsumerRecordIndex(input);
    if (!result.ok) return privateError(result.error);
    revalidatePrivateViews(paths);
    return privateJson({ kind: "retry", record: result.value.record, duplicate: result.value.duplicate, invalidatedPaths: paths });
  }
  const result = await deleteOwnedConsumerRecord(input);
  if (!result.ok) return privateError(result.error);
  revalidatePrivateViews(paths);
  return privateJson({ kind: "deleted", recordId: RecordIdSchema.parse(result.value.recordId), invalidatedPaths: paths });
}
