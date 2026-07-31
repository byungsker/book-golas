import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import {
  executeThirdPartyAiOperation,
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

const openAiProviderBoundaries = [
  "extract-keywords",
  "generate-book-review",
  "generate-embedding",
  "reading-insights",
  "recall-search embedding",
  "recall-search answer",
  "recommend-next-books",
  "structure-notes",
];

const deniedStates = [
  { name: "missing", client: clientWith(null) },
  {
    name: "withdrawn",
    client: clientWith({
      granted: false,
      policy_version: THIRD_PARTY_AI_POLICY_VERSION,
    }),
  },
  {
    name: "stale",
    client: clientWith({ granted: true, policy_version: 0 }),
  },
  {
    name: "lookup error",
    client: clientWith(null, new Error("unavailable")),
  },
];

for (const boundary of openAiProviderBoundaries) {
  for (const state of deniedStates) {
    Deno.test(
      `${boundary} makes zero upstream calls for ${state.name} consent`,
      async () => {
        let upstreamCalls = 0;
        const result = await executeThirdPartyAiOperation(
          state.client,
          "user-a",
          "open_ai",
          () => {
            upstreamCalls += 1;
            return Promise.resolve("upstream-response");
          },
        );

        assertEquals(result, { allowed: false });
        assertEquals(upstreamCalls, 0);
      },
    );
  }
}

Deno.test("current consent executes the provider operation once", async () => {
  let upstreamCalls = 0;
  const result = await executeThirdPartyAiOperation(
    clientWith({
      granted: true,
      policy_version: THIRD_PARTY_AI_POLICY_VERSION,
    }),
    "user-a",
    "open_ai",
    () => {
      upstreamCalls += 1;
      return Promise.resolve("upstream-response");
    },
  );

  assertEquals(result, { allowed: true, value: "upstream-response" });
  assertEquals(upstreamCalls, 1);
});
