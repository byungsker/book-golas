export const AI_PRICING_REGISTRY_VERSION = "pricing-v1";
export const AI_COST_POLICY_VERSION = "cost-control-v1";
export const AI_INPUT_CHARS_PER_TOKEN = 4;
export const AI_MAX_TOKEN_COUNT = 1_000_000;

export type AiProvider = "open_ai";
export type AiCostBand = "normal" | "warning" | "critical" | "hard_cap";
export type AiBudgetReason =
  | "allowed"
  | "invalid_input"
  | "pricing_unavailable"
  | "rate_limit_exceeded"
  | "quota_exceeded"
  | "budget_exceeded"
  | "hard_cap_exceeded"
  | "concurrency_exceeded";

export interface AiPricingEntry {
  provider: AiProvider;
  model: string;
  currency: "USD";
  inputUsdPerMillionTokens: number;
  outputUsdPerMillionTokens: number;
  effectiveFrom: string;
  effectiveUntil: string | null;
  approved: boolean;
}

export const APPROVED_AI_PRICING: readonly AiPricingEntry[] = Object.freeze([
  {
    provider: "open_ai",
    model: "gpt-4o-mini",
    currency: "USD",
    inputUsdPerMillionTokens: 0.15,
    outputUsdPerMillionTokens: 0.6,
    effectiveFrom: "2026-08-29T00:00:00.000Z",
    effectiveUntil: null,
    approved: true,
  },
  {
    provider: "open_ai",
    model: "text-embedding-3-small",
    currency: "USD",
    inputUsdPerMillionTokens: 0.02,
    outputUsdPerMillionTokens: 0,
    effectiveFrom: "2026-08-29T00:00:00.000Z",
    effectiveUntil: null,
    approved: true,
  },
]);

export interface AiCostPolicy {
  requestsPerMinute: number;
  requestsPerDay: number;
  budgetUsdPerDay: number;
  hardCapUsdPerDay: number;
  concurrentRequests: number;
  warningRatio: number;
  criticalRatio: number;
}

export const DEFAULT_AI_COST_POLICY: Readonly<AiCostPolicy> = Object.freeze({
  requestsPerMinute: 10,
  requestsPerDay: 30,
  budgetUsdPerDay: 0.05,
  hardCapUsdPerDay: 0.1,
  concurrentRequests: 3,
  warningRatio: 0.8,
  criticalRatio: 0.9,
});

export interface AiTokenEstimate {
  inputTokens: number;
  outputTokens: number;
}

export interface AiBudgetSnapshot {
  requestsInMinute: number;
  requestsInDay: number;
  activeRequests: number;
  actualCostUsd: number;
  reservedCostUsd: number;
}

export interface AiPreflightDecision {
  allowed: boolean;
  reason: AiBudgetReason;
  band: AiCostBand;
  pricing: AiPricingEntry | null;
  estimate: AiTokenEstimate | null;
  estimatedCostUsd: number | null;
  projectedCostUsd: number | null;
}

function validNonNegativeFinite(value: number): boolean {
  return Number.isFinite(value) && value >= 0;
}

function validSafeTokenCount(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0 &&
    value <= AI_MAX_TOKEN_COUNT;
}

function timestamp(value: Date | string): number {
  const result = value instanceof Date ? value.getTime() : Date.parse(value);
  return Number.isFinite(result) ? result : Number.NaN;
}

export function resolveAiPricing(
  provider: AiProvider,
  model: string,
  at: Date | string = new Date(),
  registry: readonly AiPricingEntry[] = APPROVED_AI_PRICING,
): AiPricingEntry | null {
  const current = timestamp(at);
  if (!Number.isFinite(current) || !model.trim()) return null;
  return registry
    .filter((entry) => {
      const starts = timestamp(entry.effectiveFrom);
      const ends = entry.effectiveUntil === null
        ? Number.POSITIVE_INFINITY
        : timestamp(entry.effectiveUntil);
      return entry.approved && entry.provider === provider &&
        entry.model === model && starts <= current && current < ends;
    })
    .sort((left, right) =>
      timestamp(right.effectiveFrom) - timestamp(left.effectiveFrom)
    )[0] ?? null;
}

