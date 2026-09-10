import {
  createClient,
  type SupabaseClient,
  type User,
} from "https://esm.sh/@supabase/supabase-js@2";
import { ContractError, type JsonObject } from "./consumer-errors.ts";

export { ContractError, type JsonObject } from "./consumer-errors.ts";
export {
  completeAiRecallQuota,
  consumeAiRecallQuota,
  enforceFunctionRateLimit,
  requireConsent,
  requireOwnedBook,
  requireOwnedSource,
  requireOwnedSourceForWrite,
  releaseAiRecallQuota,
} from "./consumer-policy.ts";

export const MAX_REQUEST_BYTES = 64 * 1024;
export const MAX_TEXT_BYTES = 20_000;
export const MAX_QUERY_BYTES = 500;
export const PROVIDER_TIMEOUT_MS = 15_000;
export const MAX_PROVIDER_RESPONSE_BYTES = 2 * 1024 * 1024;
export const MAX_PROVIDER_INPUT_BYTES = 128 * 1024;

function configuredOrigins(): string[] {
  const configured = Deno.env.get("WEB_ALLOWED_ORIGINS") ?? "https://bookgolas.com";
  return configured
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.startsWith("https://") || origin.startsWith("http://localhost"));
}

export function corsHeaders(req?: Request): Record<string, string> {
  const allowedOrigins = configuredOrigins();
  const requestedOrigin = req?.headers.get("Origin") ?? "";
  const origin = allowedOrigins.includes(requestedOrigin)
    ? requestedOrigin
    : allowedOrigins[0] ?? "https://bookgolas.com";

  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Max-Age": "600",
    "Content-Type": "application/json",
    Vary: "Origin",
  };
}

export function jsonResponse(
  body: JsonObject | unknown[],
  req: Request,
  status = 200,
  extraHeaders: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), ...extraHeaders },
  });
}

export function optionsResponse(req: Request): Response {
  return new Response(null, { status: 204, headers: corsHeaders(req) });
}

export function methodGuard(req: Request, allowed: string[] = ["POST"]): void {
  if (!allowed.includes(req.method)) {
    throw new ContractError(405, "method_not_allowed", "Method is not allowed");
  }
}

export async function parseJsonBody(
  req: Request,
  maxBytes = MAX_REQUEST_BYTES,
): Promise<JsonObject> {
  const contentLength = req.headers.get("Content-Length");
  if (contentLength !== null) {
    const declaredLength = Number(contentLength);
    if (!Number.isSafeInteger(declaredLength) || declaredLength < 0 || declaredLength > maxBytes) {
      throw new ContractError(413, "payload_too_large", "Request body is too large");
    }
  }

  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  const reader = req.body?.getReader();
  if (reader) {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = value ?? new Uint8Array();
      totalBytes += chunk.byteLength;
      if (totalBytes > maxBytes) {
        try {
          await reader.cancel();
        } catch {
          // The size error is the useful response even when cancellation races the stream.
        }
        throw new ContractError(413, "payload_too_large", "Request body is too large");
      }
      chunks.push(chunk);
    }
  } else {
    const bytes = new Uint8Array(await req.arrayBuffer());
    totalBytes = bytes.byteLength;
    if (totalBytes > maxBytes) {
      throw new ContractError(413, "payload_too_large", "Request body is too large");
    }
    chunks.push(bytes);
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  if (bytes.byteLength > maxBytes) {
    throw new ContractError(413, "payload_too_large", "Request body is too large");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new ContractError(400, "invalid_request", "Request body must be valid JSON");
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new ContractError(400, "invalid_request", "Request body must be a JSON object");
  }

  return parsed as JsonObject;
}

export function requireString(
  body: JsonObject,
  field: string,
  maxBytes = MAX_TEXT_BYTES,
  required = true,
): string | undefined {
  const value = body[field];
  if (value === undefined && !required) return undefined;
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ContractError(400, "invalid_request", `${field} is required`);
  }
  if (new TextEncoder().encode(value).byteLength > maxBytes) {
    throw new ContractError(413, "payload_too_large", `${field} is too large`);
  }
  return value.trim();
}

