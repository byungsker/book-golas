import { describe, expect, it } from "vitest";
import { isLegalLocale } from "./legal-locale";

describe("isLegalLocale", () => {
  it("accepts the supported legal page locales", () => {
    expect(isLegalLocale("ko")).toBe(true);
    expect(isLegalLocale("en")).toBe(true);
  });

  it("rejects unsupported locales", () => {
    expect(isLegalLocale("fr")).toBe(false);
    expect(isLegalLocale("")).toBe(false);
  });
});
