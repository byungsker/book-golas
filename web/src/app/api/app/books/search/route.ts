import { NextRequest, NextResponse } from "next/server";
import { BookSearchRequestSchema } from "@/lib/product/contracts";
import { searchBooks } from "@/lib/product/adapters";
import { productErrorResponse } from "@/lib/product/dal/http";
import { validationError } from "@/lib/product/dal/errors";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function POST(request: NextRequest) {
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
