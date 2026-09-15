import { describe, expect, it } from "vitest";
import negativeFixtures from "../../../scripts/fixtures/consumer-routes-negative.json";
import authEmailNegativeFixtures from "../../../scripts/fixtures/auth-email-negative.json";
import {
  getSafeNextPath,
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
