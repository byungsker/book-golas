function assert(
  condition: unknown,
  message = "assertion failed",
): asserts condition {
  if (!condition) throw new Error(message);
}

function assertEquals<T>(actual: T, expected: T): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
    );
  }
}

function assertFalse(value: unknown): void {
  assert(value === false, "expected false");
}

function assertStringIncludes(value: string, expected: string): void {
  assert(value.includes(expected), `expected ${value} to include ${expected}`);
}
import { createAgentApiHandler } from "../src/handler.ts";
import type { Authenticator } from "../src/auth.ts";
import type { AgentReadDataSource } from "../src/data-source.ts";
import { InMemoryQuotaController } from "../src/quota.ts";

const user = { id: "user-a" };

function dataSource(
  calls: Array<{ method: string; userId: string; token: string }>,
): AgentReadDataSource {
  const result = { items: [], total: 0 };
  return {
    searchBooks: (userId, token) => {
      calls.push({ method: "searchBooks", userId, token });
      return Promise.resolve(result);
    },
    listLibrary: (userId, token) => {
      calls.push({ method: "listLibrary", userId, token });
      return Promise.resolve(result);
    },
    listProgress: (userId, token) => {
      calls.push({ method: "listProgress", userId, token });
      return Promise.resolve(result);
    },
    listRecall: (userId, token) => {
      calls.push({ method: "listRecall", userId, token });
      return Promise.resolve(result);
    },
    listInsights: (userId, token) => {
      calls.push({ method: "listInsights", userId, token });
      return Promise.resolve(result);
    },
    getEntitlement: (userId, token) => {
      calls.push({ method: "getEntitlement", userId, token });
      return Promise.resolve({
        tier: "free",
        source: "bookgolas_account",
        entitlement_id: "byungskerslab/북골라스 Pro",
        usage_pool: "shared_bookgolas_account",
        expires_at: null,
        activation: "read_only_contract",
      });
    },
  };
}

function makeHandler(
  options: {
    quota?: InMemoryQuotaController;
    calls?: Array<{ method: string; userId: string; token: string }>;
  } = {},
) {
  const calls = options.calls ?? [];
  const authenticator: Authenticator = {
    verify: (token) => {
      assertEquals(token, "access-token");
      return Promise.resolve(user);
    },
  };
  return {
    handler: createAgentApiHandler({
      authenticator,
      dataSource: dataSource(calls),
      quota: options.quota,
      requestId: () => "req-406",
    }),
    calls,
  };
}

async function json(response: Response): Promise<Record<string, unknown>> {
  return await response.json() as Record<string, unknown>;
}

Deno.test("capabilities are public and advertise read-only writes", async () => {
  const { handler } = makeHandler();
  const response = await handler(
    new Request("https://agent.test/v1/capabilities"),
  );
  assertEquals(response.status, 200);
  const body = await json(response);
  const data = body.data as Record<string, unknown>;
  assertEquals(data.mode, "read_only");
  assertEquals((data.writes as Record<string, unknown>).enabled, false);
  assertStringIncludes(JSON.stringify(data.capabilities), "books.search");
});

Deno.test("data routes reject missing authentication with structured errors", async () => {
  const { handler } = makeHandler();
  const response = await handler(new Request("https://agent.test/v1/library"));
  assertEquals(response.status, 401);
  const body = await json(response);
  const error = body.error as Record<string, unknown>;
  assertEquals(error.code, "authentication_required");
  assertEquals(error.request_id, "req-406");
  assertFalse(error.retryable as boolean);
});

Deno.test("API derives the user scope from the verified token", async () => {
  const calls: Array<{ method: string; userId: string; token: string }> = [];
  const { handler } = makeHandler({ calls });
  const response = await handler(
    new Request("https://agent.test/v1/library?page=2&page_size=5", {
      headers: { Authorization: "Bearer access-token" },
    }),
  );
  assertEquals(response.status, 200);
  assertEquals(calls, [{
    method: "listLibrary",
    userId: "user-a",
    token: "access-token",
  }]);
  const body = await json(response);
  assertEquals((body.meta as Record<string, unknown>).pagination, {
    page: 2,
    page_size: 5,
    has_more: false,
    total: 0,
  });
  assertEquals(response.headers.get("cache-control"), "no-store");
});

Deno.test("client-supplied user scope is rejected", async () => {
  const calls: Array<{ method: string; userId: string; token: string }> = [];
  const { handler } = makeHandler({ calls });
  const response = await handler(
    new Request("https://agent.test/v1/library?user_id=user-b", {
      headers: { Authorization: "Bearer access-token" },
    }),
  );
  assertEquals(response.status, 400);
  assertEquals(calls, []);
  const body = await json(response);
  assertEquals(
    (body.error as Record<string, unknown>).code,
    "user_scope_forbidden",
  );
});

Deno.test("writes are disabled before authentication or data access", async () => {
  const calls: Array<{ method: string; userId: string; token: string }> = [];
  const { handler } = makeHandler({ calls });
  const response = await handler(
    new Request("https://agent.test/v1/library", { method: "POST" }),
  );
  assertEquals(response.status, 405);
  assertEquals(response.headers.get("allow"), "GET");
  assertEquals(calls, []);
  const body = await json(response);
  assertEquals((body.error as Record<string, unknown>).code, "write_disabled");
});

Deno.test("rate limiting is scoped by user and capability", async () => {
  const quota = new InMemoryQuotaController(1, 60_000);
  const { handler } = makeHandler({ quota });
  const request = () =>
    new Request("https://agent.test/v1/library", {
      headers: { Authorization: "Bearer access-token" },
    });
  assertEquals((await handler(request())).status, 200);
  const response = await handler(request());
  assertEquals(response.status, 429);
  const body = await json(response);
  assertEquals((body.error as Record<string, unknown>).code, "rate_limited");
});
