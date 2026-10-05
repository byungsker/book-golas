import { NextRequest, NextResponse } from "next/server";
import { BookIdSchema, UpdateBookRequestSchema } from "@/shared/api/contracts";
import { getBook, updateBook } from "@/entities/book/index.server";
import { notFoundError, validationError } from "@/shared/api/product/errors";
import { productErrorResponse } from "@/shared/api/product/index.server";
import { deleteBookAndImages } from "./book-deletion";

type RouteContext = { params: Promise<{ bookId: string }> };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function getBookItem(_request: NextRequest, context: RouteContext) {
  const { bookId } = await context.params;
  const result = await getBook(bookId);
  return result.ok
    ? NextResponse.json({ book: result.value })
    : productErrorResponse(result.error);
}

export async function patchBookItem(request: NextRequest, context: RouteContext) {
  const { bookId } = await context.params;
  if (!BookIdSchema.safeParse(bookId).success) {
    return productErrorResponse(notFoundError());
  }

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

export async function deleteBookItem(_request: NextRequest, context: RouteContext) {
  const { bookId } = await context.params;
  const result = await deleteBookAndImages(bookId);
  return result.ok
    ? NextResponse.json(result.value)
    : productErrorResponse(result.error);
}
