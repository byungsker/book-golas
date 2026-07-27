import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";

import {
  getBookImagePath,
  isOwnedBookImagePath,
} from "./book-image-storage.ts";

Deno.test("keeps plain book image paths", () => {
  assertEquals(
    getBookImagePath("user/book/image.jpg"),
    "user/book/image.jpg",
  );
});

Deno.test("extracts legacy public book image paths", () => {
  assertEquals(
    getBookImagePath(
      "https://example.supabase.co/storage/v1/object/public/book-images/" +
        "user/book/image%201.jpg",
    ),
    "user/book/image 1.jpg",
  );
});

Deno.test("extracts signed book image paths without query tokens", () => {
  assertEquals(
    getBookImagePath(
      "https://example.supabase.co/storage/v1/object/sign/book-images/" +
        "user/book/image.jpg?token=secret",
    ),
    "user/book/image.jpg",
  );
});

Deno.test("rejects URLs from another bucket", () => {
  assertEquals(
    getBookImagePath(
      "https://example.supabase.co/storage/v1/object/public/avatars/avatar.jpg",
    ),
    null,
  );
});

Deno.test("rejects malformed percent encoding", () => {
  assertEquals(
    getBookImagePath(
      "https://example.supabase.co/storage/v1/object/public/book-images/" +
        "user/book/image%GG.jpg",
    ),
    null,
  );
});

Deno.test("verifies ownership by exact first path segment", () => {
  assertEquals(isOwnedBookImagePath("user-a/book/image.jpg", "user-a"), true);
  assertEquals(isOwnedBookImagePath("user-ab/book/image.jpg", "user-a"), false);
});
