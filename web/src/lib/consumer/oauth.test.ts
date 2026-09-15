import { describe, expect, it, vi } from "vitest";
import negativeFixtures from "../../../scripts/fixtures/auth-oauth-negative.json";
import {
  getOAuthCallbackUrl,
  getOAuthStartErrorKey,
  oauthProviders,
  signInWithOAuth,
} from "./oauth";

describe("consumer OAuth contract", () => {
  it("exposes only the providers rendered by native login", () => {
    expect(oauthProviders).toEqual(["google", "apple"]);
  });

  it("builds a locale-preserving PKCE callback with an internal return target", () => {
    expect(getOAuthCallbackUrl("https://bookgolas.test", "en", "/en/books/new")).toBe(
      "https://bookgolas.test/en/auth/callback?returnTo=%2Fen%2Fbooks%2Fnew",
    );
  });

  it("rejects external and cross-locale callback return targets", () => {
    for (const target of negativeFixtures.unsafeReturnTargets) {
      expect(getOAuthCallbackUrl("https://bookgolas.test", "ko", target)).toBe(
        "https://bookgolas.test/ko/auth/callback?returnTo=%2Fko%2Fhome",
      );
    }
  });

  it("starts Supabase OAuth with the safe callback", async () => {
    const start = vi.fn().mockResolvedValue({ data: { url: "https://provider.test" }, error: null });
    await signInWithOAuth({ signInWithOAuth: start }, "google", {
      origin: "https://bookgolas.test",
      locale: "ko",
      returnTo: "/ko/home",
    });
    expect(start).toHaveBeenCalledWith({
      provider: "google",
      options: {
        redirectTo: "https://bookgolas.test/ko/auth/callback?returnTo=%2Fko%2Fhome",
        skipBrowserRedirect: true,
      },
    });
  });

  it("maps popup or redirect cancellation without exposing provider details", () => {
    expect(getOAuthStartErrorKey(new DOMException("The user aborted a request", "AbortError"))).toBe("errors.oauthCancelled");
    expect(getOAuthStartErrorKey(new Error("popup_closed_by_user: private detail"))).toBe("errors.oauthCancelled");
    expect(getOAuthStartErrorKey(new Error("provider_secret_code"))).toBe("errors.oauthProvider");
  });
});
