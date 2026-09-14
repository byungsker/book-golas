import { HttpStatusSchema, type ErrorCode } from "@/lib/product/contracts";
import {
  configurationError,
  consentRequiredError,
  conflictError,
  forbiddenError,
  notFoundError,
  offlineError,
  payloadTooLargeError,
  providerError,
  quotaExceededError,
  rateLimitedError,
  timeoutError,
  unauthorizedError,
  unavailableError,
  validationError,
  type ProductError,
} from "@/lib/product/dal/errors";

export type AdapterErrorPayload = Readonly<{
  code?: string;
  status?: number;
  message?: string;
  retryable?: boolean;
}>;

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

function readBoolean(value: unknown, key: string): boolean | undefined {
  if (!isRecord(value)) return undefined;
  const field = value[key];
  return typeof field === "boolean" ? field : undefined;
}

/** Read both `{ error: {...} }` and the Edge Function `{ error, code }` shape. */
export function readAdapterErrorPayload(
  value: unknown,
  statusOverride?: number,
): AdapterErrorPayload {
  const outer = isRecord(value) ? value : undefined;
  const nested = outer && isRecord(outer.error) ? outer.error : undefined;
  const errorText = outer && typeof outer.error === "string" ? outer.error : undefined;
  const source = nested ?? outer;

  return {
    code: readString(source, "code") ?? readString(outer, "errorCode"),
    status: statusOverride ?? readNumber(source, "status") ?? readNumber(outer, "status"),
    message:
      readString(source, "message") ??
      errorText ??
      readString(value, "message"),
    retryable: readBoolean(source, "retryable"),
  };
}

function isNetworkFailure(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return /failed to fetch|network|offline|fetch failed|load failed|relay error/i.test(
    `${error.name} ${error.message}`,
  );
}

function isTimeoutFailure(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return (
    error.name === "AbortError" ||
    error.name === "TimeoutError" ||
    /timed?\s*out|timeout|provider_timeout/i.test(error.message)
  );
}

function isConfigurationFailure(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return /configuration|missing.*(?:key|secret|environment)|service configuration/i.test(
    error.message,
  );
}

function boundedMessage(message: string | undefined, fallback: string): string {
  const normalized = message?.trim();
  if (!normalized) return fallback;
  return normalized.length > 500 ? normalized.slice(0, 500) : normalized;
}

function acceptedCode(value: string | undefined): ErrorCode | undefined {
  switch (value) {
    case "validation_error":
    case "unauthorized":
    case "forbidden":
    case "not_found":
    case "conflict":
    case "payload_too_large":
    case "rate_limited":
    case "provider_error":
    case "consent_required":
    case "quota_exceeded":
    case "configuration_error":
    case "timeout":
    case "offline":
    case "cancelled":
    case "unavailable":
      return value;
    default:
      return undefined;
  }
}

function defaultForCode(code: ErrorCode, message?: string): ProductError {
  switch (code) {
    case "validation_error":
      return validationError(message);
    case "unauthorized":
      return unauthorizedError();
    case "forbidden":
      return forbiddenError(message);
    case "not_found":
      return notFoundError();
    case "conflict":
      return conflictError();
    case "payload_too_large":
      return payloadTooLargeError(message);
    case "rate_limited":
      return rateLimitedError(message);
    case "provider_error":
      return providerError(message);
    case "consent_required":
      return consentRequiredError(message);
    case "quota_exceeded":
      return quotaExceededError(message);
    case "configuration_error":
      return configurationError(message);
    case "timeout":
      return timeoutError(message);
    case "offline":
      return offlineError();
    case "cancelled":
      return { code, status: 409, message: boundedMessage(message, "The request was cancelled."), retryable: false };
    case "unavailable":
      return unavailableError(message);
  }
}

function statusForCode(code: ErrorCode, status: number | undefined): ProductError["status"] {
  const allowedStatuses: Record<ErrorCode, readonly number[]> = {
    validation_error: [400],
    unauthorized: [401],
    forbidden: [403],
    not_found: [404],
    conflict: [409],
    payload_too_large: [413],
    rate_limited: [429],
    provider_error: [500, 502, 503, 504],
    consent_required: [403],
    quota_exceeded: [429],
    configuration_error: [503],
    timeout: [504],
    offline: [503],
    cancelled: [409],
    unavailable: [500, 502, 503, 504],
  };
  const parsed = HttpStatusSchema.safeParse(status);
  if (parsed.success && allowedStatuses[code].includes(parsed.data)) return parsed.data;
  return defaultForCode(code).status;
}

/** Normalize provider, policy and transport failures without losing their semantic code. */
export function mapAdapterError(
  error: unknown,
  statusOverride?: number,
): ProductError {
  const payload = readAdapterErrorPayload(error, statusOverride);
  const message = payload.message;
  const rawCode = payload.code?.toLowerCase();

  if (
    isTimeoutFailure(error) ||
    rawCode === "timeout" ||
    rawCode === "provider_timeout" ||
    payload.status === 504 ||
    /timed?\s*out|timeout|provider_timeout/i.test(message ?? "")
  ) {
    const normalized = timeoutError(message);
    return payload.status === 504 ? normalized : { ...normalized, status: 504 };
  }
  if (isNetworkFailure(error) || rawCode === "offline") return offlineError(message);
  if (
    isConfigurationFailure(error) ||
    rawCode === "configuration_error" ||
    rawCode === "missing_configuration" ||
    (rawCode === "unavailable" && /configuration|missing.*(?:key|secret|environment)/i.test(message ?? ""))
  ) {
    return configurationError(message);
  }

  if (rawCode === "pgrst116") return notFoundError();
  if (rawCode === "23505" || rawCode === "p0001") return conflictError();
  if (rawCode === "23503" || rawCode === "23514") return validationError(message);

  const code = acceptedCode(rawCode);
  if (code) {
    const base = defaultForCode(code, message);
    return {
      ...base,
      status: statusForCode(code, payload.status),
      message: boundedMessage(message, base.message),
      retryable: payload.retryable ?? base.retryable,
    };
  }

  if (rawCode === "cross_user_access" || rawCode === "forbidden") {
    return forbiddenError(message);
  }
  if (rawCode === "invalid_request" || rawCode === "method_not_allowed") {
    return validationError(message);
  }
  if (rawCode === "provider_input_too_large" || rawCode === "payload_too_large") {
    return payloadTooLargeError(message);
  }

  const status = payload.status;
  if (status === 401) return unauthorizedError();
  if (status === 403) return forbiddenError(message);
  if (status === 404) return notFoundError();
  if (status === 409) return conflictError();
  if (status === 413) return payloadTooLargeError(message);
  if (status === 429) return rateLimitedError(message);
  if (status === 504) return timeoutError(message);
  if (status !== undefined && status >= 500) return providerError(message);

  return unavailableError(message);
}
