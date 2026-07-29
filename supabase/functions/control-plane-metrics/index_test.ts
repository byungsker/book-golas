import {
  assertEquals,
  assertObjectMatch,
} from "https://deno.land/std@0.168.0/testing/asserts.ts";

import { createHandler, type GrowthMetrics } from "./handler.ts";

const token = "a".repeat(32);
const metrics: GrowthMetrics = {
  total_users: 5,
  new_users_7d: 2,
  active_users_7d: 3,
  total_books: 9,
  books_created_7d: 2,
  users_with_books: 4,
  total_reading_records: 21,
  reading_records_7d: 6,
  users_with_reading_records: 3,
  total_ai_recalls: 8,
  ai_recalls_7d: 3,
  users_with_ai_recall: 2,
};

function request(method = "GET", suppliedToken = token): Request {
  return new Request("http://localhost/control-plane-metrics", {
    method,
    headers: { Authorization: `Bearer ${suppliedToken}` },
  });
}

Deno.test("control plane metrics requires a bounded bearer token", async () => {
  let called = false;
  const handler = createHandler({
    productId: "bookgolas",
    environment: "production",
    expectedToken: token,
    now: () => new Date("2026-07-29T00:00:00Z"),
    loadMetrics: () => {
      called = true;
      return Promise.resolve(metrics);
    },
  });

  const response = await handler(request("GET", "wrong"));

  assertEquals(response.status, 401);
  assertEquals(called, false);
});

Deno.test("control plane metrics accepts only GET", async () => {
  const handler = createHandler({
    productId: "bookgolas",
    environment: "production",
    expectedToken: token,
    now: () => new Date("2026-07-29T00:00:00Z"),
    loadMetrics: () => Promise.resolve(metrics),
  });

  const response = await handler(request("POST"));

  assertEquals(response.status, 405);
});

Deno.test("control plane metrics returns aggregate-only evidence", async () => {
  const handler = createHandler({
    productId: "bookgolas",
    environment: "production",
    expectedToken: token,
    now: () => new Date("2026-07-29T00:00:00Z"),
    loadMetrics: () => Promise.resolve(metrics),
  });

  const response = await handler(request());
  const body = await response.json();

  assertEquals(response.status, 200);
  assertObjectMatch(body, {
    schema_version: 1,
    product_id: "bookgolas",
    generated_at: "2026-07-29T00:00:00.000Z",
    admin: {
      status: "operational",
      environment: "production",
      scope: "aggregate_metrics_only",
    },
    analytics: {
      provider: "supabase",
      period_days: 7,
      metrics,
    },
  });
  assertEquals(JSON.stringify(body).includes("user_id"), false);
  assertEquals(JSON.stringify(body).includes("email"), false);
});

Deno.test("control plane metrics rejects malformed aggregate values", async () => {
  const handler = createHandler({
    productId: "bookgolas",
    environment: "production",
    expectedToken: token,
    now: () => new Date("2026-07-29T00:00:00Z"),
    loadMetrics: () =>
      Promise.resolve({
        ...metrics,
        total_users: -1,
      }),
  });

  const response = await handler(request());

  assertEquals(response.status, 503);
});
