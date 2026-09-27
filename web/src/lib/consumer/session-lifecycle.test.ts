import { describe, expect, it } from "vitest";
import negativeFixtures from "../../../scripts/fixtures/session-lifecycle-negative.json";
import {
  getConsumerSignInRedirectPath,
  getSafeNextPath,
} from "./paths";

describe("consumer session lifecycle", () => {
  it.each(negativeFixtures.unsafeReturnTargets)(
    "falls back instead of preserving an unsafe return target: %s",
    (candidate) => {
      expect(getSafeNextPath("ko", candidate)).toBe(negativeFixtures.expectedFallback.path);
      expect(getConsumerSignInRedirectPath("ko", candidate)).toBe(
        "/ko/auth/sign-in?returnTo=%2Fko%2Fhome",
      );
    },
  );

  it("keeps a valid deep link and query string after authentication", () => {
    const target = "/en/books/00000000-0000-4000-8000-000000004272?tab=history";
    expect(getConsumerSignInRedirectPath("en", target)).toBe(
      "/en/auth/sign-in?returnTo=%2Fen%2Fbooks%2F00000000-0000-4000-8000-000000004272%3Ftab%3Dhistory",
    );
  });

  it("uses the same safe policy for foreign and deleted book markers", () => {
    expect(negativeFixtures.privateDataMarkers).toEqual([
      "Foreign private title",
      "Deleted private title",
    ]);
    expect(negativeFixtures.unauthenticatedNetworkMarkers).toContain("/rest/v1/books");
  });
});
