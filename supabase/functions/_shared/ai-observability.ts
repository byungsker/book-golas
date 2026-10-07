export const AI_OBSERVABILITY_EVENT_VERSION = 1 as const;

export type AiOutcome =
  | "success"
  | "failure"
  | "timeout"
  | "rate_limited"
  | "blocked";

export type AiHealthStatus = "healthy" | "warning" | "critical" | "unknown";

const SAFE_METADATA_KEYS = new Set([
  "activeRequests",
  "concurrencyLimit",
  "inputCharsUsed",
  "inputLimit",
  "observedValue",
  "projectedCostUsd",
  "requestInputLimit",
  "requestLimit",
  "requestsInDay",
  "requestsInMinute",
  "requestsUsed",
  "sampleCount",
  "threshold",
  "window",
]);

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function safeScalar(value: unknown): value is string | number | boolean | null {
  return value === null ||
    typeof value === "string" ||
    typeof value === "number" && Number.isFinite(value) ||
    typeof value === "boolean";
}

export function sanitizeAiMetadata(value: unknown): Record<string, unknown> {
  const record = asRecord(value);
  if (!record) return {};

  const safe: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(record)) {
    if (SAFE_METADATA_KEYS.has(key) && safeScalar(item)) {
      safe[key] = item;
    }
  }
  return safe;
}

export function normalizeAiOutcome(params: {
  status: "success" | "failure";
  errorCode?: string | null;
}): AiOutcome {
  if (params.status === "success") return "success";
  const code = params.errorCode?.trim().toLowerCase() ?? "";
  if (code === "provider_timeout" || code === "timeout" || code === "aborted") {
    return "timeout";
  }
  if (
    code === "rate_limit_exceeded" ||
    code === "rate_limited" ||
    code === "429" ||
    code.includes("rate_limit") ||
    code.includes("rate-limit")
  ) {
    return "rate_limited";
  }
  return "failure";
}

export type AiHealthInput = {
  latestEventAt: string | null;
  now: string;
  freshnessLimitMs: number;
  allowedReservations: number;
  terminalEvents: number;
  queryOk: boolean;
  truncated: boolean;
};

export type AiHealth = {
  status: AiHealthStatus;
  coveragePercent: number | null;
  missingTerminalEvents: number;
  freshnessMs: number | null;
};

function roundedPercent(value: number): number {
  return Number(value.toFixed(1));
}

export function calculateAiHealth(input: AiHealthInput): AiHealth {
  const allowedReservations = Number.isSafeInteger(input.allowedReservations) &&
      input.allowedReservations >= 0
    ? input.allowedReservations
    : 0;
  const terminalEvents = Number.isSafeInteger(input.terminalEvents) &&
      input.terminalEvents >= 0
    ? input.terminalEvents
    : 0;
  const missingTerminalEvents = Math.max(
    allowedReservations - terminalEvents,
    0,
  );
  const coveragePercent = allowedReservations === 0 ? null : roundedPercent(
    Math.min(terminalEvents, allowedReservations) / allowedReservations * 100,
  );

  if (!input.queryOk || input.truncated || !input.latestEventAt) {
    return {
      status: "unknown",
      coveragePercent,
      missingTerminalEvents,
      freshnessMs: null,
    };
  }

  const latestEventMs = Date.parse(input.latestEventAt);
  const nowMs = Date.parse(input.now);
  if (
    !Number.isFinite(latestEventMs) ||
    !Number.isFinite(nowMs) ||
    !Number.isFinite(input.freshnessLimitMs) ||
    input.freshnessLimitMs < 0
  ) {
    return {
      status: "unknown",
      coveragePercent,
      missingTerminalEvents,
      freshnessMs: null,
    };
  }

  const freshnessMs = Math.max(0, nowMs - latestEventMs);
  if (freshnessMs > input.freshnessLimitMs) {
    return {
      status: "unknown",
      coveragePercent,
      missingTerminalEvents,
      freshnessMs,
    };
  }

  return {
    status: missingTerminalEvents > 0 ? "warning" : "healthy",
    coveragePercent,
    missingTerminalEvents,
    freshnessMs,
  };
}
