import { NextRequest, NextResponse } from "next/server";
import { UpdateBookRequestSchema } from "@/lib/product/contracts";
import { deleteBook, getBook, updateBook } from "@/lib/product/dal";
import { productErrorResponse } from "@/lib/product/dal/http";
import { validationError } from "@/lib/product/dal/errors";

type RouteContext = { params: Promise<{ bookId: string }> };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const { bookId } = await context.params;
  const result = await getBook(bookId);
  return result.ok
    ? NextResponse.json({ book: result.value })
    : productErrorResponse(result.error);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { bookId } = await context.params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return productErrorResponse(validationError());
  }

  const candidate = isRecord(body) ? { ...body, bookId } : { bookId };
  const parsedRequest = UpdateBookRequestSchema.safeParse(candidate);
  if (!parsedRequest.success) return productErrorResponse(validationError());

  const result = await updateBook(parsedRequest.data);
  return result.ok
    ? NextResponse.json({ book: result.value })
    : productErrorResponse(result.error);
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const { bookId } = await context.params;
  const result = await deleteBook(bookId);
  return result.ok
    ? NextResponse.json(result.value)
    : productErrorResponse(result.error);
}
