import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { getBookLifecycleFixture } from "@/lib/consumer/book-lifecycle-fixtures";
import { getConsumerRouteFixture } from "@/lib/consumer/route-fixture";
import {
  BookLifecycleRequestSchema,
  type BookLifecycleResponse,
} from "@/lib/product/contracts";
import { createBook, updateBook } from "@/lib/product/dal";
import { productErrorResponse } from "@/lib/product/dal/http";
import { validationError, type ProductError } from "@/lib/product/dal/errors";

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

function invalidatedPaths(locale: "ko" | "en", bookId: string): string[] {
  return [
    `/${locale}/home`,
    `/${locale}/library`,
    `/${locale}/books/${bookId}`,
    `/${locale}/reading/${bookId}`,
  ];
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return privateError(validationError());
  }

  const parsed = BookLifecycleRequestSchema.safeParse(body);
  if (!parsed.success) return privateError(validationError());

  const input = parsed.data;
  const fixture = getConsumerRouteFixture(request.cookies.get("bookgolas-route-fixture")?.value);
  const result = fixture?.startsWith("book-lifecycle-")
    ? await getBookLifecycleFixture({ fixture, action: input.action, book: input.book })
    : input.action === "create"
      ? await createBook(input.book)
      : await updateBook(input.book);

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
