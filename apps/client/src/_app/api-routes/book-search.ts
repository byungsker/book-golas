import { NextRequest, NextResponse } from "next/server";
import { BookSearchRequestSchema } from "@/shared/api/contracts";
import { searchBooks } from "@/shared/api/product/adapters";
import { productErrorResponse } from "@/shared/api/product/index.server";
import { validationError } from "@/shared/api/product/errors";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function postBookSearch(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return productErrorResponse(validationError());
  }
  if (!isRecord(body) || "user_id" in body || "userId" in body) {
    return productErrorResponse(validationError());
  }

  const parsed = BookSearchRequestSchema.safeParse({
    query: body.query,
    locale: body.locale,
    pagination: isRecord(body.pagination) ? body.pagination : { limit: 25 },
  });
  if (!parsed.success) return productErrorResponse(validationError());

  const result = await searchBooks(parsed.data);
  return result.ok
    ? NextResponse.json({ books: result.value })
    : productErrorResponse(result.error);
}
