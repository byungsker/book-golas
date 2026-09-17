import { NextRequest, NextResponse } from "next/server";
import {
  AiArtifactGenerateRequestSchema,
  AiArtifactReadRequestSchema,
  AiArtifactReadResponseSchema,
  AiArtifactGeneratedResponseSchema,
  AiMindMapSchema,
  AiInsightsSchema,
  AiRecommendationsSchema,
  type AiArtifactGenerateRequest,
  type AiArtifactGeneratedResponse,
} from "@/lib/product/contracts";
import {
  generateReadingInsights,
  recommendNextBooks,
  structureNotes,
} from "@/lib/product/adapters";
import { readAiArtifact, type AiArtifactRead } from "@/lib/product/dal";
import { resolveProductSession, type ProductSession } from "@/lib/product/dal/context";
import { productErrorResponse } from "@/lib/product/dal/http";
import { failure, validationError, type ProductError, type ProductResult } from "@/lib/product/dal/errors";
import { getConsumerRouteFixture } from "@/lib/consumer/route-fixture";
import {
  getAiArtifactsFixtureRead,
  getAiArtifactsFixtureGenerate,
} from "@/lib/consumer/ai-artifacts-fixtures";

type InFlightResult = ProductResult<AiArtifactGeneratedResponse>;

const inFlight = new Map<string, Promise<InFlightResult>>();

function privateJson(body: unknown, status = 200): NextResponse {
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

function fixtureFor(request: NextRequest): string | null {
  return getConsumerRouteFixture(request.cookies.get("bookgolas-route-fixture")?.value);
}

function isArtifactFixture(fixture: string | null): boolean {
  return fixture?.startsWith("ai-artifacts-") ?? false;
}

function rejectCallerIdentity(request: NextRequest): NextResponse | null {
  const params = request.nextUrl.searchParams;
  return ["user_id", "userId", "owner_id", "p_user_id"].some((key) => params.has(key))
    ? privateError(validationError("Ownership is derived from the authenticated session."))
    : null;
}

function readRequest(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const candidate = {
    kind: params.get("kind"),
    locale: params.get("locale") ?? "en",
    ...(params.get("bookId") === null ? {} : { bookId: params.get("bookId") }),
  };
  return AiArtifactReadRequestSchema.safeParse(candidate);
}

function responseForRead(read: AiArtifactRead): NextResponse {
  const parsed = AiArtifactReadResponseSchema.safeParse(read);
  return parsed.success
    ? privateJson(parsed.data)
    : privateError(validationError("The AI artifact cache response is malformed."));
}

function generatedResponse(
  input: AiArtifactGenerateRequest,
  cacheState: "fresh" | "missing" | "expired",
  artifact: unknown,
): ProductResult<AiArtifactGeneratedResponse> {
  const candidate = input.kind === "mindmap"
    ? { kind: input.kind, requestKey: input.requestKey, cacheState, artifact: AiMindMapSchema.safeParse(artifact).success ? artifact : null }
    : input.kind === "insights"
      ? { kind: input.kind, requestKey: input.requestKey, cacheState, artifact: AiInsightsSchema.safeParse(artifact).success ? artifact : null }
      : { kind: input.kind, requestKey: input.requestKey, cacheState, artifact: AiRecommendationsSchema.safeParse(artifact).success ? artifact : null };
  const parsed = AiArtifactGeneratedResponseSchema.safeParse(candidate);
  return parsed.success
    ? { ok: true, value: parsed.data }
    : failure(validationError("The AI artifact response is malformed."));
}

function inputKey(input: AiArtifactGenerateRequest, userId: string): string {
  return [userId, input.kind, "bookId" in input ? input.bookId : "global", input.locale, input.requestKey].join(":");
}

function fixtureGeneratedResponse(
  input: AiArtifactGenerateRequest,
  fixture: string,
): NextResponse {
  const result = getAiArtifactsFixtureGenerate(input, fixture);
  if (!result.ok) return privateError(result.error);
  const generated = generatedResponse(input, result.value.cacheState, result.value.artifact);
  return generated.ok ? privateJson(generated.value) : privateError(generated.error);
}

async function generateForSession(
  input: AiArtifactGenerateRequest,
  session: ProductSession,
  signal: AbortSignal,
): Promise<InFlightResult> {
  const factory = () => Promise.resolve(session.supabase);
  const current = await readAiArtifact(
    input.kind === "mindmap" ? { kind: input.kind, bookId: input.bookId } : { kind: input.kind },
    { factory },
  );
  if (!current.ok) return failure(current.error);
  if (current.value.cacheState === "fresh" && current.value.artifact !== null) {
    return generatedResponse(input, "fresh", current.value.artifact);
  }

  if (input.kind === "mindmap") {
    const result = await structureNotes(input.bookId, { factory, signal });
    return result.ok ? generatedResponse(input, current.value.cacheState, result.value) : failure(result.error);
  }
  if (input.kind === "insights") {
    const result = await generateReadingInsights(input.locale, { factory, signal });
    return result.ok ? generatedResponse(input, current.value.cacheState, result.value) : failure(result.error);
  }
  const result = await recommendNextBooks(input.locale, { factory, signal });
  return result.ok ? generatedResponse(input, current.value.cacheState, result.value) : failure(result.error);
}

function withInFlight(key: string, task: () => Promise<InFlightResult>): Promise<InFlightResult> {
  const existing = inFlight.get(key);
  if (existing) return existing;
  const current = task();
  inFlight.set(key, current);
  current.then(
    () => { if (inFlight.get(key) === current) inFlight.delete(key); },
    () => { if (inFlight.get(key) === current) inFlight.delete(key); },
  );
  return current;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const identityError = rejectCallerIdentity(request);
  if (identityError) return identityError;
  const parsed = readRequest(request);
  if (!parsed.success) return privateError(validationError());
  const fixture = fixtureFor(request);
  if (isArtifactFixture(fixture)) {
    const result = getAiArtifactsFixtureRead({ fixture: fixture!, kind: parsed.data.kind });
    return result.ok ? responseForRead(result.value) : privateError(result.error);
  }

  const result = await readAiArtifact(
    parsed.data.kind === "mindmap"
      ? { kind: parsed.data.kind, bookId: parsed.data.bookId }
      : { kind: parsed.data.kind },
  );
  return result.ok ? responseForRead(result.value) : privateError(result.error);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return privateError(validationError());
  }
  const parsed = AiArtifactGenerateRequestSchema.safeParse(body);
  if (!parsed.success) return privateError(validationError());
  const input = parsed.data;
  const fixture = fixtureFor(request);
  if (isArtifactFixture(fixture)) return fixtureGeneratedResponse(input, fixture!);

  const session = await resolveProductSession();
  if (!session.ok) return privateError(session.error);
  const result = await withInFlight(
    inputKey(input, session.value.userId),
    () => generateForSession(input, session.value, request.signal),
  );
  return result.ok ? privateJson(result.value) : privateError(result.error);
}
