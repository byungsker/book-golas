import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

import { getBookImagePath } from "./book-image-storage.ts";

Deno.test("keeps a stored object path", () => {
  assertEquals(
    getBookImagePath("user-id/book-id/image.jpg"),
    "user-id/book-id/image.jpg",
  );
});

Deno.test("extracts a legacy public object path", () => {
  assertEquals(
    getBookImagePath(
      "https://example.supabase.co/storage/v1/object/public/book-images/" +
        "book_images/image%201.jpg",
    ),
    "book_images/image 1.jpg",
  );
});

Deno.test("extracts a signed object path without its token", () => {
  assertEquals(
    getBookImagePath(
      "https://example.supabase.co/storage/v1/object/sign/book-images/" +
        "user-id/book-id/image.jpg?token=secret",
    ),
    "user-id/book-id/image.jpg",
  );
});

Deno.test("rejects URLs for another bucket", () => {
  assertEquals(
    getBookImagePath(
      "https://example.supabase.co/storage/v1/object/public/avatars/avatar.jpg",
    ),
    null,
  );
});

Deno.test("rejects a malformed encoded URL", () => {
  assertEquals(
    getBookImagePath(
      "https://example.supabase.co/storage/v1/object/public/book-images/" +
        "user-id/%E0%A4%A.jpg",
    ),
    null,
  );
});

Deno.test("rejects an empty path", () => {
  assertEquals(getBookImagePath(""), null);
  assertEquals(getBookImagePath("/"), null);
});
