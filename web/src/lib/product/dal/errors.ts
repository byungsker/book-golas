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

export function payloadTooLargeError(message = "The request payload is too large."): ProductError {
  return {
    code: "payload_too_large",
    status: 413,
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

export function forbiddenError(message = "You do not have access to this resource."): ProductError {
  return {
    code: "forbidden",
    status: 403,
    message,
    retryable: false,
  };
}

export function consentRequiredError(message = "Consent is required for this action."): ProductError {
  return {
    code: "consent_required",
    status: 403,
    message,
    retryable: false,
  };
}

export function quotaExceededError(message = "Usage quota exceeded."): ProductError {
  return {
    code: "quota_exceeded",
    status: 429,
    message,
    retryable: true,
  };
}

export function rateLimitedError(message = "Too many requests."): ProductError {
  return {
    code: "rate_limited",
    status: 429,
    message,
    retryable: true,
  };
}

export function providerError(message = "The provider is unavailable."): ProductError {
  return {
    code: "provider_error",
    status: 502,
    message,
    retryable: true,
  };
}

export function configurationError(message = "Service configuration is unavailable."): ProductError {
  return {
    code: "configuration_error",
    status: 503,
    message,
    retryable: false,
  };
}

export function timeoutError(message = "The provider request timed out."): ProductError {
  return {
    code: "timeout",
    status: 504,
    message,
    retryable: true,
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

export function conflictError(message = "The book changed. Retry the operation."): ProductError {
  return {
    code: "conflict",
    status: 409,
    message,
    retryable: true,
  };
}

export function offlineError(message = "The network is unavailable."): ProductError {
  return {
    code: "offline",
    status: 503,
    message,
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
