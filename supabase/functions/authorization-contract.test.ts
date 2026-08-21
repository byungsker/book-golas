type AdminRouteContract = {
  path: string;
  handlers: number;
};

type UserFunctionContract = {
  name: string;
  serviceRoleMarker: string;
  scopeMarker: string;
  privilegedMarker: string;
  scopeMustPrecedePrivileged: boolean;
};

const adminRouteContracts: AdminRouteContract[] = [
  { path: "announcements", handlers: 1 },
  { path: "fcm-tokens", handlers: 1 },
  { path: "push-logs", handlers: 1 },
  { path: "push-templates", handlers: 2 },
  { path: "send-bulk-push", handlers: 1 },
  { path: "send-test-push", handlers: 1 },
  { path: "users", handlers: 2 },
  { path: "waitlist", handlers: 2 },
];

const userFunctionContracts: UserFunctionContract[] = [
  {
    name: "delete-user",
    serviceRoleMarker: "serviceRoleKey",
    scopeMarker: '.eq("user_id", user.id)',
    privilegedMarker:
      "const adminClient = createClient(supabaseUrl, serviceRoleKey",
    scopeMustPrecedePrivileged: false,
  },
  {
    name: "export-reading-data",
    serviceRoleMarker: "SUPABASE_SERVICE_ROLE_KEY",
    scopeMarker: "userId !== user.id",
    privilegedMarker: "const supabaseClient = createClient(",
    scopeMustPrecedePrivileged: true,
  },
  {
    name: "extract-keywords",
    serviceRoleMarker: "SUPABASE_SERVICE_ROLE_KEY",
    scopeMarker: '.eq("user_id", user.id)',
    privilegedMarker: "const serviceClient = createClient(",
    scopeMustPrecedePrivileged: false,
  },
  {
    name: "generate-book-review",
    serviceRoleMarker: "SUPABASE_SERVICE_ROLE_KEY",
    scopeMarker: '.eq("user_id", user.id)',
    privilegedMarker: "const serviceClient = createClient(",
    scopeMustPrecedePrivileged: false,
  },
  {
    name: "generate-embedding",
    serviceRoleMarker: "SUPABASE_SERVICE_ROLE_KEY",
    scopeMarker: "userId !== user.id",
    privilegedMarker: "const supabaseClient = createClient(",
    scopeMustPrecedePrivileged: true,
  },
  {
    name: "log-push-click",
    serviceRoleMarker: "serviceRoleKey",
    scopeMarker: '.eq("user_id", user.id)',
    privilegedMarker:
      "const adminClient = createClient(supabaseUrl, serviceRoleKey",
    scopeMustPrecedePrivileged: false,
  },
  {
    name: "reading-insights",
    serviceRoleMarker: "config.supabase.serviceRoleKey",
    scopeMarker: "userId !== user.id",
    privilegedMarker: "const supabase = createClient(",
    scopeMustPrecedePrivileged: true,
  },
  {
    name: "recall-search",
    serviceRoleMarker: "SUPABASE_SERVICE_ROLE_KEY",
    scopeMarker: "filter_user_id: user.id",
    privilegedMarker: "const serviceClient = createClient(",
    scopeMustPrecedePrivileged: false,
  },
  {
    name: "recommend-next-books",
    serviceRoleMarker: "config.supabase.serviceRoleKey",
    scopeMarker: "userId !== user.id",
    privilegedMarker: "const supabase = createClient(",
    scopeMustPrecedePrivileged: true,
  },
  {
    name: "structure-notes",
    serviceRoleMarker: "SUPABASE_SERVICE_ROLE_KEY",
    scopeMarker: '.eq("user_id", user.id)',
    privilegedMarker: "const serviceClient = createClient(",
    scopeMustPrecedePrivileged: false,
  },
];

const serviceOnlyFunctionNames = ["send-batch-nudge", "send-test-push"];
const allFunctionNames = [
  ...userFunctionContracts.map(({ name }) => name),
  "send-fcm-push",
  ...serviceOnlyFunctionNames,
  "revenuecat-webhook",
];

