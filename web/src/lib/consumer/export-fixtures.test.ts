import { describe, expect, it } from "vitest";
import { getExportFixture } from "./export-fixtures";

describe("export route fixtures", () => {
  it("returns selected-year data in the requested format", () => {
    expect(getExportFixture("export-success", 2025, "json")).toMatchObject({
      ok: true,
      value: { year: 2025, format: "json", status: "ready", bookCount: 1, recordCount: 3 },
    });
  });

  it("keeps empty and retryable failure outcomes explicit", () => {
    expect(getExportFixture("export-empty", 2026, "csv")).toMatchObject({ ok: true, value: { bookCount: 0, recordCount: 0 } });
    expect(getExportFixture("export-delivery", 2026, "csv")).toMatchObject({ ok: false, error: { code: "provider_error", retryable: true } });
    expect(getExportFixture("export-download", 2026, "csv")).toMatchObject({ ok: false, error: { code: "provider_error", retryable: true } });
    expect(getExportFixture("export-unauthorized", 2026, "csv")).toMatchObject({ ok: false, error: { code: "unauthorized" } });
    expect(getExportFixture("export-consent", 2026, "csv")).toMatchObject({ ok: false, error: { code: "consent_required" } });
    expect(getExportFixture("export-quota", 2026, "csv")).toMatchObject({ ok: false, error: { code: "quota_exceeded" } });
    expect(getExportFixture("export-offline", 2026, "csv")).toMatchObject({ ok: false, error: { code: "offline" } });
  });
});
