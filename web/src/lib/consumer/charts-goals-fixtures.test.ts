import { describe, expect, it } from "vitest";
import {
  ReadingAnalyticsRequestSchema,
} from "@/lib/product/contracts";
import { getChartsGoalsFixture, setChartsGoalsFixtureGoal } from "./charts-goals-fixtures";

const request = ReadingAnalyticsRequestSchema.parse({ view: "annual", year: 2026, status: "all" });

describe("charts and goals fixtures", () => {
  it("matches calendar source events without foreign or deleted titles", () => {
    const result = getChartsGoalsFixture({ fixture: "charts-goals-happy", request });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.timeZone).toBe("Asia/Seoul");
    expect(result.value.metrics.totalPagesRead).toBe(60);
    expect(result.value.metrics.totalSeconds).toBe(3_600);
    expect(result.value.metrics.completedBooks).toBe(1);
    expect(result.value.monthlyBookCounts.find((entry) => entry.month === 9)?.count).toBe(1);
    expect(result.value.genreDistribution).toEqual([{ genre: "Literature", count: 1 }]);
    expect(JSON.stringify(result.value)).not.toContain("Foreign Private title");
    expect(JSON.stringify(result.value)).not.toContain("Deleted Private title");
  });

  it("keeps empty and typed failure fixtures purposeful", () => {
    const empty = getChartsGoalsFixture({ fixture: "charts-goals-empty", request });
    expect(empty.ok && empty.value.metrics.totalPagesRead).toBe(0);
    expect(getChartsGoalsFixture({ fixture: "charts-goals-offline", request })).toMatchObject({ ok: false, error: { code: "offline" } });
    expect(getChartsGoalsFixture({ fixture: "charts-goals-unauthorized", request })).toMatchObject({ ok: false, error: { code: "unauthorized" } });
    expect(getChartsGoalsFixture({ fixture: "charts-goals-consent", request })).toMatchObject({ ok: false, error: { code: "consent_required" } });
    expect(getChartsGoalsFixture({ fixture: "charts-goals-quota", request })).toMatchObject({ ok: false, error: { code: "quota_exceeded" } });
    expect(getChartsGoalsFixture({ fixture: "charts-goals-stale", request })).toMatchObject({ ok: true, value: { freshness: "stale" } });
  });

  it("updates the fixture goal through the same mutation boundary as the browser", () => {
    expect(setChartsGoalsFixtureGoal({ fixture: "charts-goals-goal", year: 2026, targetBooks: 40 })).toMatchObject({ ok: true });
    const result = getChartsGoalsFixture({ fixture: "charts-goals-goal", request });
    expect(result.ok && result.value.goal.targetBooks).toBe(40);
  });
});
