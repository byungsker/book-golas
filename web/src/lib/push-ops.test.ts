import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { aggregatePushOps, getPushOpsDateRange, type PushLogMetricRow } from "./push-ops.ts";

const rows: PushLogMetricRow[] = [
  {
    push_type: "deadline",
    created_at: "2026-08-20T00:00:00.000Z",
    sent_at: "2026-08-20T00:01:00.000Z",
    is_clicked: true,
    delivery_status: "sent",
    dedupe_status: "not_applicable",
  },
  {
    push_type: "progress",
    created_at: "2026-08-20T01:00:00.000Z",
    sent_at: "2026-08-20T01:01:00.000Z",
    is_clicked: false,
    delivery_status: "sent",
    dedupe_status: "sent",
  },
  {
    push_type: "deadline",
    created_at: "2026-08-20T02:00:00.000Z",
    sent_at: null,
    is_clicked: false,
    delivery_status: "failed",
    failure_code: "invalid_token",
    invalid_token: true,
    dedupe_status: "failed",
  },
  {
    push_type: "deadline",
    created_at: "2026-08-20T03:00:00.000Z",
    sent_at: null,
    is_clicked: false,
    delivery_status: "skipped",
    failure_code: "duplicate_dedupe_key",
    dedupe_status: "skipped",
  },
  {
    push_type: "deadline",
    created_at: "2026-08-20T04:00:00.000Z",
    sent_at: null,
    is_clicked: false,
    delivery_status: "pending",
    dedupe_status: "reserved",
  },
];

assert.deepEqual(aggregatePushOps(rows), {
  totalRecords: 5,
  pending: 1,
  sent: 2,
  failed: 1,
  skipped: 1,
  deliveryAttempts: 3,
  successRate: 66.7,
  failureRate: 33.3,
  invalidTokenCount: 1,
  clicked: 1,
  clickThroughRate: 50,
  dedupeHits: 1,
  failureReasons: [{ code: "invalid_token", count: 1 }],
});

assert.deepEqual(
  getPushOpsDateRange(new Date("2026-08-22T12:00:00.000Z")),
  {
    from: "2026-08-16",
    to: "2026-08-22",
    fromTimestamp: "2026-08-16T00:00:00.000Z",
    toExclusiveTimestamp: "2026-08-23T00:00:00.000Z",
  },
);

const route = await readFile("src/app/api/admin/push-logs/route.ts", "utf8");
const executableRoute = route.replace(/^import .*?;$/gm, "");
assert.ok(executableRoute.indexOf("requireAdminUser") < executableRoute.indexOf("createServiceRoleSupabaseClient"));
assert.match(route, /SUMMARY_COLUMNS = "push_type, created_at, sent_at, is_clicked, delivery_status, failure_code, invalid_token, dedupe_status"/);
assert.equal(route.includes("user_id"), false);
assert.equal(route.includes("body"), false);

console.log("Push operations metrics fixtures passed");
