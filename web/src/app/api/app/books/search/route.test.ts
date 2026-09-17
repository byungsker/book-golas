import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { searchBooks } from "@/lib/product/adapters";
import { POST } from "./route";

vi.mock("@/lib/product/adapters", () => ({ searchBooks: vi.fn() }));

function request(body: unknown) {
  return new NextRequest("http://localhost/api/app/books/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("/api/app/books/search", () => {
  beforeEach(() => vi.clearAllMocks());

  it("accepts a consumer search and applies the default pagination", async () => {
    vi.mocked(searchBooks).mockResolvedValue({ ok: true, value: [] });
    const response = await POST(request({ query: "book", locale: "en" }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ books: [] });
    expect(searchBooks).toHaveBeenCalledWith({
      query: "book",
      locale: "en",
      pagination: { limit: 25 },
    });
  });

  it("rejects caller-selected ownership and preserves adapter errors", async () => {
    const ownership = await POST(request({ query: "book", locale: "ko", user_id: "foreign" }));
    expect(ownership.status).toBe(400);
    expect(searchBooks).not.toHaveBeenCalled();

    vi.mocked(searchBooks).mockResolvedValue({
      ok: false,
      error: { code: "consent_required", status: 403, message: "Consent required", retryable: false },
    });
    const response = await POST(request({ query: "book", locale: "ko" }));
    expect(response.status).toBe(403);
    expect((await response.json()).error.code).toBe("consent_required");
  });
});
