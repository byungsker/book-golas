import { SupabaseAuthenticator } from "../src/auth.ts";

function assert(
  condition: unknown,
  message = "assertion failed",
): asserts condition {
  if (!condition) throw new Error(message);
}

Deno.test("Supabase authenticator returns only the verified user id", async () => {
  let authorization = "";
  const authenticator = new SupabaseAuthenticator(
    "https://supabase.test",
    "anon-key",
    (_input, init) => {
      authorization = new Headers(
        (init as { headers?: HeadersInit } | undefined)?.headers,
      ).get("Authorization") ?? "";
      return Promise.resolve(
        new Response(
          JSON.stringify({ id: "user-a", email: "hidden@example.test" }),
          { status: 200 },
        ),
      );
    },
  );
  const user = await authenticator.verify("user-token");
  assert(user.id === "user-a");
  assert(authorization === "Bearer user-token");
});

Deno.test("Supabase authenticator converts invalid tokens to authentication errors", async () => {
  const authenticator = new SupabaseAuthenticator(
    "https://supabase.test",
    "anon-key",
    () => Promise.resolve(new Response("{}", { status: 401 })),
  );
  try {
    await authenticator.verify("invalid-token");
    throw new Error("expected authentication failure");
  } catch (error) {
    assert(error instanceof Error);
    assert(error.message === "Authentication is required");
  }
});