export function requireUuid(
  body: JsonObject,
  field: string,
  required = true,
): string | undefined {
  const value = requireString(body, field, 80, required);
  if (value === undefined) return undefined;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw new ContractError(400, "invalid_request", `${field} must be a UUID`);
  }
  return value;
}

export function requireInteger(
  body: JsonObject,
  field: string,
  min: number,
  max: number,
  fallback?: number,
): number {
  const value = body[field] ?? fallback;
  if (!Number.isInteger(value) || Number(value) < min || Number(value) > max) {
    throw new ContractError(400, "invalid_request", `${field} must be an integer in range`);
  }
  return Number(value);
}

export async function requireUser(req: Request): Promise<{ user: User; authClient: SupabaseClient }> {
  const authorization = req.headers.get("Authorization") ?? "";
  if (!/^Bearer\s+\S+$/i.test(authorization)) {
    throw new ContractError(401, "unauthorized", "Authentication is required");
  }

  const authClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: authorization } } },
  );
  const { data, error } = await authClient.auth.getUser();
  if (error || !data.user) {
    throw new ContractError(401, "unauthorized", "Authentication is required");
  }
  return { user: data.user, authClient };
}

export function createServiceClient(): SupabaseClient {
  const url = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceRoleKey) {
    throw new ContractError(503, "unavailable", "Service configuration is unavailable");
  }
  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export function requireProviderSecret(name: string): string {
  const value = Deno.env.get(name);
  if (!value) {
    throw new ContractError(503, "provider_error", "Provider is unavailable");
  }
  return value;
}

export function assertProviderInputSize(
  input: string,
  maxBytes = MAX_PROVIDER_INPUT_BYTES,
): void {
  if (new TextEncoder().encode(input).byteLength > maxBytes) {
    throw new ContractError(413, "provider_input_too_large", "Provider input is too large");
  }
}

export function providerFailure(error: unknown): ContractError {
  const message = error instanceof Error ? error.message : "Provider request failed";
  if (/429|rate.?limit/i.test(message)) {
    return new ContractError(429, "rate_limited", "Provider rate limit exceeded");
  }
  if (/provider_timeout|timed?\s*out|timeout/i.test(message)) {
    return new ContractError(504, "provider_error", "Provider request timed out");
  }
  return new ContractError(502, "provider_error", "Provider request failed");
}

export async function fetchProvider(
  input: RequestInfo | URL,
  init: RequestInit,
  timeoutMs = PROVIDER_TIMEOUT_MS,
  maxResponseBytes = MAX_PROVIDER_RESPONSE_BYTES,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const signal = init.signal
      ? AbortSignal.any([controller.signal, init.signal])
      : controller.signal;
    const response = await fetch(input, { ...init, signal });
    const declaredLength = response.headers.get("Content-Length");
    if (declaredLength !== null) {
      const length = Number(declaredLength);
      if (!Number.isSafeInteger(length) || length < 0 || length > maxResponseBytes) {
        throw new Error("provider_response_too_large");
      }
    }
    const reader = response.body?.getReader();
    const chunks: Uint8Array[] = [];
    let totalBytes = 0;
    if (reader) {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = value ?? new Uint8Array();
          totalBytes += chunk.byteLength;
          if (totalBytes > maxResponseBytes) {
            await reader.cancel();
            throw new Error("provider_response_too_large");
          }
          chunks.push(chunk);
        }
      } finally {
        reader.releaseLock();
      }
    }
    const body = new Uint8Array(totalBytes);
    let offset = 0;
    for (const chunk of chunks) {
      body.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return new Response(body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  } catch (error) {
    if (
      error instanceof DOMException &&
      (error.name === "AbortError" || error.name === "TimeoutError")
    ) {
      throw new Error("provider_timeout");
    }
    if (error instanceof Error && /timed?\s*out|timeout/i.test(error.message)) {
      throw new Error("provider_timeout");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export function responseForError(error: unknown, req: Request, logLabel: string): Response {
  if (error instanceof ContractError) {
    return jsonResponse({ error: error.message, code: error.code, ...(error.details ?? {}) }, req, error.status);
  }
  console.error(`[${logLabel}] request failed`, error instanceof Error ? error.message : "unknown error");
  return jsonResponse({ error: "Request could not be completed", code: "unavailable" }, req, 500);
}
