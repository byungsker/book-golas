import {
  assertEquals,
  assertNotEquals,
} from "https://deno.land/std@0.168.0/testing/asserts.ts";
import {
  APPROVED_AI_PRICING,
  calculateAiCostUsd,
  classifyAiCostBand,
  DEFAULT_AI_COST_POLICY,
  evaluateAiBudget,
  preflightAiCall,
  resolveAiPricing,
} from "./ai-cost-control.ts";

Deno.test("pricing registry resolves only approved effective entries", () => {
  assertEquals(
    resolveAiPricing(
      "open_ai",
      "gpt-4o-mini",
      "2026-08-29T00:00:00.000Z",
    )?.inputUsdPerMillionTokens,
    0.15,
  );
  assertEquals(
    resolveAiPricing(
      "open_ai",
      "gpt-4o-mini",
      "2026-08-28T23:59:59.999Z",
    ),
    null,
  );
  assertEquals(resolveAiPricing("open_ai", "unknown-model"), null);
});

Deno.test("cost calculation is deterministic and rounded", () => {
  const pricing = resolveAiPricing("open_ai", "gpt-4o-mini", "2026-08-29");
  if (!pricing) throw new Error("pricing missing");
  assertEquals(calculateAiCostUsd(pricing, 1_000, 500), 0.00045);
  assertEquals(calculateAiCostUsd(pricing, -1, 1), null);
});

Deno.test("preflight estimates tokens without contacting a provider", () => {
  const first = preflightAiCall({
    provider: "open_ai",
    model: "gpt-4o-mini",
    inputChars: 401,
    maxOutputTokens: 100,
  });
  const second = preflightAiCall({
    provider: "open_ai",
    model: "gpt-4o-mini",
    inputChars: 401,
    maxOutputTokens: 100,
  });
  assertEquals(first, second);
  assertEquals(first.estimate, { inputTokens: 101, outputTokens: 100 });
  assertNotEquals(first.estimatedCostUsd, null);
});

Deno.test("preflight blocks an unregistered model", () => {
  const decision = preflightAiCall({
    provider: "open_ai",
    model: "unknown-model",
    inputChars: 10,
    maxOutputTokens: 10,
  });
  assertEquals(decision.allowed, false);
  assertEquals(decision.reason, "pricing_unavailable");
});

Deno.test("budget evaluator reports warning and critical bands", () => {
  const warning = evaluateAiBudget(
    0.01,
    {
      requestsInMinute: 0,
      requestsInDay: 0,
      activeRequests: 0,
      actualCostUsd: 0.0301,
      reservedCostUsd: 0,
    },
  );
  const critical = evaluateAiBudget(
    0.01,
    {
      requestsInMinute: 0,
      requestsInDay: 0,
      activeRequests: 0,
      actualCostUsd: 0.0351,
      reservedCostUsd: 0,
    },
  );
  assertEquals(warning.band, "warning");
  assertEquals(critical.band, "critical");
  assertEquals(warning.allowed, true);
  assertEquals(critical.allowed, true);
});

Deno.test("budget evaluator blocks hard cap, rate, quota, and concurrency", () => {
  const base = {
    actualCostUsd: 0,
    reservedCostUsd: 0,
  };
  assertEquals(
    evaluateAiBudget(0.01, {
      ...base,
      requestsInMinute: 0,
      requestsInDay: 0,
      activeRequests: 0,
    }).reason,
    "allowed",
  );
  assertEquals(
    evaluateAiBudget(0.01, {
      ...base,
      requestsInMinute: DEFAULT_AI_COST_POLICY.requestsPerMinute,
      requestsInDay: 0,
      activeRequests: 0,
    }).reason,
    "rate_limit_exceeded",
  );
  assertEquals(
    evaluateAiBudget(0.01, {
      ...base,
      requestsInMinute: 0,
      requestsInDay: DEFAULT_AI_COST_POLICY.requestsPerDay,
      activeRequests: 0,
    }).reason,
    "quota_exceeded",
  );
  assertEquals(
    evaluateAiBudget(0.01, {
      ...base,
      requestsInMinute: 0,
      requestsInDay: 0,
      activeRequests: DEFAULT_AI_COST_POLICY.concurrentRequests,
    }).reason,
    "concurrency_exceeded",
  );
  assertEquals(
    evaluateAiBudget(0.01, {
      ...base,
      requestsInMinute: 0,
      requestsInDay: 0,
      activeRequests: 0,
      actualCostUsd: 0.091,
    }).reason,
    "hard_cap_exceeded",
  );
});

Deno.test("pricing history selects the newest effective entry without mutation", () => {
  const history = [
    ...APPROVED_AI_PRICING,
    {
      ...APPROVED_AI_PRICING[0],
      inputUsdPerMillionTokens: 0.2,
      effectiveFrom: "2027-01-01T00:00:00.000Z",
    },
  ];
  assertEquals(
    resolveAiPricing("open_ai", "gpt-4o-mini", "2026-12-31", history)
      ?.inputUsdPerMillionTokens,
    0.15,
  );
  assertEquals(
    resolveAiPricing("open_ai", "gpt-4o-mini", "2027-01-01", history)
      ?.inputUsdPerMillionTokens,
    0.2,
  );
});

Deno.test("invalid preflight input is fail closed", () => {
  const decision = preflightAiCall({
    provider: "open_ai",
    model: "gpt-4o-mini",
    inputChars: 20_001,
    maxOutputTokens: 100,
  });
  assertEquals(decision.allowed, false);
  assertEquals(decision.reason, "invalid_input");
});
