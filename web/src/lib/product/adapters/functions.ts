import "server-only";

import {
  FunctionsFetchError,
  FunctionsHttpError,
  FunctionsRelayError,
} from "@supabase/supabase-js";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import {
  failure,
  success,
  unauthorizedError,
  unavailableError,
  type ProductResult,
} from "@/lib/product/dal/errors";
import {
  resolveProductSession,
  type ProductClientFactory,
  type ProductSession,
  type ProductSupabaseClient,
} from "@/lib/product/dal/context";
import { mapAdapterError } from "./errors";

export const defaultFunctionTimeoutMs = 15_000;

export type ProductFunctionOptions = Readonly<{
  factory?: ProductClientFactory;
  timeoutMs?: number;
  signal?: AbortSignal;
}>;

type FunctionResponse = Readonly<{
  data: unknown;
  error: unknown;
  response?: Response;
}>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isResponse(value: unknown): value is Response {
  return (
    typeof Response !== "undefined" &&
    value instanceof Response
  );
}

function readErrorContext(error: unknown): Response | undefined {
  if (!isRecord(error)) return undefined;
  return isResponse(error.context) ? error.context : undefined;
}

async function readResponsePayload(response: Response | undefined): Promise<unknown> {
  if (!response) return undefined;
  try {
    const candidate = typeof response.clone === "function" ? response.clone() : response;
    const contentType = candidate.headers.get("Content-Type") ?? "";
    if (contentType.includes("json")) return await candidate.json();
    const text = await candidate.text();
    if (!text.trim()) return undefined;
    try {
      return JSON.parse(text) as unknown;
    } catch {
      return { error: text };
    }
  } catch {
    return undefined;
  }
}

function authStatus(error: unknown): number | undefined {
  if (!isRecord(error)) return undefined;
  return typeof error.status === "number" ? error.status : undefined;
}

async function resolveAccessToken(
  supabase: ProductSupabaseClient,
): Promise<ProductResult<string>> {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      const message = error instanceof Error ? error.message : "";
      return failure(
        authStatus(error) === 401 || /jwt|token.*expired|invalid.*token|unauthorized/i.test(message)
          ? unauthorizedError()
          : mapAdapterError(error),
      );
    }
    const token = data.session?.access_token;
    return token && token.trim().length > 0
      ? success(token)
      : failure(unauthorizedError());
  } catch (error) {
    return failure(mapAdapterError(error));
  }
}

function invalidFunctionResponse<T>(functionName: string): ProductResult<T> {
  return failure(unavailableError(`${functionName} returned an invalid response.`));
}

export function parseFunctionResponse<T>(
  functionName: string,
  data: unknown,
  schema: z.ZodType<T>,
): ProductResult<T> {
  const parsed = schema.safeParse(data);
  return parsed.success ? success(parsed.data) : invalidFunctionResponse(functionName);
}

async function mapInvocationError(
  error: unknown,
  response?: Response,
) {
  if (error instanceof FunctionsFetchError || error instanceof FunctionsRelayError) {
    return mapAdapterError({ code: "offline", message: error.message });
  }
  const context = response ?? readErrorContext(error);
  const payload = await readResponsePayload(context);
  return mapAdapterError(payload ?? error, context?.status);
}

/** Invoke an Edge Function with a verified session token and a typed response schema. */
export async function invokeProductFunction<T>(
  functionName: string,
  body: Record<string, unknown>,
  schema: z.ZodType<T>,
  options: ProductFunctionOptions = {},
): Promise<ProductResult<T>> {
  const session = await resolveProductSession(options.factory ?? createServerSupabaseClient);
  if (!session.ok) return failure(session.error);

  return invokeProductFunctionForSession(
    session.value,
    functionName,
    body,
    schema,
    options,
  );
}

export async function invokeProductFunctionForSession<T>(
  session: ProductSession,
  functionName: string,
  body: Record<string, unknown>,
  schema: z.ZodType<T>,
  options: Omit<ProductFunctionOptions, "factory"> = {},
): Promise<ProductResult<T>> {

  const token = await resolveAccessToken(session.supabase);
  if (!token.ok) return failure(token.error);

  let invoked: FunctionResponse;
  try {
    invoked = await session.supabase.functions.invoke<unknown>(functionName, {
      body,
      headers: {
        Authorization: `Bearer ${token.value}`,
        "X-Client-Info": "bookgolas-web",
      },
      signal: options.signal,
      timeout: options.timeoutMs ?? defaultFunctionTimeoutMs,
    });
  } catch (error) {
    return failure(await mapInvocationError(error));
  }

  if (invoked.error) {
    return failure(await mapInvocationError(invoked.error, invoked.response));
  }

  return parseFunctionResponse(functionName, invoked.data, schema);
}

export const invokeFunction = invokeProductFunction;

export function isFunctionsHttpError(error: unknown): boolean {
  return (
    error instanceof FunctionsHttpError ||
    error instanceof FunctionsFetchError ||
    error instanceof FunctionsRelayError
  );
}
