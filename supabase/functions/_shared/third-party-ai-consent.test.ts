import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import {
  hasThirdPartyAiConsent,
  THIRD_PARTY_AI_POLICY_VERSION,
  type ThirdPartyAiConsentClient,
} from "./third-party-ai-consent.ts";

class ConsentQuery {
  constructor(
    private readonly result: {
      data: { granted: boolean; policy_version: number } | null;
      error: Error | null;
    },
  ) {}

  select(): ConsentQuery {
    return this;
  }

  eq(): ConsentQuery {
    return this;
  }

  maybeSingle() {
    return Promise.resolve(this.result);
  }
}

function clientWith(
  data: { granted: boolean; policy_version: number } | null,
  error: Error | null = null,
): ThirdPartyAiConsentClient {
  return {
    from: () => new ConsentQuery({ data, error }),
  };
}

Deno.test("server consent defaults to denied when no receipt exists", async () => {
  const granted = await hasThirdPartyAiConsent(
    clientWith(null),
    "user-a",
    "open_ai",
  );

  assertEquals(granted, false);
});

Deno.test("server consent accepts only a current granted receipt", async () => {
  const current = await hasThirdPartyAiConsent(
    clientWith({
      granted: true,
      policy_version: THIRD_PARTY_AI_POLICY_VERSION,
    }),
    "user-a",
    "open_ai",
  );
  const withdrawn = await hasThirdPartyAiConsent(
    clientWith({
      granted: false,
      policy_version: THIRD_PARTY_AI_POLICY_VERSION,
    }),
    "user-a",
    "open_ai",
  );
  const stale = await hasThirdPartyAiConsent(
    clientWith({ granted: true, policy_version: 0 }),
    "user-a",
    "open_ai",
  );

  assertEquals(current, true);
  assertEquals(withdrawn, false);
  assertEquals(stale, false);
});

Deno.test("server consent fails closed when persistence lookup fails", async () => {
  const granted = await hasThirdPartyAiConsent(
    clientWith(null, new Error("unavailable")),
    "user-a",
    "google_cloud_vision",
  );

  assertEquals(granted, false);
});

const providerEntryPoints = [
  "../extract-keywords/index.ts",
  "../generate-book-review/index.ts",
  "../generate-embedding/index.ts",
  "../reading-insights/index.ts",
  "../recall-search/index.ts",
  "../recommend-next-books/index.ts",
  "../structure-notes/index.ts",
  "../vision-ocr/index.ts",
];

for (const entryPoint of providerEntryPoints) {
  Deno.test(`${entryPoint} enforces server consent`, async () => {
    const source = await Deno.readTextFile(
      new URL(entryPoint, import.meta.url),
    );
    assertEquals(source.includes("hasThirdPartyAiConsent"), true);
  });
}
