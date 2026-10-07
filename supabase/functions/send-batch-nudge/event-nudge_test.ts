import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";

import { buildEventNudgeDedupeKey, isEventNudgeWindow } from "./event-nudge.ts";

Deno.test("isEventNudgeWindow only allows the 18:00 KST slot", () => {
  assertEquals(isEventNudgeWindow(18, 0), true);
  assertEquals(isEventNudgeWindow(17, 30), false);
  assertEquals(isEventNudgeWindow(18, 30), false);
  assertEquals(isEventNudgeWindow(2, 0), false);
});

Deno.test("buildEventNudgeDedupeKey allows one event per device and KST date", () => {
  assertEquals(
    buildEventNudgeDedupeKey({
      kstDate: "2026-07-26",
      userId: "user-1",
      tokenHash: "token-hash",
    }),
    "event:2026-07-26:user-1:token-hash",
  );
});
