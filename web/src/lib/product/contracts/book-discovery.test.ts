import { describe, expect, it } from "vitest";
import {
  BookDiscoveryRequestSchema,
  BookDiscoveryResponseSchema,
  sanitizeTrustedProviderUrl,
  trustedBookImageHosts,
  trustedBookLinkHosts,
} from "./index";

const book = {
  title: "Fixture Book",
  author: "Fixture Author",
  imageUrl: null,
  totalPages: 240,
  isbn: "9780306406157",
  genre: "essay",
  publisher: "Fixture Publisher",
  aladinUrl: null,
  price: 18000,
};

describe("book discovery contracts", () => {
  it("accepts text, ISBN and recommendation requests", () => {
    expect(BookDiscoveryRequestSchema.parse({ action: "search", locale: "ko", mode: "text", query: "fixture" })).toEqual({ action: "search", locale: "ko", mode: "text", query: "fixture" });
    expect(BookDiscoveryRequestSchema.parse({ action: "search", locale: "en", mode: "isbn", query: "9780306406157" })).toEqual({ action: "search", locale: "en", mode: "isbn", query: "9780306406157" });
    expect(BookDiscoveryRequestSchema.parse({ action: "recommendations", locale: "ko" })).toEqual({ action: "recommendations", locale: "ko" });
  });

  it("rejects caller-selected identity fields", () => {
    expect(() => BookDiscoveryRequestSchema.parse({ action: "search", locale: "ko", mode: "text", query: "fixture", user_id: "foreign" })).toThrow();
  });

  it("keeps the search response typed", () => {
    expect(BookDiscoveryResponseSchema.parse({ kind: "search", books: [book] })).toEqual({ kind: "search", books: [book] });
  });

  it("accepts only HTTPS provider hosts", () => {
    expect(sanitizeTrustedProviderUrl("https://image.aladin.co.kr/cover.jpg", trustedBookImageHosts)).toBe("https://image.aladin.co.kr/cover.jpg");
    expect(sanitizeTrustedProviderUrl("http://image.aladin.co.kr/cover.jpg", trustedBookImageHosts)).toBeNull();
    expect(sanitizeTrustedProviderUrl("https://evil.example/cover.jpg", trustedBookImageHosts)).toBeNull();
    expect(sanitizeTrustedProviderUrl("https://www.aladin.co.kr/shop/item", trustedBookLinkHosts)).toBe("https://www.aladin.co.kr/shop/item");
    expect(sanitizeTrustedProviderUrl("https://evil.example/shop/item", trustedBookLinkHosts)).toBeNull();
  });
});
