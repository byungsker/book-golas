import assert from "node:assert/strict";
import test from "node:test";

import {
  formatGeneratedAt,
  getNextAction,
  percentage,
} from "../src/lib/admin/monitoring.ts";

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
