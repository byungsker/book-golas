import { NextResponse } from "next/server";
import type { ProductError } from "@/shared/api/product/errors";

export function productErrorResponse(error: ProductError): NextResponse {
  return NextResponse.json({ error }, { status: error.status });
}
