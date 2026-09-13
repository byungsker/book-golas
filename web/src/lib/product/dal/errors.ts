import type { ApiError } from "@/lib/product/contracts";

export type ProductError = Pick<ApiError, "code" | "status" | "message" | "retryable">;

export type ProductResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: ProductError };

export function success<T>(value: T): ProductResult<T> {
  return { ok: true, value };
}

export function failure<T>(error: ProductError): ProductResult<T> {
  return { ok: false, error };
}

export function validationError(message = "Invalid request."): ProductError {
  return {
    code: "validation_error",
    status: 400,
    message,
    retryable: false,
  };
}

export function unauthorizedError(): ProductError {
  return {
    code: "unauthorized",
    status: 401,
    message: "Sign-in required.",
    retryable: false,
  };
}

export function notFoundError(): ProductError {
  return {
    code: "not_found",
    status: 404,
    message: "Book not found.",
    retryable: false,
  };
}

export function conflictError(): ProductError {
  return {
    code: "conflict",
    status: 409,
    message: "The book changed. Retry the operation.",
    retryable: true,
  };
}

export function offlineError(): ProductError {
  return {
    code: "offline",
    status: 503,
    message: "The network is unavailable.",
    retryable: true,
  };
}

export function unavailableError(message = "Book data is temporarily unavailable."): ProductError {
  return {
    code: "unavailable",
    status: 503,
    message,
    retryable: true,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readString(value: unknown, key: string): string | undefined {
  if (!isRecord(value)) return undefined;
  const field = value[key];
  return typeof field === "string" ? field : undefined;
}

function readNumber(value: unknown, key: string): number | undefined {
  if (!isRecord(value)) return undefined;
  const field = value[key];
  return typeof field === "number" ? field : undefined;
}

export function mapDatabaseError(
  error: unknown,
  fallback: ProductError = unavailableError(),
): ProductError {
  const code = readString(error, "code");
  const message = readString(error, "message")?.toLowerCase() ?? "";
  const status = readNumber(error, "status");

  if (code === "PGRST116" || status === 404) return notFoundError();
  if (code === "23505" || code === "P0001" || status === 409 || message.includes("conflict")) {
    return conflictError();
  }
  if (code === "23503" || code === "23514" || status === 400) {
    return validationError();
  }
  if (
    message.includes("failed to fetch") ||
    message.includes("network") ||
    message.includes("timeout") ||
    message.includes("offline")
  ) {
    return offlineError();
  }
  return fallback;
}
