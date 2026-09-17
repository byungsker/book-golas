import { describe, expect, it } from "vitest";
import negativeFixtures from "../../../scripts/fixtures/consumer-routes-negative.json";
import authEmailNegativeFixtures from "../../../scripts/fixtures/auth-email-negative.json";
import {
  getSafeNextPath,
  getConsumerSignInRedirectPath,
  isConsumerRoutePath,
  isProtectedConsumerRoutePath,
  isUnprefixedConsumerRoutePath,
} from "./paths";

const bookId = "00000000-0000-4000-8000-000000002001";

describe("consumer next paths", () => {
  it("keeps a locale-preserving consumer path", () => {
    expect(getSafeNextPath("ko", `/ko/books/${bookId}?tab=history`)).toBe(
      `/ko/books/${bookId}?tab=history`,
    );
  });

  it("serializes one safe return target for the session handoff", () => {
    expect(
      getConsumerSignInRedirectPath("en", "/en/books/00000000-0000-4000-8000-000000002001?tab=history"),
    ).toBe(
      "/en/auth/sign-in?returnTo=%2Fen%2Fbooks%2F00000000-0000-4000-8000-000000002001%3Ftab%3Dhistory",
    );
    expect(getConsumerSignInRedirectPath("ko", "https://evil.example/private")).toBe(
      "/ko/auth/sign-in?returnTo=%2Fko%2Fhome",
    );
  });

  it.each(negativeFixtures.unsafeReturnTargets)(
    "rejects unsafe path segments: %s",
    (candidate) => {
      expect(getSafeNextPath("ko", candidate)).toBe("/ko/home");
    },
  );

  it.each(negativeFixtures.crossBoundaryTargets)(
    "rejects non-consumer and cross-locale targets: %s",
    (candidate) => {
      expect(getSafeNextPath("ko", candidate)).toBe("/ko/home");
    },
  );

  it.each(authEmailNegativeFixtures.unsafeReturnTargets)(
    "rejects auth-email return target: %s",
    (candidate) => {
      expect(getSafeNextPath("ko", candidate)).toBe("/ko/home");
    },
  );

  it("classifies only the localized consumer route families", () => {
    expect(isConsumerRoutePath("/ko/auth/sign-in")).toBe(true);
    expect(isProtectedConsumerRoutePath("/en/library")).toBe(true);
    expect(isProtectedConsumerRoutePath("/ko/auth/sign-in")).toBe(false);
    expect(isUnprefixedConsumerRoutePath("/books/new")).toBe(true);
    expect(isConsumerRoutePath("/ko/privacy")).toBe(false);
    expect(isConsumerRoutePath("/admin")).toBe(false);
  });
});
