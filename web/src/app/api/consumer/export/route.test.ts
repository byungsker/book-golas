import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";

vi.mock("server-only", () => ({}));

const payload = {
  year: 2026,
  email: "reader@example.com",
  format: "csv" as const,
  includeImages: true,
};

function request(fixture: string, body: unknown = payload): NextRequest {
  return new NextRequest("http://localhost/api/consumer/export", {
    method: "POST",
    headers: {
      Cookie: `bookgolas-route-fixture=${fixture}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

describe("/api/consumer/export", () => {
  beforeEach(() => {
    process.env.BOOKGOLAS_ROUTE_TEST_MODE = "enabled";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54329";
  });

  it("returns the selected year export for the authenticated fixture account", async () => {
    const response = await POST(request("export-success"));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ year: 2026, format: "csv", status: "ready", bookCount: 1, recordCount: 3 });
  });

  it("rejects invalid year, email and caller ownership", async () => {
    const invalidYear = await POST(request("export-invalid-year", { ...payload, year: 1999 }));
    expect(invalidYear.status).toBe(400);
    const invalidEmail = await POST(request("export-invalid-email", { ...payload, email: "not-an-email" }));
    expect(invalidEmail.status).toBe(400);
    const mismatch = await POST(request("export-mismatch", { ...payload, email: "other@example.com" }));
    expect(mismatch.status).toBe(403);
    const foreign = await POST(request("export-user-mismatch", { ...payload, user_id: "foreign-user" }));
    expect(foreign.status).toBe(400);
  });

  it("keeps delivery and download failures retryable", async () => {
    const delivery = await POST(request("export-delivery"));
    expect(delivery.status).toBe(502);
    expect((await delivery.json()).error).toMatchObject({ code: "provider_error", retryable: true });
    const download = await POST(request("export-download"));
    expect(download.status).toBe(502);
    expect((await download.json()).error.retryable).toBe(true);
  });
});
