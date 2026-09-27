import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import {
  deleteRecallHistory,
  listBookRecallHistoryPage,
  listGlobalRecallHistoryPage,
  searchRecall,
} from "@/lib/product/adapters";
import {
  BookIdSchema,
  LocaleSchema,
  RecallDeleteHistoryRequestSchema,
  RecallHistoryPageSchema,
  RecallSearchApiRequestSchema,
  RecallSearchResponseSchema,
  type BookId,
} from "@/lib/product/contracts";
import { productErrorResponse } from "@/lib/product/dal/http";
import { validationError } from "@/lib/product/dal/errors";
import { getConsumerRouteFixture } from "@/lib/consumer/route-fixture";
import {
  getRecallFixtureDelete,
  getRecallFixtureHistory,
  getRecallFixtureSearch,
} from "@/lib/consumer/recall-fixtures";
import type {
  RecallDeleteHistoryResponse,
  RecallHistoryPage,
  RecallSearchResponse,
} from "@/lib/product/contracts";

function privateJson(body: unknown, status = 200): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}

function readLimit(value: string | null): number | null {
  if (value === null) return 10;
  const limit = Number(value);
  return Number.isInteger(limit) && limit >= 1 && limit <= 100 ? limit : null;
}

function readCursor(value: string | null): string | null | undefined {
  if (value === null) return null;
  if (!/^\d{1,8}$/.test(value)) return undefined;
  return value;
}

function scopeFor(bookId: string | null): "global" | "book" {
  return bookId === null ? "global" : "book";
}

function isRecallFixture(fixture: string | null): boolean {
  return fixture?.startsWith("recall-") || [
    "library-consent",
    "library-error",
    "library-network",
    "library-quota",
    "library-recall",
    "library-recall-empty",
    "library-unauthorized",
  ].includes(fixture ?? "");
}

async function fixtureFromRequest(request: NextRequest): Promise<string | null> {
  try {
    return getConsumerRouteFixture(
      (await cookies()).get("bookgolas-route-fixture")?.value ?? request.cookies.get("bookgolas-route-fixture")?.value,
    );
  } catch {
    return null;
  }
}

function rejectCallerIdentity(request: NextRequest): NextResponse | null {
  const params = request.nextUrl.searchParams;
  return ["user_id", "userId", "p_user_id", "owner_id"].some((key) => params.has(key))
    ? productErrorResponse(validationError("Ownership is derived from the authenticated session."))
    : null;
}

function validHistoryPage(value: RecallHistoryPage): NextResponse {
  const parsed = RecallHistoryPageSchema.safeParse(value);
  return parsed.success ? privateJson(parsed.data) : productErrorResponse(validationError("Recall history is malformed."));
}

function validSearchResponse(value: RecallSearchResponse): NextResponse {
  const parsed = RecallSearchResponseSchema.safeParse(value);
  return parsed.success ? privateJson(parsed.data) : productErrorResponse(validationError("Recall search is malformed."));
}

export async function GET(request: NextRequest) {
  const identityError = rejectCallerIdentity(request);
  if (identityError) return identityError;
  const params = request.nextUrl.searchParams;
  const locale = LocaleSchema.safeParse(params.get("locale") ?? "en");
  const rawBookId = params.get("bookId");
  const parsedBookId = rawBookId === null ? null : BookIdSchema.safeParse(rawBookId);
  const limit = readLimit(params.get("limit"));
  const cursor = readCursor(params.get("cursor"));
  const bookIdValid = rawBookId === null || (parsedBookId !== null && parsedBookId.success);
  if (!locale.success || !bookIdValid || limit === null || cursor === undefined || (params.get("mode") ?? "history") !== "history") {
    return productErrorResponse(validationError());
  }
  const scopedBookId: BookId | null = rawBookId === null
    ? null
    : parsedBookId !== null && parsedBookId.success
      ? parsedBookId.data
      : null;

  const fixture = await fixtureFromRequest(request);
  if (fixture !== null && isRecallFixture(fixture)) {
    const page = getRecallFixtureHistory({
      fixture,
      scope: scopeFor(rawBookId),
      bookId: scopedBookId,
      cursor,
      limit,
    });
    return page.ok ? validHistoryPage(page.value) : productErrorResponse(page.error);
  }

  const history = rawBookId === null
    ? await listGlobalRecallHistoryPage({ limit, cursor })
    : await listBookRecallHistoryPage(scopedBookId as BookId, { limit, cursor });
  if (!history.ok) return productErrorResponse(history.error);
  const page: RecallHistoryPage = {
    kind: "history",
    scope: scopeFor(rawBookId),
    bookId: scopedBookId,
    history: history.value.history,
    suggestions: [...new Set(history.value.history.map((item) => item.query))].slice(0, 8),
    pageInfo: history.value.pageInfo,
  };
  return validHistoryPage(page);
}

async function readJson(request: NextRequest): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const body = await readJson(request);
  const search = RecallSearchApiRequestSchema.safeParse(body);
  const deletion = RecallDeleteHistoryRequestSchema.safeParse(body);
  if (!search.success && !deletion.success) return productErrorResponse(validationError());

  if (search.success) {
    const input = search.data;
    const fixture = await fixtureFromRequest(request);
    if (fixture !== null && isRecallFixture(fixture)) {
      const result = getRecallFixtureSearch({
        fixture,
        scope: input.bookId ? "book" : "global",
        bookId: input.bookId ?? null,
      });
      return result.ok ? validSearchResponse(result.value) : productErrorResponse(result.error);
    }
    const result = await searchRecall({
      query: input.query,
      locale: input.locale,
      ...(input.bookId ? { bookId: input.bookId } : {}),
    });
    if (!result.ok) return productErrorResponse(result.error);
    const response: RecallSearchResponse = {
      kind: "search",
      scope: input.bookId ? "book" : "global",
      bookId: input.bookId ?? null,
      result: result.value,
    };
    return validSearchResponse(response);
  }

  if (!deletion.success) return productErrorResponse(validationError());
  const input = deletion.data;
  const fixture = await fixtureFromRequest(request);
  if (fixture !== null && isRecallFixture(fixture)) {
    const result = getRecallFixtureDelete(input.historyId);
    return result.ok ? privateJson(result.value) : productErrorResponse(result.error);
  }
  const result = await deleteRecallHistory(input.historyId);
  if (!result.ok) return productErrorResponse(result.error);
  const response: RecallDeleteHistoryResponse = {
    kind: "deleted",
    historyId: result.value.historyId as RecallDeleteHistoryResponse["historyId"],
    deleted: result.value.deleted,
  };
  return privateJson(response);
}
