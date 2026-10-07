export const PUSH_OPS_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;

export type PushLogMetricRow = {
  push_type: string;
  created_at: string;
  sent_at: string | null;
  is_clicked: boolean;
  delivery_status?: "pending" | "sent" | "failed" | "skipped" | null;
  failure_code?: string | null;
  invalid_token?: boolean | null;
  dedupe_status?: "not_applicable" | "reserved" | "sent" | "failed" | "skipped" | null;
};

export type PushFailureReason = {
  code: string;
  count: number;
};

export type PushOpsSummary = {
  totalRecords: number;
  pending: number;
  sent: number;
  failed: number;
  skipped: number;
  deliveryAttempts: number;
  successRate: number;
  failureRate: number;
  invalidTokenCount: number;
  clicked: number;
  clickThroughRate: number;
  dedupeHits: number;
  failureReasons: PushFailureReason[];
};

export type PushOpsDateRange = {
  from: string;
  to: string;
  fromTimestamp: string;
  toExclusiveTimestamp: string;
};

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function round(value: number): number {
  return Number(value.toFixed(1));
}

export function getPushOpsDateRange(now = new Date()): PushOpsDateRange {
  const endTimestamp = Date.parse(`${dateKey(now)}T00:00:00.000Z`);
  const startTimestamp = endTimestamp - (PUSH_OPS_DAYS - 1) * DAY_MS;
  return {
    from: dateKey(new Date(startTimestamp)),
    to: dateKey(new Date(endTimestamp)),
    fromTimestamp: new Date(startTimestamp).toISOString(),
    toExclusiveTimestamp: new Date(endTimestamp + DAY_MS).toISOString(),
  };
}

export function aggregatePushOps(rows: PushLogMetricRow[]): PushOpsSummary {
  let pending = 0;
  let sent = 0;
  let failed = 0;
  let skipped = 0;
  let invalidTokenCount = 0;
  let clicked = 0;
  let dedupeHits = 0;
  const failureReasonCounts = new Map<string, number>();

  for (const row of rows) {
    const status = row.delivery_status ?? (row.sent_at ? "sent" : "failed");
    if (status === "pending") pending++;
    if (status === "sent") sent++;
    if (status === "failed") failed++;
    if (status === "skipped") skipped++;
    if (row.invalid_token) invalidTokenCount++;
    if (status === "sent" && row.is_clicked) clicked++;
    if (row.dedupe_status === "skipped" || row.failure_code === "duplicate_dedupe_key") {
      dedupeHits++;
    }
    if (status === "failed" && row.failure_code) {
      failureReasonCounts.set(
        row.failure_code,
        (failureReasonCounts.get(row.failure_code) ?? 0) + 1,
      );
    }
  }

  const deliveryAttempts = sent + failed;
  return {
    totalRecords: rows.length,
    pending,
    sent,
    failed,
    skipped,
    deliveryAttempts,
    successRate: deliveryAttempts === 0 ? 0 : round((sent / deliveryAttempts) * 100),
    failureRate: deliveryAttempts === 0 ? 0 : round((failed / deliveryAttempts) * 100),
    invalidTokenCount,
    clicked,
    clickThroughRate: sent === 0 ? 0 : round((clicked / sent) * 100),
    dedupeHits,
    failureReasons: Array.from(failureReasonCounts.entries())
      .sort(([leftCode, leftCount], [rightCode, rightCount]) =>
        rightCount - leftCount || leftCode.localeCompare(rightCode)
      )
      .map(([code, count]) => ({ code, count })),
  };
}
