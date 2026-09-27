import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import {
  LibraryRecordTypeSchema,
  LibraryTabSchema,
  LocaleSchema,
  type LibraryTab,
  type ReadingRecord,
} from "@/lib/product/contracts";
import {
  listGlobalRecallHistory,
  searchRecall,
} from "@/lib/product/adapters";
import { listBooks, listOwnedReadingRecords } from "@/lib/product/dal";
import {
  consentRequiredError,
  quotaExceededError,
  unavailableError,
  unauthorizedError,
  validationError,
} from "@/lib/product/dal";
import { productErrorResponse } from "@/lib/product/dal/http";
import { getConsumerRouteFixture } from "@/lib/consumer/route-fixture";
import { getLibraryFixturePage } from "@/lib/consumer/library-fixtures";
import type { LibraryPayload } from "@/lib/consumer/library";

function readLimit(value: string | null): number | null {
  if (value === null) return 25;
  const limit = Number(value);
  return Number.isInteger(limit) && limit >= 1 && limit <= 100 ? limit : null;
}

function response(payload: LibraryPayload) {
  return NextResponse.json(payload, {
    headers: { "Cache-Control": "private, no-store" },
  });
}

function emptyPayload(tab: LibraryPayload["tab"]): LibraryPayload {
  return {
    tab,
    books: [],
    records: [],
    history: [],
    recall: null,
    pageInfo: { nextCursor: null, hasMore: false },
    counts: { reading: 0, review: 0, records: 0 },
  };
}

function getTab(request: NextRequest): LibraryTab | null {
  const params = request.nextUrl.searchParams;
  const raw = params.get("mode") === "recall" ? "recall" : params.get("tab") ?? "reading";
  const parsed = LibraryTabSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  if (["user_id", "userId", "p_user_id", "owner_id"].some((key) => params.has(key))) {
    return productErrorResponse(validationError("Ownership is derived from the authenticated session."));
  }

  const tab = getTab(request);
  const locale = LocaleSchema.safeParse(params.get("locale") ?? "en");
  const limit = readLimit(params.get("limit"));
  const cursor = params.get("cursor");
  const query = (params.get("query") ?? "").trim();
  const recordType = params.get("recordType");
  const parsedRecordType = recordType === null ? undefined : LibraryRecordTypeSchema.safeParse(recordType);
  if (!tab || !locale.success || limit === null || (recordType !== null && (!parsedRecordType || !parsedRecordType.success))) {
    return productErrorResponse(validationError());
  }
  if (query.length > 500 || (tab !== "recall" && query.length > 200)) {
    return productErrorResponse(validationError());
  }

  let fixture: string | null = null;
  try {
    fixture = getConsumerRouteFixture((await cookies()).get("bookgolas-route-fixture")?.value);
  } catch {
    fixture = null;
  }
  if (fixture?.startsWith("library-")) {
    if (fixture === "library-unauthorized") return productErrorResponse(unauthorizedError());
    if (fixture === "library-network" || fixture === "library-error") return productErrorResponse(unavailableError());
    if (fixture === "library-quota") return productErrorResponse(quotaExceededError("AI Recall quota exceeded."));
    if (fixture === "library-consent") return productErrorResponse(consentRequiredError("AI Recall consent is required."));
    const page = await getLibraryFixturePage({
      fixture,
      tab,
      query,
      cursor,
      limit,
      recordType,
    });
    return response(page);
  }

  if (tab === "recall") {
    if (!query) {
      const history = await listGlobalRecallHistory({ limit });
      return history.ok
        ? response({ ...emptyPayload("recall"), history: history.value })
        : productErrorResponse(history.error);
    }
    const result = await searchRecall({ query, locale: locale.data });
    return result.ok
      ? response({ ...emptyPayload("recall"), recall: result.value })
      : productErrorResponse(result.error);
  }

  if (tab === "records") {
    const records = await listOwnedReadingRecords({
      pagination: { ...(cursor === null ? {} : { cursor }), limit },
      ...(parsedRecordType && parsedRecordType.success ? { contentType: parsedRecordType.data } : {}),
    });
    return records.ok
      ? response({
          ...emptyPayload("records"),
          records: records.value.records as ReadingRecord[],
          pageInfo: records.value.pageInfo,
          counts: { reading: 0, review: 0, records: records.value.records.length },
        })
      : productErrorResponse(records.error);
  }

  const books = await listBooks({
    pagination: { ...(cursor === null ? {} : { cursor }), limit },
    sort: { field: "updated_at", direction: "desc" },
    ...(query ? { query } : {}),
    ...(tab === "review" ? { reviewOnly: true } : {}),
  });
  return books.ok
    ? response({
        ...emptyPayload(tab),
        books: books.value.books,
        pageInfo: books.value.pageInfo,
        counts: {
          reading: tab === "reading" ? books.value.books.length : 0,
          review: tab === "review" ? books.value.books.length : 0,
          records: 0,
        },
      })
    : productErrorResponse(books.error);
}
