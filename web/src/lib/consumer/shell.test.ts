import { describe, expect, it } from "vitest";
import {
  getActiveConsumerTab,
  getChartView,
  getHomeView,
  getNextCycledPath,
} from "./shell";

describe("consumer shell route state", () => {
  it("maps only the five product routes into the shell", () => {
    expect(getActiveConsumerTab("/ko/home")).toBe("home");
    expect(getActiveConsumerTab("/en/account/")).toBe("account");
    expect(getActiveConsumerTab("/admin")).toBeNull();
    expect(getActiveConsumerTab("/ko/books/new")).toBeNull();
  });

  it("recovers invalid deep-link state to native defaults", () => {
    expect(getHomeView("unknown")).toBe("reading");
    expect(getChartView(null)).toBe("progress");
  });

  it("cycles home and chart re-taps while preserving unrelated query state", () => {
    expect(getNextCycledPath("en", "home", new URLSearchParams("view=all&filter=mine")))
      .toBe("/en/home?view=reading&filter=mine");
    expect(getNextCycledPath("ko", "stats", new URLSearchParams("view=pages")))
      .toBe("/ko/stats?view=time");
    expect(getNextCycledPath("ko", "calendar", new URLSearchParams())).toBeNull();
  });
});