export function estimateAiTokens(
  inputChars: number,
  maxOutputTokens: number,
): AiTokenEstimate | null {
  if (
    !Number.isSafeInteger(inputChars) || inputChars < 0 ||
    inputChars > 20_000 ||
    !validSafeTokenCount(maxOutputTokens)
  ) {
    return null;
  }
  return {
    inputTokens: Math.ceil(inputChars / AI_INPUT_CHARS_PER_TOKEN),
    outputTokens: maxOutputTokens,
  };
}

export function calculateAiCostUsd(
  pricing: AiPricingEntry,
  inputTokens: number,
  outputTokens: number,
): number | null {
  if (!validSafeTokenCount(inputTokens) || !validSafeTokenCount(outputTokens)) {
    return null;
  }
  const cost = (inputTokens * pricing.inputUsdPerMillionTokens +
    outputTokens * pricing.outputUsdPerMillionTokens) / 1_000_000;
  return validNonNegativeFinite(cost) ? Number(cost.toFixed(8)) : null;
}

export function classifyAiCostBand(
  projectedCostUsd: number,
  policy: AiCostPolicy = DEFAULT_AI_COST_POLICY,
): AiCostBand {
  if (projectedCostUsd >= policy.hardCapUsdPerDay) return "hard_cap";
  if (projectedCostUsd >= policy.budgetUsdPerDay * policy.criticalRatio) {
    return "critical";
  }
  if (projectedCostUsd >= policy.budgetUsdPerDay * policy.warningRatio) {
    return "warning";
  }
  return "normal";
}

export function evaluateAiBudget(
  estimatedCostUsd: number | null,
  snapshot: AiBudgetSnapshot,
  policy: AiCostPolicy = DEFAULT_AI_COST_POLICY,
): Omit<AiPreflightDecision, "pricing" | "estimate"> {
  if (
    estimatedCostUsd === null || !validNonNegativeFinite(estimatedCostUsd) ||
    !validNonNegativeFinite(snapshot.actualCostUsd) ||
    !validNonNegativeFinite(snapshot.reservedCostUsd)
  ) {
    return {
      allowed: false,
      reason: "pricing_unavailable",
      band: "hard_cap",
      estimatedCostUsd,
      projectedCostUsd: null,
    };
  }

  const projectedCostUsd = Number(
    (snapshot.actualCostUsd + snapshot.reservedCostUsd + estimatedCostUsd)
      .toFixed(8),
  );
  const band = classifyAiCostBand(projectedCostUsd, policy);
  let reason: AiBudgetReason = "allowed";
  if (snapshot.activeRequests >= policy.concurrentRequests) {
    reason = "concurrency_exceeded";
  } else if (snapshot.requestsInMinute >= policy.requestsPerMinute) {
    reason = "rate_limit_exceeded";
  } else if (snapshot.requestsInDay >= policy.requestsPerDay) {
    reason = "quota_exceeded";
  } else if (projectedCostUsd > policy.hardCapUsdPerDay) {
    reason = "hard_cap_exceeded";
  } else if (projectedCostUsd > policy.budgetUsdPerDay) {
    reason = "budget_exceeded";
  }

  return {
    allowed: reason === "allowed",
    reason,
    band,
    estimatedCostUsd,
    projectedCostUsd,
  };
}

export function preflightAiCall(params: {
  provider: AiProvider;
  model: string;
  inputChars: number;
  maxOutputTokens: number;
  snapshot?: AiBudgetSnapshot;
  policy?: AiCostPolicy;
  at?: Date | string;
  registry?: readonly AiPricingEntry[];
}): AiPreflightDecision {
  const snapshot = params.snapshot ?? {
    requestsInMinute: 0,
    requestsInDay: 0,
    activeRequests: 0,
    actualCostUsd: 0,
    reservedCostUsd: 0,
  };
  const pricing = resolveAiPricing(
    params.provider,
    params.model,
    params.at,
    params.registry,
  );
  const estimate = estimateAiTokens(params.inputChars, params.maxOutputTokens);
  if (!pricing || !estimate) {
    return {
      allowed: false,
      reason: !pricing ? "pricing_unavailable" : "invalid_input",
      band: "hard_cap",
      pricing,
      estimate,
      estimatedCostUsd: null,
      projectedCostUsd: null,
    };
  }
  return {
    ...evaluateAiBudget(
      calculateAiCostUsd(pricing, estimate.inputTokens, estimate.outputTokens),
      snapshot,
      params.policy,
    ),
    pricing,
    estimate,
  };
}
