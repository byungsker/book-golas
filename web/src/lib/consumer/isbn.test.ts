import { describe, expect, it } from "vitest";
import { isValidIsbn13, normalizeIsbn13 } from "./isbn";

describe("ISBN-13 validation", () => {
  it("accepts valid ISBN-13 values with separators", () => {
    expect(normalizeIsbn13("978-0-306-40615-7")).toBe("9780306406157");
    expect(isValidIsbn13("978-0-306-40615-7")).toBe(true);
    expect(isValidIsbn13("979 11 1234 5678 9")).toBe(false);
  });

  it("rejects unsupported prefixes, bad checksums and wrong lengths", () => {
    expect(isValidIsbn13("1230306406157")).toBe(false);
    expect(isValidIsbn13("9780306406156")).toBe(false);
    expect(isValidIsbn13("978030640615")).toBe(false);
  });
});
