import { beforeEach, describe, expect, it, vi } from "vitest";
import { BookIdSchema } from "@/shared/api/contracts";

const { deleteBookMock, deleteOwnedBookImagesMock, resolveProductSessionMock } = vi.hoisted(() => ({
  deleteBookMock: vi.fn(),
  deleteOwnedBookImagesMock: vi.fn(),
  resolveProductSessionMock: vi.fn(),
}));

vi.mock("@/entities/book/index.server", () => ({ deleteBook: deleteBookMock }));
vi.mock("@/features/images-ocr/index.server", () => ({ deleteOwnedBookImages: deleteOwnedBookImagesMock }));
vi.mock("@/shared/api/product/index.server", () => ({ resolveProductSession: resolveProductSessionMock }));

import { deleteBookAndImages } from "./book-deletion";

const bookId = BookIdSchema.parse("30000000-0000-4000-8000-000000000003");
const revision = "2026-08-01T00:00:00.000Z";

describe("deleteBookAndImages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveProductSessionMock.mockResolvedValue({
      ok: true,
      value: {
        userId: "10000000-0000-4000-8000-000000000001",
        supabase: { storage: { from: vi.fn() } },
      },
    });
    deleteBookMock.mockResolvedValue({ ok: true, value: { deleted: true } });
    deleteOwnedBookImagesMock.mockResolvedValue({ ok: true, value: { deleted: true } });
  });

  it("cleans owned images after the book is soft-deleted", async () => {
    const result = await deleteBookAndImages(bookId, revision);

    expect(result).toEqual({ ok: true, value: { deleted: true } });
    expect(deleteBookMock).toHaveBeenCalledWith(bookId, expect.any(Function), revision);
    expect(deleteOwnedBookImagesMock).toHaveBeenCalledWith(
      bookId,
      expect.any(Function),
      { requireActiveBook: false },
    );
  });

  it("does not clean images when the compare-and-set deletion fails", async () => {
    deleteBookMock.mockResolvedValue({
      ok: false,
      error: { code: "conflict", status: 409, message: "Conflict", retryable: false },
    });

    const result = await deleteBookAndImages(bookId, revision);

    expect(result).toMatchObject({ ok: false, error: { code: "conflict", status: 409 } });
    expect(deleteOwnedBookImagesMock).not.toHaveBeenCalled();
  });
});
