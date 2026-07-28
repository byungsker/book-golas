import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";

import {
  collectBookImageCleanupPaths,
  removeAllOwnedBookImagePaths,
} from "./book-image-storage.ts";

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

Deno.test("removes more than one PostgREST response limit by cursor", async () => {
  const ownedPaths = Array.from(
    { length: 1001 },
    (_, index) => `owner/bulk/${index.toString().padStart(4, "0")}.jpg`,
  );
  const removedPaths: string[] = [];
  const requestedCursors: Array<string | null> = [];

  const removedCount = await removeAllOwnedBookImagePaths({
    fetchPage: (afterObjectName, pageSize) => {
      requestedCursors.push(afterObjectName);
      const startIndex = afterObjectName == null
        ? 0
        : ownedPaths.indexOf(afterObjectName) + 1;
      return Promise.resolve(
        ownedPaths
          .slice(startIndex, startIndex + pageSize)
          .map((objectName) => ({ object_name: objectName })),
      );
    },
    removePage: (paths) => {
      for (let index = 0; index < paths.length; index += 100) {
        removedPaths.push(...paths.slice(index, index + 100));
      }
      return Promise.resolve();
    },
  });

  assertEquals(removedCount, 1001);
  assertEquals(removedPaths, ownedPaths);
  assertEquals(requestedCursors, [
    null,
    ownedPaths[499],
    ownedPaths[999],
  ]);
});