function repositoryFile(relativePath: string): URL {
  return new URL(`../../${relativePath}`, import.meta.url);
}

async function readRepositoryFile(relativePath: string): Promise<string> {
  return await Deno.readTextFile(repositoryFile(relativePath));
}

function assertContract(
  condition: boolean,
  message: string,
): asserts condition {
  if (!condition) throw new Error(message);
}

function handlerBodies(source: string): string[] {
  const starts = [...source.matchAll(
    /export async function\s+\w+\s*\([^)]*\)\s*\{/g,
  )].map((match) => match.index ?? -1).filter((index) => index >= 0);
  return starts.map((start, index) =>
    source.slice(start, starts[index + 1] ?? source.length)
  );
}

function firstIndexOf(source: string, markers: string[]): number {
  const indexes = markers
    .map((marker) => source.indexOf(marker))
    .filter((index) => index >= 0);
  return indexes.length > 0 ? Math.min(...indexes) : -1;
}

function assertSourceOrder(
  source: string,
  name: string,
  beforeMarker: string,
  afterMarker: string,
): void {
  const beforeIndex = source.indexOf(beforeMarker);
  const afterIndex = source.indexOf(afterMarker);
  assertContract(beforeIndex >= 0, `${name}: missing ${beforeMarker}`);
  assertContract(afterIndex >= 0, `${name}: missing ${afterMarker}`);
  assertContract(
    beforeIndex < afterIndex,
    `${name}: ${beforeMarker} must precede ${afterMarker}`,
  );
}

Deno.test("admin API handlers keep authentication before privileged work", async () => {
  for (const contract of adminRouteContracts) {
    const source = await readRepositoryFile(
      `web/src/app/api/admin/${contract.path}/route.ts`,
    );
    const handlers = handlerBodies(source);
    assertContract(
      handlers.length === contract.handlers,
      `${contract.path}: expected ${contract.handlers} exported handlers, found ${handlers.length}`,
    );

    for (const [index, handler] of handlers.entries()) {
      const authIndex = handler.indexOf("requireAdminUser(");
      const privilegedIndex = firstIndexOf(handler, [
        "createServiceRoleSupabaseClient(",
        "createClient(",
        "getAdminClient(",
        "process.env.SUPABASE_SERVICE_ROLE_KEY",
      ]);
      assertContract(
        authIndex >= 0,
        `${contract.path} handler ${index + 1}: missing requireAdminUser`,
      );
      assertContract(
        handler.includes("status: 401"),
        `${contract.path} handler ${index + 1}: missing 401 response`,
      );
      assertContract(
        privilegedIndex < 0 || authIndex < privilegedIndex,
        `${contract.path} handler ${index + 1}: privileged work precedes auth`,
      );
    }
  }
});

Deno.test("user Edge Functions keep JWT and ownership markers", async () => {
  for (const contract of userFunctionContracts) {
    const source = await readRepositoryFile(
      `supabase/functions/${contract.name}/index.ts`,
    );
    assertContract(
      source.includes("auth.getUser()"),
      `${contract.name}: missing user JWT validation`,
    );
    assertContract(
      source.includes(contract.serviceRoleMarker),
      `${contract.name}: missing service-role boundary marker`,
    );
    assertContract(
      source.includes(contract.scopeMarker),
      `${contract.name}: missing authenticated-user scope marker`,
    );
    assertSourceOrder(
      source,
      contract.name,
      "auth.getUser()",
      contract.privilegedMarker,
    );
    assertSourceOrder(source, contract.name, "Unauthorized", "401");
    assertSourceOrder(
      source,
      contract.name,
      "401",
      contract.privilegedMarker,
    );
    if (contract.scopeMustPrecedePrivileged) {
      assertSourceOrder(
        source,
        contract.name,
        contract.scopeMarker,
        contract.privilegedMarker,
      );
    } else {
      assertSourceOrder(
        source,
        contract.name,
        "auth.getUser()",
        contract.scopeMarker,
      );
    }
    assertContract(
      source.includes('"Access-Control-Allow-Origin": "*"'),
      `${contract.name}: CORS policy is not explicit`,
    );
  }
});

