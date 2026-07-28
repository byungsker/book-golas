import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";

import { collectBookImageCleanupPaths } from "./book-image-storage.ts";

Deno.test("collects only valid ownership-query paths", () => {
  assertEquals(
    collectBookImageCleanupPaths([
      { object_name: "user-a/book/image.jpg" },
      { object_name: "legacy/user-a.jpg" },
      { object_name: "user-a/book/image.jpg" },
      { object_name: "" },
      { object_name: null },
      { object_name: 42 },
      {},
    ]),
    [
      "user-a/book/image.jpg",
      "legacy/user-a.jpg",
    ],
  );
});
