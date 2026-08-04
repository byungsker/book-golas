import assert from "node:assert/strict";
import test from "node:test";

import {
  formatGeneratedAt,
  getNextAction,
  normalizeGrowthMetrics,
  percentage,
} from "../src/lib/admin/monitoring.ts";

const growthMetricsRow = {
  total_users: 12,
  new_users_7d: 2,
  active_users_7d: 5,
  total_books: 18,
  books_created_7d: 4,
  users_with_books: 7,
  total_reading_records: 43,
  reading_records_7d: 9,
  users_with_reading_records: 6,
  total_ai_recalls: 6,
  ai_recalls_7d: 2,
  users_with_ai_recall: 3,
};

test("percentage returns a rounded rate and preserves unavailable values", () => {
  assert.equal(percentage(1, 3), 33.3);
  assert.equal(percentage(null, 3), null);
  assert.equal(percentage(1, 0), null);
});

test("generated time is stable in Korea Standard Time", () => {
  assert.equal(
    formatGeneratedAt("2026-07-29T04:00:00.000Z"),
    "2026.07.29 13:00 KST"
  );
});

test("generated time falls back for an invalid timestamp", () => {
  assert.equal(formatGeneratedAt("not-a-date"), "시간 정보 없음");
});

test("growth metrics normalize a single RPC row from array responses", () => {
  assert.deepEqual(normalizeGrowthMetrics([growthMetricsRow]), growthMetricsRow);
  assert.deepEqual(normalizeGrowthMetrics(growthMetricsRow), growthMetricsRow);
});

test("growth metrics reject empty or incomplete RPC responses", () => {
  assert.equal(normalizeGrowthMetrics([]), null);
  assert.equal(normalizeGrowthMetrics({ total_users: 12 }), null);
  assert.equal(normalizeGrowthMetrics(null), null);
});

test("next action prioritizes an unavailable active-user metric", () => {
  const action = getNextAction({
    generated_at: "2026-07-29T04:00:00.000Z",
    period_days: 7,
    source_status: "partial",
    unavailable_metrics: ["active_users_7d"],
    users: { total: 12, new_7d: 2, active_7d: null },
    books: { total: 18, created_7d: 4, users_with_books: null },
    reading: {
      total_records: 43,
      records_7d: 9,
      users_with_records: null,
    },
    recall: { total: 6, created_7d: 2, users_with_recall: null },
    push: { sent_7d: 21, clicked_7d: 4 },
  });

  assert.equal(action.title, "활성 사용자 집계를 먼저 연결하세요");
});

test("next action does not treat an unavailable book metric as zero", () => {
  const action = getNextAction({
    generated_at: "2026-07-29T04:00:00.000Z",
    period_days: 7,
    source_status: "partial",
    unavailable_metrics: ["books_created_7d"],
    users: { total: 50, new_7d: 12, active_7d: 35 },
    books: { total: 80, created_7d: null, users_with_books: 42 },
    reading: {
      total_records: 140,
      records_7d: 20,
      users_with_records: 31,
    },
    recall: { total: 36, created_7d: 8, users_with_recall: 18 },
    push: { sent_7d: 45, clicked_7d: 9 },
  });

  assert.equal(action.title, "핵심 행동 지표 연결을 확인하세요");
});

test("next action does not compare an unavailable reading metric", () => {
  const action = getNextAction({
    generated_at: "2026-07-29T04:00:00.000Z",
    period_days: 7,
    source_status: "partial",
    unavailable_metrics: ["reading_records_7d"],
    users: { total: 50, new_7d: 12, active_7d: 35 },
    books: { total: 80, created_7d: 18, users_with_books: 42 },
    reading: {
      total_records: 140,
      records_7d: null,
      users_with_records: 31,
    },
    recall: { total: 36, created_7d: 8, users_with_recall: 18 },
    push: { sent_7d: 45, clicked_7d: 9 },
  });

  assert.equal(action.title, "핵심 행동 지표 연결을 확인하세요");
});
