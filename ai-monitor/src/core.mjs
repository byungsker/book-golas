const PRICING_VERSION = "2026-09-01";
const OUTCOMES = new Set(["success", "failure", "timeout", "rate_limited", "cancelled"]);
const FILTERS = new Set(["from", "to", "provider", "model", "status", "outcome", "errorType", "traceId", "correlationId"]);

export const PRICING_CATALOG = Object.freeze({
  [PRICING_VERSION]: Object.freeze({
    openai: Object.freeze({
      "gpt-4o-mini": Object.freeze({ inputUsdPerMillion: 0.15, outputUsdPerMillion: 0.6 }),
    }),
    anthropic: Object.freeze({
      "claude-3-5-sonnet": Object.freeze({ inputUsdPerMillion: 3, outputUsdPerMillion: 15 }),
      "claude-3-5-haiku": Object.freeze({ inputUsdPerMillion: 0.8, outputUsdPerMillion: 4 }),
    }),
    google: Object.freeze({
      "gemini-1.5-pro": Object.freeze({ inputUsdPerMillion: 1.25, outputUsdPerMillion: 5 }),
    }),
  }),
});

export class EventValidationError extends Error {
  constructor(field) {
    super(`Invalid event field: ${field}`);
    this.name = "EventValidationError";
  }
}

export class PricingError extends Error {
  constructor(provider, model, version) {
    super(`No pricing for ${provider}/${model} in ${version}`);
    this.name = "PricingError";
  }
}

export class FilterValidationError extends Error {
  constructor(filter) {
    super(`Unsupported filter: ${filter}`);
    this.name = "FilterValidationError";
  }
}

function round(value) {
  return Number(value.toFixed(12));
}

function requireString(value, field) {
  if (typeof value !== "string" || value.length === 0) throw new EventValidationError(field);
  return value;
}

function requireCount(value, field) {
  if (!Number.isInteger(value) || value < 0) throw new EventValidationError(field);
  return value;
}

function requireTimestamp(value) {
  const timestamp = requireString(value, "timestamp");
  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.valueOf())) throw new EventValidationError("timestamp");
  return parsed.toISOString();
}

export function createPricingAdapter(catalog = PRICING_CATALOG, version = PRICING_VERSION) {
  return Object.freeze({
    version,
    calculate(provider, model, tokens) {
      const pricing = catalog[version]?.[provider]?.[model];
      if (!pricing) throw new PricingError(provider, model, version);
      const input = requireCount(tokens?.inputTokens, "inputTokens");
      const output = requireCount(tokens?.outputTokens, "outputTokens");
      return round((input * pricing.inputUsdPerMillion + output * pricing.outputUsdPerMillion) / 1_000_000);
    },
  });
}

const defaultPricing = createPricingAdapter();

export function normalizeEvent(raw, pricing = defaultPricing) {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) throw new EventValidationError("event");
  const eventId = requireString(raw.eventId, "eventId");
  const timestamp = requireTimestamp(raw.timestamp);
  const outcome = requireString(raw.outcome, "outcome");
  if (!OUTCOMES.has(outcome)) throw new EventValidationError("outcome");
  const provider = requireString(raw.provider, "provider");
  const model = requireString(raw.model, "model");
  const inputTokens = requireCount(raw.inputTokens, "inputTokens");
  const outputTokens = requireCount(raw.outputTokens, "outputTokens");
  const error = raw.error;
  if (outcome !== "success" && (error === null || typeof error !== "object" || Array.isArray(error))) {
    throw new EventValidationError("error");
  }
  const event = {
    schemaVersion: "1",
    eventId,
    timestamp,
    provider,
    model,
    feature: requireString(raw.feature, "feature"),
    status: outcome === "success" ? "success" : outcome === "cancelled" ? "cancelled" : "failure",
    outcome,
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens,
    latencyMs: requireCount(raw.latencyMs, "latencyMs"),
    ttftMs: requireCount(raw.ttftMs, "ttftMs"),
    costUsd: pricing.calculate(provider, model, { inputTokens, outputTokens }),
    retryCount: requireCount(raw.retryCount, "retryCount"),
    errorType: outcome === "success" ? null : requireString(error.type, "error.type"),
    errorCode: outcome === "success" ? null : requireString(error.code, "error.code"),
    traceId: requireString(raw.traceId, "traceId"),
    correlationId: requireString(raw.correlationId, "correlationId"),
    spanId: requireString(raw.spanId, "spanId"),
    pricingVersion: pricing.version,
  };
  return Object.freeze(event);
}

export function normalizeEvents(rawEvents, pricing = defaultPricing) {
  if (!Array.isArray(rawEvents)) throw new EventValidationError("events");
  return Object.freeze(rawEvents.map((event) => normalizeEvent(event, pricing)));
}

function parseBound(value, filter) {
  if (typeof value !== "string" || Number.isNaN(Date.parse(value))) throw new FilterValidationError(filter);
  return new Date(value).valueOf();
}

export function filterEvents(events, filters = {}) {
  for (const filter of Object.keys(filters)) {
    if (!FILTERS.has(filter)) throw new FilterValidationError(filter);
  }
  const from = filters.from === undefined ? Number.NEGATIVE_INFINITY : parseBound(filters.from, "from");
  const to = filters.to === undefined ? Number.POSITIVE_INFINITY : parseBound(filters.to, "to");
  if (from > to) throw new FilterValidationError("range");
  const exactFilters = ["provider", "model", "status", "outcome", "errorType", "traceId", "correlationId"];
  return events.filter((event) => {
    const timestamp = Date.parse(event.timestamp);
    return timestamp >= from && timestamp < to && exactFilters.every((key) => filters[key] === undefined || event[key] === filters[key]);
  });
}

