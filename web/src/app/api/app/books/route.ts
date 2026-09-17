import { NextRequest, NextResponse } from "next/server";
import {
  BookListRequestSchema,
  CreateBookRequestSchema,
} from "@/lib/product/contracts";
import { createBook, listBooks } from "@/lib/product/dal";
import { productErrorResponse } from "@/lib/product/dal/http";
import { validationError } from "@/lib/product/dal/errors";

function parseOptionalNumber(value: string | null): number | undefined {
  return value === null ? undefined : Number(value);
}

function parseListRequest(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const cursor = params.get("cursor");
  const limit = parseOptionalNumber(params.get("limit"));
  const sort = params.get("sort") ?? params.get("sortField") ?? "updated_at";
  const direction = params.get("direction") ?? "desc";
  const status = params.get("status");

  return BookListRequestSchema.safeParse({
    pagination: {
      ...(cursor === null ? {} : { cursor }),
      ...(limit === undefined ? {} : { limit }),
    },
    sort: { field: sort, direction },
    ...(status === null ? {} : { status }),
  });
}

export async function GET(request: NextRequest) {
  const parsedRequest = parseListRequest(request);
  if (!parsedRequest.success) return productErrorResponse(validationError());

  const result = await listBooks(parsedRequest.data);
  return result.ok
    ? NextResponse.json({ books: result.value.books, pageInfo: result.value.pageInfo })
    : productErrorResponse(result.error);
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return productErrorResponse(validationError());
  }

  const parsedRequest = CreateBookRequestSchema.safeParse(body);
  if (!parsedRequest.success) return productErrorResponse(validationError());

  const result = await createBook(parsedRequest.data);
  return result.ok
    ? NextResponse.json({ book: result.value }, { status: 201 })
    : productErrorResponse(result.error);
}
