import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { getBook, updateBook } from "@/lib/product/dal";
import { GET, PATCH } from "./route";

vi.mock("@/lib/product/dal", () => ({
  getBook: vi.fn(),
  updateBook: vi.fn(),
}));

const bookId = "30000000-0000-4000-8000-000000000003";

function request(body: unknown) {
  return new NextRequest("http://localhost/api/app/books/" + bookId, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("/api/app/books/[bookId]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("uses the route identifier as the update target", async () => {
    vi.mocked(updateBook).mockResolvedValue({
      ok: false,
      error: {
        code: "not_found",
        status: 404,
        message: "Book not found.",
        retryable: false,
      },
    });

    const response = await PATCH(
      request({
        bookId: "40000000-0000-4000-8000-000000000004",
        title: "Updated title",
      }),
      { params: Promise.resolve({ bookId }) },
    );

    expect(response.status).toBe(404);
    expect(updateBook).toHaveBeenCalledWith({
      bookId,
      title: "Updated title",
    });
  });

  it("rejects a user_id field before reaching the DAL", async () => {
    const response = await PATCH(
      request({
        user_id: "10000000-0000-4000-8000-000000000001",
        title: "Should be rejected",
      }),
      { params: Promise.resolve({ bookId }) },
    );

    expect(response.status).toBe(400);
    expect(updateBook).not.toHaveBeenCalled();
  });

  it("returns not_found for a malformed route identifier before parsing the body", async () => {
    const response = await PATCH(
      request({ title: "Valid title" }),
      { params: Promise.resolve({ bookId: "not-a-book-id" }) },
    );

    expect(response.status).toBe(404);
    expect(updateBook).not.toHaveBeenCalled();
    expect((await response.json()).error.code).toBe("not_found");
  });

  it("maps an inaccessible book to not_found without exposing ownership", async () => {
    vi.mocked(getBook).mockResolvedValue({
      ok: false,
      error: {
        code: "not_found",
        status: 404,
        message: "Book not found.",
        retryable: false,
      },
    });

    const response = await GET(new NextRequest("http://localhost/api/app/books/" + bookId), {
      params: Promise.resolve({ bookId }),
    });

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      error: {
        code: "not_found",
        status: 404,
        message: "Book not found.",
        retryable: false,
      },
    });
  });
});
