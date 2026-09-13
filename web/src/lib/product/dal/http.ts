import { NextResponse } from "next/server";
import type { ProductError } from "./errors";

export function productErrorResponse(error: ProductError): NextResponse {
  return NextResponse.json({ error }, { status: error.status });
}
