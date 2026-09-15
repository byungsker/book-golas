import { describe, expect, it } from "vitest";
import {
  buildLibraryApiUrl,
  getLibraryTab,
  groupRecordsByBook,
  mergeById,
  parseLibraryPayload,
} from "./library";
import { getLibraryFixturePage } from "./library-fixtures";

describe("library parity helpers", () => {
  it("builds a stable owner-free API URL for a tab request", () => {
    const url = buildLibraryApiUrl({
      locale: "ko",
      tab: "records",
      query: " attention ",
      cursor: "opaque-cursor",
      limit: 10,
      recordType: "highlight",
    });
    expect(url).toContain("locale=ko");
    expect(url).toContain("tab=records");
    expect(url).toContain("query=attention");
    expect(url).toContain("recordType=highlight");
    expect(url).not.toContain("user_id");
    expect(url).not.toContain("userId");
  });

  it("deduplicates cursor pages while preserving the first occurrence", () => {
    expect(mergeById(
      [{ id: "a", value: 1 }, { id: "b", value: 2 }],
      [{ id: "b", value: 20 }, { id: "c", value: 3 }],
    )).toEqual([
      { id: "a", value: 1 },
      { id: "b", value: 2 },
      { id: "c", value: 3 },
    ]);
  });

  it("groups records by book without converting Recall history into books", async () => {
    const payload = await getLibraryFixturePage({ fixture: "library-book-list", tab: "records", query: "", cursor: null, limit: 10, recordType: null });
    expect(parseLibraryPayload(payload)).toMatchObject({ tab: "records", books: [] });
    expect(payload.records[0]?.bookTitle).toBe("The Reading Atlas");
    const groups = groupRecordsByBook(payload.records);
    expect(groups).toHaveLength(2);
    expect(groups[0].records.length).toBe(2);
    expect(payload.history).toEqual([]);
  });

  it("keeps unknown tab input on the native reading tab", () => {
    expect(getLibraryTab("review")).toBe("review");
    expect(getLibraryTab("unexpected")).toBe("reading");
  });
});
