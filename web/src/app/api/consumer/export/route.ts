import { NextRequest, NextResponse } from "next/server";
import { getConsumerRouteFixture } from "@/lib/consumer/route-fixture";
import { getExportFixture } from "@/lib/consumer/export-fixtures";
import { exportReadingData } from "@/lib/product/adapters";
import {
  ExportReadingDataRequestSchema,
  ExportReadingDataResultSchema,
} from "@/lib/product/contracts";
import { validationError, type ProductError } from "@/lib/product/dal/errors";

function privateResponse(body: unknown, status = 200): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}

function privateError(error: ProductError): NextResponse {
  return privateResponse({ error }, error.status);
}

function hasCallerIdentity(value: unknown): boolean {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? ["user_id", "userId", "owner_id", "p_user_id"].some((key) => key in value)
    : false;
}

function fixtureFor(request: NextRequest): string | null {
  return getConsumerRouteFixture(request.cookies.get("bookgolas-route-fixture")?.value);
}

function isExportFixture(fixture: string | null): boolean {
  return fixture?.startsWith("export-") ?? false;
}

function responseFor(value: unknown): NextResponse {
  const parsed = ExportReadingDataResultSchema.safeParse(value);
  return parsed.success
    ? privateResponse(parsed.data)
    : privateError(validationError("The export response is malformed."));
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return privateError(validationError());
  }
  if (hasCallerIdentity(body)) {
    return privateError(validationError("Export ownership is derived from the authenticated session."));
  }

  const parsed = ExportReadingDataRequestSchema.safeParse(body);
  if (!parsed.success || parsed.data.year > new Date().getUTCFullYear()) {
    return privateError(validationError("Choose a valid export year and account email."));
  }

  const fixture = fixtureFor(request);
  if (isExportFixture(fixture)) {
    const result = getExportFixture(fixture!, parsed.data.year, parsed.data.format);
    return result.ok ? responseFor(result.value) : privateError(result.error);
  }

  const result = await exportReadingData(parsed.data);
  return result.ok ? responseFor(result.value) : privateError(result.error);
}