Deno.test("service-only and dual-mode Edge Functions keep credential boundaries", async () => {
  for (const name of serviceOnlyFunctionNames) {
    const source = await readRepositoryFile(
      `supabase/functions/${name}/index.ts`,
    );
    assertContract(
      source.includes("isServiceRole"),
      `${name}: missing service-role decision`,
    );
    assertContract(
      source.includes("timingSafeEqual"),
      `${name}: missing timing-safe comparison`,
    );
    assertContract(
      source.includes("SUPABASE_SERVICE_ROLE_KEY"),
      `${name}: missing service-role secret`,
    );
    assertContract(
      source.includes("if (!isServiceRole)"),
      `${name}: missing fail-closed rejection`,
    );
    const privilegedMarker = name === "send-test-push"
      ? "const response = await fetch(`${supabaseUrl}/functions/v1/send-fcm-push`"
      : "const supabaseClient = createClient(";
    assertSourceOrder(source, name, "if (!isServiceRole)", privilegedMarker);
    assertSourceOrder(source, name, "401", privilegedMarker);
  }

  const fcm = await readRepositoryFile(
    "supabase/functions/send-fcm-push/index.ts",
  );
  assertContract(
    fcm.includes("isServiceRole"),
    "send-fcm-push: missing service-role path",
  );
  assertContract(
    fcm.includes("auth.getUser()"),
    "send-fcm-push: missing user JWT path",
  );
  assertContract(
    fcm.includes("userId !== user.id || token"),
    "send-fcm-push: missing user ownership boundary",
  );
  assertContract(
    fcm.includes("SUPABASE_SERVICE_ROLE_KEY"),
    "send-fcm-push: missing service-role secret",
  );
  assertSourceOrder(
    fcm,
    "send-fcm-push",
    "isServiceRole",
    "const supabaseClient = createClient(",
  );
  assertSourceOrder(
    fcm,
    "send-fcm-push",
    "Unauthorized",
    "const supabaseClient = createClient(",
  );
  assertSourceOrder(
    fcm,
    "send-fcm-push",
    "Forbidden",
    "const supabaseClient = createClient(",
  );
  assertSourceOrder(
    fcm,
    "send-fcm-push",
    "userId !== user.id || token",
    "const supabaseClient = createClient(",
  );
});

Deno.test("RevenueCat webhook keeps its external secret boundary", async () => {
  const source = await readRepositoryFile(
    "supabase/functions/revenuecat-webhook/index.ts",
  );
  assertContract(
    source.includes("REVENUECAT_WEBHOOK_AUTH_KEY"),
    "revenuecat-webhook: missing webhook secret",
  );
  assertContract(
    source.includes("authHeader !== `Bearer ${REVENUECAT_WEBHOOK_AUTH_KEY}`"),
    "revenuecat-webhook: missing exact bearer comparison",
  );
  assertContract(
    source.includes("SUPABASE_SERVICE_ROLE_KEY"),
    "revenuecat-webhook: missing service-role write boundary",
  );
  assertSourceOrder(
    source,
    "revenuecat-webhook",
    "authHeader !== `Bearer ${REVENUECAT_WEBHOOK_AUTH_KEY}`",
    "const supabaseClient = createClient(",
  );
  assertSourceOrder(
    source,
    "revenuecat-webhook",
    "Unauthorized",
    "const supabaseClient = createClient(",
  );
});

Deno.test("every registered Edge Function declares its CORS representation", async () => {
  for (const name of allFunctionNames) {
    const source = await readRepositoryFile(
      `supabase/functions/${name}/index.ts`,
    );
    assertContract(
      source.includes('"Access-Control-Allow-Origin": "*"'),
      `${name}: CORS origin policy is not represented in source`,
    );
  }
});