function emptyTotals(key) {
  return { key, requests: 0, inputTokens: 0, outputTokens: 0, totalTokens: 0, latencyMs: 0, ttftMs: 0, costUsd: 0, errors: 0, cancellations: 0 };
}

function addEvent(total, event) {
  total.requests += 1;
  total.inputTokens += event.inputTokens;
  total.outputTokens += event.outputTokens;
  total.totalTokens += event.totalTokens;
  total.latencyMs += event.latencyMs;
  total.ttftMs += event.ttftMs;
  total.costUsd = round(total.costUsd + event.costUsd);
  total.errors += event.status === "failure" ? 1 : 0;
  total.cancellations += event.status === "cancelled" ? 1 : 0;
}

function groupEvents(events, selectKey) {
  const groups = new Map();
  for (const event of events) {
    const key = selectKey(event);
    const total = groups.get(key) ?? emptyTotals(key);
    addEvent(total, event);
    groups.set(key, total);
  }
  return [...groups.values()].sort((left, right) => left.key < right.key ? -1 : left.key > right.key ? 1 : 0);
}

function groupFeatureModels(events) {
  const groups = new Map();
  for (const event of events) {
    const key = `${event.feature}\u0000${event.provider}\u0000${event.model}`;
    const total = groups.get(key) ?? {
      feature: event.feature,
      provider: event.provider,
      model: event.model,
      requests: 0,
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      latencyMs: 0,
      ttftMs: 0,
      costUsd: 0,
      errors: 0,
      cancellations: 0,
    };
    addEvent(total, event);
    groups.set(key, total);
  }
  return [...groups.values()].sort((left, right) => {
    if (left.feature !== right.feature) return left.feature < right.feature ? -1 : 1;
    if (left.provider !== right.provider) return left.provider < right.provider ? -1 : 1;
    return left.model < right.model ? -1 : left.model > right.model ? 1 : 0;
  });
}

function percentile(values, percentileRank) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.ceil(percentileRank * sorted.length) - 1];
}

export function aggregateReport(events, options = {}) {
  const totals = emptyTotals("");
  for (const event of events) addEvent(totals, event);
  const successes = events.length - totals.errors - totals.cancellations;
  const recentLimit = Number.isInteger(options.recentErrorsLimit) && options.recentErrorsLimit >= 0 ? options.recentErrorsLimit : 10;
  return {
    totals: {
      requests: totals.requests,
      successes,
      failures: totals.errors,
      cancellations: totals.cancellations,
      inputTokens: totals.inputTokens,
      outputTokens: totals.outputTokens,
      totalTokens: totals.totalTokens,
      latencyMs: totals.latencyMs,
      averageLatencyMs: totals.requests === 0 ? 0 : round(totals.latencyMs / totals.requests),
      p95LatencyMs: percentile(events.map((event) => event.latencyMs), 0.95),
      ttftMs: totals.ttftMs,
      averageTtftMs: totals.requests === 0 ? 0 : round(totals.ttftMs / totals.requests),
      p95TtftMs: percentile(events.map((event) => event.ttftMs), 0.95),
      costUsd: totals.costUsd,
      errorRate: totals.requests === 0 ? 0 : round(totals.errors / totals.requests),
    },
    daily: groupEvents(events, (event) => event.timestamp.slice(0, 10)),
    providers: groupEvents(events, (event) => event.provider),
    models: groupEvents(events, (event) => event.model),
    featureModels: groupFeatureModels(events),
    requestLogs: [...events].sort((left, right) => right.timestamp.localeCompare(left.timestamp)).map((event) => ({
      eventId: event.eventId,
      timestamp: event.timestamp,
      feature: event.feature,
      provider: event.provider,
      model: event.model,
      status: event.status,
      outcome: event.outcome,
      inputTokens: event.inputTokens,
      outputTokens: event.outputTokens,
      totalTokens: event.totalTokens,
      latencyMs: event.latencyMs,
      ttftMs: event.ttftMs,
      retryCount: event.retryCount,
      costUsd: event.costUsd,
      errorType: event.errorType,
      errorCode: event.errorCode,
      traceId: event.traceId,
      correlationId: event.correlationId,
      spanId: event.spanId,
      pricingVersion: event.pricingVersion,
    })),
    recentErrors: events.filter((event) => event.status === "failure").sort((left, right) => right.timestamp.localeCompare(left.timestamp)).slice(0, recentLimit).map((event) => ({
      eventId: event.eventId,
      timestamp: event.timestamp,
      provider: event.provider,
      model: event.model,
      outcome: event.outcome,
      errorType: event.errorType,
      errorCode: event.errorCode,
      traceId: event.traceId,
      correlationId: event.correlationId,
    })),
    traces: events.map((event) => ({
      eventId: event.eventId,
      traceId: event.traceId,
      correlationId: event.correlationId,
      spanId: event.spanId,
      timestamp: event.timestamp,
      provider: event.provider,
      model: event.model,
      status: event.status,
      outcome: event.outcome,
    })),
    pricingVersions: [...new Set(events.map((event) => event.pricingVersion))].sort(),
  };
}

export function createSafeEventSink(write, pricing = defaultPricing) {
  return async (raw) => {
    try {
      await write(normalizeEvent(raw, pricing));
      return { accepted: true };
    } catch {
      return { accepted: false };
    }
  };
}
