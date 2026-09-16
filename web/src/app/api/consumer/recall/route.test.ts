import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { GET, POST } from "./route";
import { GET as GET_SOURCE } from "./source/route";

vi.mock("next/headers", () => ({ cookies: vi.fn() }));
vi.mock("server-only", () => ({}));

const bookId = "00000000-0000-4000-8000-000000004301";
const secondBookId = "00000000-0000-4000-8000-000000004302";
const photoId = "00000000-0000-4000-8000-000000004323";
const historyId = "00000000-0000-4000-8000-000000004331";

function request(url: string, init?: ConstructorParameters<typeof NextRequest>[1]) {
  return new NextRequest(`http://localhost${url}`, init);
}

function setFixture(value: string) {
  vi.mocked(cookies).mockResolvedValue({ get: (name: string) => name === "bookgolas-route-fixture" ? { name, value } : undefined } as never);
  process.env.BOOKGOLAS_ROUTE_TEST_MODE = "enabled";
  process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54329";
}

describe("/api/consumer/recall", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.BOOKGOLAS_ROUTE_TEST_MODE;
  });

  it("returns scoped global and book history/search payloads", async () => {
    setFixture("recall-happy");
    const global = await GET(request("/api/consumer/recall?locale=en&limit=10"));
    expect(global.status).toBe(200);
    expect((await global.json()).scope).toBe("global");

    const book = await GET(request(`/api/consumer/recall?locale=en&bookId=${bookId}&limit=10`));
    expect(book.status).toBe(200);
    expect((await book.json()).bookId).toBe(bookId);

    const searched = await POST(request("/api/consumer/recall", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "search", locale: "en", bookId, query: "attention", pagination: { limit: 10 } }) }));
    expect(searched.status).toBe(200);
    expect((await searched.json()).result.sourcesByBook[bookId]).toHaveLength(2);
  });

  it("keeps consent/quota/provider states typed and rejects caller identity", async () => {
    setFixture("recall-consent");
    const consent = await POST(request("/api/consumer/recall", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "search", locale: "en", query: "attention", pagination: { limit: 10 } }) }));
    expect(consent.status).toBe(403);
    expect((await consent.json()).error.code).toBe("consent_required");

    setFixture("recall-quota");
    const quota = await POST(request("/api/consumer/recall", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "search", locale: "en", query: "attention", pagination: { limit: 10 } }) }));
    expect(quota.status).toBe(429);
    expect((await quota.json()).error.code).toBe("quota_exceeded");

    setFixture("recall-provider");
    const provider = await POST(request("/api/consumer/recall", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "search", locale: "en", query: "attention", pagination: { limit: 10 } }) }));
    expect(provider.status).toBe(502);
    expect((await provider.json()).error.code).toBe("provider_error");

    setFixture("recall-offline");
    const offline = await POST(request("/api/consumer/recall", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "search", locale: "en", query: "attention", pagination: { limit: 10 } }) }));
    expect(offline.status).toBe(503);
    expect((await offline.json()).error.code).toBe("offline");

    const tampered = await GET(request("/api/consumer/recall?locale=en&user_id=foreign-user-id"));
    expect(tampered.status).toBe(400);
    expect((await tampered.json()).error.code).toBe("validation_error");
  });

  it("makes history deletion idempotent and signs private source images", async () => {
    setFixture("recall-happy");
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const deleted = await POST(request("/api/consumer/recall", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "delete_history", locale: "en", historyId, bookId }) }));
      expect(deleted.status).toBe(200);
      expect((await deleted.json()).historyId).toBe(historyId);
    }

    setFixture("recall-image");
    const image = await GET_SOURCE(request(`/api/consumer/recall/source?locale=en&bookId=${secondBookId}&sourceId=${photoId}`));
    expect(image.status).toBe(200);
    expect((await image.json()).signedUrl).toMatch(/^https:\/\//);
  });
});
