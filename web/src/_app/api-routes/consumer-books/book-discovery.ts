import { NextRequest, NextResponse } from "next/server";
import { getBookDiscoveryFixture, isValidIsbn13, normalizeIsbn13 } from "@/features/book-discovery/index.server";
import { getConsumerRouteFixture } from "@/shared/config";
import {
  BookDiscoveryRequestSchema,
  type BookDiscoveryResponse,
} from "@/features/book-discovery/index.server";
import { searchBooks, recommendNextBooks } from "@/shared/api/product/adapters";
import {
  productErrorResponse,
} from "@/shared/api/product/index.server";
import { validationError, type ProductError } from "@/shared/api/product/errors";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasCallerIdentity(value: Record<string, unknown>): boolean {
  return ["user_id", "userId", "p_user_id", "owner_id"].some((key) => key in value);
}

function privateJson(body: BookDiscoveryResponse, status = 200): NextResponse {
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

export async function postConsumerBookDiscovery(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return privateError(validationError());
  }

  if (!isRecord(body) || hasCallerIdentity(body)) {
    return privateError(validationError());
  }

  const parsed = BookDiscoveryRequestSchema.safeParse(body);
  if (!parsed.success) return privateError(validationError());

  const input = parsed.data;
  const fixture = getConsumerRouteFixture(request.cookies.get("bookgolas-route-fixture")?.value);

  if (input.action === "search") {
    const query = input.mode === "isbn" ? normalizeIsbn13(input.query) : input.query.trim();
    if (input.mode === "isbn" && !isValidIsbn13(query)) {
      return privateError(validationError("A valid ISBN-13 is required."));
    }

    if (fixture?.startsWith("book-discovery-") || fixture?.startsWith("book-lifecycle-")) {
      const discoveryFixture = fixture.startsWith("book-lifecycle-") ? "book-discovery-results" : fixture;
      const result = await getBookDiscoveryFixture({ fixture: discoveryFixture, action: "search", query });
      if ("error" in result) return privateError(result.error);
      return privateJson(result);
    }

    const result = await searchBooks(
      { query, locale: input.locale, pagination: { limit: 10 } },
      { signal: request.signal },
    );
    return result.ok
      ? privateJson({ kind: "search", books: result.value })
      : privateError(result.error);
  }

  if (fixture?.startsWith("book-discovery-") || fixture?.startsWith("book-lifecycle-")) {
    const discoveryFixture = fixture.startsWith("book-lifecycle-") ? "book-discovery-results" : fixture;
    const result = await getBookDiscoveryFixture({ fixture: discoveryFixture, action: "recommendations", query: "" });
    if ("error" in result) return privateError(result.error);
    return privateJson(result);
  }

  const result = await recommendNextBooks(input.locale, { signal: request.signal });
  return result.ok
    ? privateJson({ kind: "recommendations", result: result.value })
    : privateError(result.error);
}
