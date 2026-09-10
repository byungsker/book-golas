import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import * as vm from "node:vm";
import { webcrypto } from "node:crypto";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fixturePath = path.join(root, "scripts", "fixtures", "function-contracts-cross-user.json");
const fixture = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
const args = process.argv.slice(2);
let grep = null;
for (let index = 0; index < args.length; index += 1) {
  if (args[index] === "--grep") grep = args[index + 1] ?? "";
  if (args[index]?.startsWith("--grep=")) grep = args[index].slice("--grep=".length);
}

const sharedPath = path.join(root, "..", "supabase", "functions", "_shared", "consumer-contract.ts");
const shared = fs.readFileSync(sharedPath, "utf8");
const chainServicePath = path.join(root, "..", "supabase", "functions", "structure-notes", "services", "chain-service.ts");
const chainService = fs.readFileSync(chainServicePath, "utf8");
const errorsPath = path.join(root, "..", "supabase", "functions", "_shared", "consumer-errors.ts");
const errors = fs.readFileSync(errorsPath, "utf8");
const policyPath = path.join(root, "..", "supabase", "functions", "_shared", "consumer-policy.ts");
const policy = fs.readFileSync(policyPath, "utf8");
const consentMigrationPath = path.join(root, "..", "supabase", "migrations", "20260910122000_add_consumer_consent_producer.sql");
const consentRoutePath = path.join(root, "..", "web", "src", "app", "api", "consumer", "consent", "route.ts");
const recallMigrationPath = path.join(root, "..", "supabase", "migrations", "20260910123000_expire_ai_recall_reservations.sql");
const deletionMigrationPath = path.join(root, "..", "supabase", "migrations", "20260910124000_add_account_deletion_operations.sql");
const deletionScopeMigrationPath = path.join(root, "..", "supabase", "migrations", "20260910125000_scope_account_deletion_operations_per_user.sql");
const typescript = createRequire(import.meta.url)(path.join(root, "node_modules", "typescript"));
const failures = [];
const pass = (message) => console.log(`PASS ${message}`);
const fail = (message) => failures.push(message);
const assert = (condition, message) => condition ? pass(message) : fail(message);
const normalized = (value) => String(value).toLowerCase().replace(/[^a-z0-9]/g, "");

const FOREIGN_USER_ID = fixture.principals.foreign.id;
const OWNER_BOOK_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const OWNER_SOURCE_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const NOTE_SOURCE_ID = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const LEGACY_REPLACEMENT_PATH = `book_images/1720000000000_${OWNER_BOOK_ID}.jpg`;
const FOREIGN_LEGACY_PATH = `book_images/1720000000001_${OWNER_BOOK_ID}.jpg`;
const FOREIGN_ROW_DERIVED_PATH = `book_images/1720000000002_${OWNER_BOOK_ID}.jpg`;
const CANONICAL_ORPHAN_PATH = `${fixture.principals.owner.id}/${OWNER_BOOK_ID}/orphan.jpg`;
const OWNERLESS_ORPHAN_PATH = `${fixture.principals.owner.id}/${OWNER_BOOK_ID}/ownerless.jpg`;
const FOREIGN_PROFILE_AVATAR_PATH = `${fixture.principals.owner.id}/avatar-2.png`;
const FOREIGN_DEFAULT_AVATAR_PATH = `${fixture.principals.owner.id}/avatar.png`;

function stripImports(source) {
  const output = [];
  let skipping = false;
  for (const line of source.split("\n")) {
    if (!skipping && /^\s*(?:import\s|export\s+\{)/.test(line)) skipping = true;
    if (skipping) {
      if (line.includes(";")) skipping = false;
      continue;
    }
    output.push(line);
  }
  return output.join("\n");
}

function makeContractRuntime(request, events, counters, options = {}) {
  const principalId = request.principal === "owner" ? fixture.principals.owner.id : fixture.principals.foreign.id;
  const hasProfile = options.profilePresent !== false;
  const storageObjects = [
    { bucket_id: "book-images", name: `${fixture.principals.owner.id}/${OWNER_BOOK_ID}/fixture.jpg`, owner: fixture.principals.owner.id, owner_id: fixture.principals.owner.id },
    { bucket_id: "book-images", name: `${fixture.principals.owner.id}/${OWNER_BOOK_ID}/orphan.jpg`, owner: fixture.principals.owner.id, owner_id: fixture.principals.owner.id },
    { bucket_id: "book-images", name: OWNERLESS_ORPHAN_PATH, owner: null, owner_id: null },
    { bucket_id: "book-images", name: LEGACY_REPLACEMENT_PATH, owner: fixture.principals.owner.id, owner_id: fixture.principals.owner.id },
    { bucket_id: "book-images", name: FOREIGN_LEGACY_PATH, owner: FOREIGN_USER_ID, owner_id: FOREIGN_USER_ID },
    { bucket_id: "book-images", name: FOREIGN_ROW_DERIVED_PATH, owner: FOREIGN_USER_ID, owner_id: FOREIGN_USER_ID },
    { bucket_id: "avatars", name: `${fixture.principals.owner.id}/orphan.png`, owner: fixture.principals.owner.id, owner_id: fixture.principals.owner.id },
    { bucket_id: "avatars", name: FOREIGN_PROFILE_AVATAR_PATH, owner: FOREIGN_USER_ID, owner_id: FOREIGN_USER_ID },
    { bucket_id: "avatars", name: FOREIGN_DEFAULT_AVATAR_PATH, owner: FOREIGN_USER_ID, owner_id: FOREIGN_USER_ID },
  ];
  const chain = (table) => {
    const filters = {};
    let pendingAccountMutation = null;
    const matchesBook = () => hasProfile && principalId === fixture.principals.owner.id && (!filters.id || filters.id === OWNER_BOOK_ID) && (!filters.user_id || filters.user_id === principalId);
    const fixtureTitle = options.formulaFixture ? '=HYPERLINK("https://example.test")' : "Fixture book";
    const fixtureText = options.storedContentText ?? (options.exportBareCarriageReturn ? "line1\rline2" : options.formulaFixture ? "@SUM(1,1)" : "fixture note");
    const fixtureCaption = options.formulaFixture ? "-2+3" : "Fixture image";
    const ownerImage = {
      id: OWNER_SOURCE_ID,
      book_id: OWNER_BOOK_ID,
      user_id: fixture.principals.owner.id,
      image_url: `https://storage.example/storage/v1/object/public/book-images/${fixture.principals.owner.id}/${OWNER_BOOK_ID}/fixture.jpg`,
      caption: fixtureCaption,
      extracted_text: "Fixture OCR",
      page_number: 1,
      highlights: [{ id: OWNER_SOURCE_ID }],
      created_at: "2026-01-01T00:00:00.000Z",
    };
    const foreignOwnedRowImage = {
      id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
      book_id: OWNER_BOOK_ID,
      user_id: fixture.principals.owner.id,
      image_url: `https://storage.example/storage/v1/object/public/book-images/${FOREIGN_ROW_DERIVED_PATH}`,
      caption: "Foreign-owned row path fixture",
      extracted_text: null,
      page_number: null,
      highlights: [],
      created_at: "2026-01-01T00:00:00.000Z",
    };
    const unboundImage = {
      id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      book_id: OWNER_BOOK_ID,
      user_id: fixture.principals.owner.id,
      image_url: "https://storage.example/storage/v1/object/public/book-images/book_images/other-user-object.jpg",
      caption: "Unbound path fixture",
      extracted_text: null,
      page_number: null,
      highlights: [],
      created_at: "2026-01-01T00:00:00.000Z",
    };
    const query = {
      select: () => query,
      insert: () => { counters.serviceMutationCalls += 1; return query; },
      update: (values) => {
        counters.serviceMutationCalls += 1;
        if (table === "account_deletion_operations") {
          events.push(`receipt:update:${values.status ?? "unknown"}`);
          pendingAccountMutation = values;
        }
        return query;
      },
      upsert: (values) => {
        counters.serviceMutationCalls += 1;
        if (table === "account_deletion_operations") {
          events.push("receipt:upsert");
          pendingAccountMutation = values;
        }
        return query;
      },
      delete: () => { counters.serviceMutationCalls += 1; return query; },
      eq: (column, value) => { filters[column] = value; return query; },
      neq: () => query,
      is: () => query,
      or: (value) => { filters.or = value; events.push(`query:${table}:or:${value}`); return query; },
      in: (column, value) => { filters[column] = { in: value }; return query; },
      gte: () => query,
      lte: () => query,
      order: () => query,
      limit: () => query,
      maybeSingle: async () => {
        if (options.serviceFailure && (table === "users" || table === "books")) return { data: null, error: { message: "service unavailable" } };
        if (table === "users") return { data: options.profilePresent === false ? null : { id: principalId, avatar_url: `https://storage.example/storage/v1/object/public/avatars/${principalId}/avatar-2.png` }, error: null };
        if (table === "books") return { data: matchesBook() ? { id: OWNER_BOOK_ID, title: fixtureTitle, author: null, genre: null, rating: null, review: null } : null, error: null };
        if (table === "book_images") {
          if (options.existingImage) return { data: options.existingImage, error: null };
          return { data: principalId === fixture.principals.owner.id && filters.id === OWNER_SOURCE_ID ? ownerImage : null, error: null };
        }
        if (table === "reading_content_embeddings") {
          if (options.existingEmbedding) return { data: options.existingEmbedding, error: null };
          return { data: principalId === fixture.principals.owner.id && filters.source_id === OWNER_SOURCE_ID ? { id: "44444444-4444-4444-8444-444444444444", user_id: principalId, book_id: OWNER_BOOK_ID } : null, error: null };
        }
        if (table === "user_consents") return { data: options.consentRequired ? null : { status: "granted", version: "2026-09" }, error: null };
        if (table === "account_deletion_operations") return { data: options.deletionOperation ?? null, error: null };
        return { data: null, error: null };
      },
      single: async () => ({ data: { id: "44444444-4444-4444-8444-444444444444" }, error: null }),
      then: (resolve, reject) => {
        if (table === "account_deletion_operations" && pendingAccountMutation) {
          const mutation = pendingAccountMutation;
          pendingAccountMutation = null;
          if (options.deletionCompletionFailure && mutation.status === "completed") {
            options.deletionCompletionFailure = false;
            return Promise.resolve({ data: null, error: { message: "receipt unavailable" } }).then(resolve, reject);
          }
          options.deletionOperation = { ...(options.deletionOperation ?? {}), ...mutation };
          return Promise.resolve({ data: null, error: null }).then(resolve, reject);
        }
        if (options.serviceFailure && table === "books") return Promise.resolve({ data: [], error: { message: "service unavailable" } }).then(resolve, reject);
        if (table === "books") return Promise.resolve({ data: matchesBook() ? [{ id: OWNER_BOOK_ID, title: fixtureTitle, author: null, genre: null, rating: null, review: null, total_pages: 100, created_at: "2026-01-01T00:00:00.000Z", updated_at: "2026-01-01T00:00:00.000Z" }] : [], error: null }).then(resolve, reject);
        if (table === "reading_content_embeddings") {
          return Promise.resolve({ data: Array.from({ length: 5 }, (_, index) => ({ id: `44444444-4444-4444-8444-44444444444${index}`, user_id: principalId, book_id: OWNER_BOOK_ID, content_text: options.formulaFixture && index === 0 ? "@SUM(1,1)" : fixtureText, content_type: "note", page_number: 1, source_id: OWNER_SOURCE_ID, created_at: "2026-01-01T00:00:00.000Z" })), error: null }).then(resolve, reject);
        }
        if (table === "book_images") {
          if (options.exportForeignImageRows && !filters.or) {
            return Promise.resolve({
              data: Array.from({ length: 5_001 }, (_, index) => ({
                id: `foreign-image-${index}`,
                book_id: OWNER_BOOK_ID,
                image_url: `https://storage.example/foreign/${index}.jpg`,
                caption: "Foreign image",
                extracted_text: null,
                page_number: null,
                highlights: [],
                created_at: "2026-01-01T00:00:00.000Z",
                user_id: FOREIGN_USER_ID,
              })),
              error: null,
            }).then(resolve, reject);
          }
          return Promise.resolve({ data: hasProfile && principalId === fixture.principals.owner.id ? [ownerImage, foreignOwnedRowImage, unboundImage] : [], error: null }).then(resolve, reject);
        }
        return Promise.resolve({ data: [], error: null }).then(resolve, reject);
      },
    };
    return query;
  };

  const serviceClient = {
    from: (table) => {
      if (table === "books") events.push("ownership:book");
      return chain(table);
    },
    rpc: async (name) => {
      events.push(`rpc:${name}`);
      if (name === "consume_edge_function_budget" && request.name === "delete-user") {
        counters.deletionRateLimitCalls += 1;
      }
      if (name === "match_reading_content") {
        return options.serviceFailure
          ? { data: null, error: { message: "service unavailable" } }
          : { data: [], error: null };
      }
      if (name === "complete_ai_recall_quota") {
        events.push("policy:quota:complete");
        return { data: null, error: null };
      }
      if (name === "release_ai_recall_quota") {
        events.push("policy:quota:release");
        return { data: null, error: null };
      }
      if (name === "consume_ai_recall_quota") return { data: [{ allowed: !options.quotaExceeded, remaining: options.quotaExceeded ? 0 : 9, reset_at: new Date(Date.now() + 60_000).toISOString() }], error: null };
      return { data: [{ allowed: !options.rateLimited, remaining: options.rateLimited ? 0 : 9, reset_at: new Date(Date.now() + 60_000).toISOString() }], error: null };
    },
    storage: {
      from: (bucket) => ({
        remove: async (paths) => {
          counters.serviceMutationCalls += 1;
          events.push(`storage:${bucket}:${paths.join(",")}`);
          return { error: null };
        },
        list: async (prefix, listOptions = {}) => {
          if (bucket === "book-images" && hasProfile && principalId === fixture.principals.owner.id) {
            if (prefix === fixture.principals.owner.id) return { data: [{ name: OWNER_BOOK_ID, id: null, metadata: null }], error: null };
            if (prefix === `${fixture.principals.owner.id}/${OWNER_BOOK_ID}`) return { data: [
              { name: "orphan.jpg", id: "orphan", metadata: {} },
              { name: "ownerless.jpg", id: "ownerless", metadata: {} },
            ], error: null };
            if (prefix === "book_images" && listOptions.search === OWNER_BOOK_ID) return { data: [
              { name: LEGACY_REPLACEMENT_PATH.slice("book_images/".length), id: "legacy", metadata: {} },
              { name: FOREIGN_LEGACY_PATH.slice("book_images/".length), id: "foreign-legacy", metadata: {} },
            ], error: null };
          }
          if (bucket === "avatars" && hasProfile && principalId === fixture.principals.owner.id && prefix === fixture.principals.owner.id) {
            return { data: [{ name: "orphan.png", id: "avatar-orphan", metadata: {} }], error: null };
          }
          if (prefix === CANONICAL_ORPHAN_PATH) return { data: [], error: null };
          return { data: [], error: null };
        },
      }),
    },
    schema: (schemaName) => ({
      from: (table) => {
        const filters = {};
        const query = {
          select: () => query,
          eq: (column, value) => { filters[column] = value; return query; },
          in: (column, values) => { filters[column] = { in: values }; return query; },
          then: (resolve, reject) => Promise.resolve({
            data: schemaName === "storage" && table === "objects"
              ? storageObjects.filter((entry) => (
                entry.bucket_id === filters.bucket_id
                && Array.isArray(filters.name?.in)
                && filters.name.in.includes(entry.name)
              )).map(({ name, owner, owner_id }) => ({ name, owner, owner_id }))
              : [],
            error: null,
          }).then(resolve, reject),
        };
        return query;
      },
    }),
    auth: { admin: { deleteUser: async () => {
      counters.serviceMutationCalls += 1;
      events.push("auth:delete-user");
      if (options.authDeleteFailure) {
        options.authDeleteFailure = false;
        return { error: { message: "auth unavailable" } };
      }
      options.authDeleted = true;
      return { error: null };
    } } },
  };

  const config = {};
  const validateConfig = () => {};
  const PatternCollector = class { async collect() { if (options.serviceFailure) throw new Error("Books query failed: service unavailable"); return []; } };
  const InsightService = class { async generate() { if (options.serviceFailure) throw new Error("Memory load failed: service unavailable"); if (options.rateLimited) throw new Error("Rate limit exceeded. Try again later."); if (options.providerFailure) throw new Error("provider_failure"); return []; } };
  const ProfileCollector = class { async collect() { return { books: options.providerFailure ? [{ id: OWNER_BOOK_ID }] : [], stats: {}, interests: { topHighlights: [], keywords: [] } }; } };
  const RecommendationService = class { async generate() { if (options.providerFailure) throw new Error("provider_failure"); return []; } };

  const principal = request.principal === "owner" ? fixture.principals.owner : fixture.principals.foreign;
  const sharedModule = { exports: {} };
  const sharedSource = [errors, policy, shared].map(stripImports).join("\n");
  const sharedCompiled = typescript.transpileModule(sharedSource, {
    compilerOptions: { target: typescript.ScriptTarget.ES2022, module: typescript.ModuleKind.CommonJS },
    fileName: sharedPath,
  }).outputText;
  const environment = {
    SUPABASE_URL: "http://supabase.test",
    SUPABASE_ANON_KEY: "test-anon-key",
    SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key",
    WEB_ALLOWED_ORIGINS: "https://bookgolas.com",
    OPENAI_API_KEY: "test-openai-key",
    RESEND_API_KEY: "test-resend-key",
    ALADIN_TTB_KEY: "test-aladin-key",
    GOOGLE_CLOUD_VISION_API_KEY: "test-vision-key",
  };
  const fakeFetch = async (url, init = {}) => {
    counters.providerCalls += 1;
    if (options.providerTimeout) {
      return new Promise((resolve, reject) => {
        const abort = () => {
          reject(new DOMException("The operation was aborted.", "AbortError"));
        };
        if (!init.signal) {
          reject(new Error("timeout fixture requires an abort signal"));
        } else if (init.signal.aborted) {
          abort();
        } else {
          init.signal.addEventListener("abort", abort, { once: true });
        }
      });
    }
    if (options.formulaFixture && String(url).includes("api.resend.com") && typeof init.body === "string") {
      const payload = JSON.parse(init.body);
      const encoded = payload.attachments?.[0]?.content;
      if (typeof encoded === "string") counters.exportAttachments.push(Buffer.from(encoded, "base64").toString("utf8"));
    }
    const payload = options.providerFailure
      ? {}
      : options.providerOversized
        ? { item: [], data: [{ embedding: [0.1, 0.2] }], choices: [{ message: { content: "[]" } }], responses: [{ textAnnotations: [] }], padding: "x".repeat(9 * 1024 * 1024) }
        : { item: [], data: [{ embedding: [0.1, 0.2] }], choices: [{ message: { content: "[]" } }], responses: [{ textAnnotations: [] }] };
    const body = JSON.stringify(payload);
    return new Response(body, {
      status: options.providerFailure ? 502 : 200,
      statusText: options.providerFailure ? "Bad Gateway" : "OK",
      headers: new Headers({ "Content-Type": "application/json" }),
    });
  };
  const sharedSandbox = {
    AbortController,
    AbortSignal,
    Deno: { env: { get: (name) => environment[name] } },
    DOMException,
    Error,
    JSON,
    Math,
    Number,
    Object,
    Promise,
    RegExp,
    Response,
    Request,
    Set,
    String,
    TextDecoder,
    TextEncoder,
    URL,
    Array,
    clearTimeout,
    fetch: fakeFetch,
    setTimeout,
    crypto: { randomUUID: () => "44444444-4444-4444-8444-444444444444", subtle: webcrypto.subtle },
    console,
    createClient: (_url, _key, clientOptions = {}) => clientOptions.global?.headers?.Authorization
      ? { auth: { getUser: async () => {
        const token = clientOptions.global.headers.Authorization.replace(/^Bearer\s+/i, "");
        const accepted = token === principal.token || (request.principal === "owner" && token === "owner-refreshed-token");
        return options.authDeleted || request.auth === "invalid" || !accepted
          ? { data: { user: null }, error: { message: "User not found" } }
          : { data: { user: { id: principal.id, email: principal.email, user_metadata: {}, app_metadata: {} } }, error: null };
      } } }
      : serviceClient,
    exports: sharedModule.exports,
    module: sharedModule,
    require: () => ({}),
  };
  vm.runInNewContext(sharedCompiled, sharedSandbox, { filename: sharedPath });
  const sharedHelpers = sharedModule.exports;
  const chainModule = { exports: {} };
  const chainCompiled = typescript.transpileModule(stripImports(chainService), {
    compilerOptions: { target: typescript.ScriptTarget.ES2022, module: typescript.ModuleKind.CommonJS },
    fileName: chainServicePath,
  }).outputText;
  class ContractChatOpenAI {
    constructor() {
      this.invocation = 0;
    }

    async invoke() {
      counters.providerCalls += 1;
      if (options.providerFailure) throw new Error("provider_failure");
      this.invocation += 1;
      if (this.invocation === 1) return { content: JSON.stringify({ clusters: [] }) };
      if (this.invocation === 2) return { content: JSON.stringify({ summaries: [] }) };
      return { content: JSON.stringify({ connections: [] }) };
    }
  }
  const promptStub = {
    format: async (values) => Object.values(values).join("\n"),
  };
  vm.runInNewContext(chainCompiled, {
    ChatOpenAI: ContractChatOpenAI,
    classificationPrompt: promptStub,
    summaryPrompt: promptStub,
    connectionPrompt: promptStub,
    fetchProvider: sharedHelpers.fetchProvider,
    assertProviderInputSize: sharedHelpers.assertProviderInputSize,
    MAX_PROVIDER_RESPONSE_BYTES: sharedHelpers.MAX_PROVIDER_RESPONSE_BYTES,
    PROVIDER_TIMEOUT_MS: sharedHelpers.PROVIDER_TIMEOUT_MS,
    Error,
    JSON,
    Map,
    Object,
    Promise,
    String,
    TextEncoder,
    exports: chainModule.exports,
    module: chainModule,
  }, { filename: chainServicePath });
  const ChainService = chainModule.exports.ChainService;

  const sandbox = {
    AbortController,
    AbortSignal,
    ContractError: sharedHelpers.ContractError,
    Deno: sharedSandbox.Deno,
    DOMException,
    Error,
    JSON,
    Math,
    Number,
    Object,
    Promise,
    RegExp,
    Response,
    Request,
    Set,
    String,
    TextDecoder,
    TextEncoder,
    URL,
    Array,
    crypto: { randomUUID: () => "44444444-4444-4444-8444-444444444444", subtle: webcrypto.subtle },
    encodeURIComponent,
    unescape,
    btoa: (value) => Buffer.from(value, "binary").toString("base64"),
    console,
    serve: (handler) => { sandbox.handler = handler; },
    createServiceClient: sharedHelpers.createServiceClient,
    assertProviderInputSize: sharedHelpers.assertProviderInputSize,
    completeAiRecallQuota: sharedHelpers.completeAiRecallQuota,
    consumeAiRecallQuota: sharedHelpers.consumeAiRecallQuota,
    enforceFunctionRateLimit: sharedHelpers.enforceFunctionRateLimit,
    jsonResponse: sharedHelpers.jsonResponse,
    methodGuard: sharedHelpers.methodGuard,
    optionsResponse: sharedHelpers.optionsResponse,
    parseJsonBody: sharedHelpers.parseJsonBody,
    providerFailure: sharedHelpers.providerFailure,
    requireConsent: sharedHelpers.requireConsent,
    requireInteger: sharedHelpers.requireInteger,
    requireOwnedBook: sharedHelpers.requireOwnedBook,
    requireOwnedSource: sharedHelpers.requireOwnedSource,
    requireOwnedSourceForWrite: sharedHelpers.requireOwnedSourceForWrite,
    requireProviderSecret: sharedHelpers.requireProviderSecret,
    requireString: sharedHelpers.requireString,
    requireUuid: sharedHelpers.requireUuid,
    requireUser: sharedHelpers.requireUser,
    releaseAiRecallQuota: sharedHelpers.releaseAiRecallQuota,
    responseForError: sharedHelpers.responseForError,
    config,
    validateConfig,
    PatternCollector,
    InsightService,
    ProfileCollector,
    RecommendationService,
    ChainService,
    MAX_REQUEST_BYTES: 64 * 1024,
    MAX_TEXT_BYTES: 20_000,
    MAX_QUERY_BYTES: 500,
    clearTimeout,
    fetch: fakeFetch,
    fetchProvider: sharedHelpers.fetchProvider,
    setTimeout,
    exports: {},
    module: { exports: {} },
    require: () => ({}),
  };
  sandbox.sharedHelpers = sharedHelpers;
  return sandbox;
}

async function executeRequest(contract, requestConfig, options = {}) {
  const sourcePath = path.join(root, "..", contract.source);
  const source = fs.readFileSync(sourcePath, "utf8");
  const compiled = typescript.transpileModule(stripImports(source), {
    compilerOptions: { target: typescript.ScriptTarget.ES2022, module: typescript.ModuleKind.CommonJS },
    fileName: sourcePath,
  }).outputText;
  const events = [];
  const counters = { providerCalls: 0, serviceMutationCalls: 0, deletionRateLimitCalls: 0, exportAttachments: [] };
  const sandbox = makeContractRuntime({ ...requestConfig, name: contract.name }, events, counters, options);
  vm.runInNewContext(compiled, sandbox, { filename: sourcePath });
  if (typeof sandbox.handler !== "function") throw new Error(`${contract.name}: serve handler was not captured`);
  const headers = { "Content-Type": "application/json" };
  if (requestConfig.auth === "valid" || requestConfig.auth === "invalid") {
    const principal = fixture.principals[requestConfig.principal];
    headers.Authorization = `Bearer ${requestConfig.token ?? principal.token}`;
  }
  const method = requestConfig.method ?? "POST";
  const requestInit = { method, headers };
  if (method !== "GET" && method !== "HEAD") requestInit.body = JSON.stringify(requestConfig.body ?? {});
  const request = new Request(`http://localhost/functions/${contract.name}`, {
    ...requestInit,
  });
  const response = await sandbox.handler(request);
  const body = JSON.parse(await response.text());
  return { response, body, events, counters };
}

async function executeCrossUser(contract) {
  return executeRequest(contract, contract.crossUser.request);
}

async function executeDeleteReplay(contract) {
  const state = {};
  const first = await executeRequest(contract, ownerRequest(contract), state);
  assert(first.response.status === 200 && first.body.status === "completed", "delete-user: first disposable deletion completes");
  const replay = await executeRequest(contract, ownerRequest(contract), { ...state, authDeleted: true });
  assert(replay.response.status === contract.replayAfterAuthDeletion.status, "delete-user: completed replay after Auth deletion remains successful");
  assert(replay.body.status === contract.replayAfterAuthDeletion.bodyStatus, "delete-user: completed replay after Auth deletion is idempotent");
  assert(replay.counters.serviceMutationCalls === contract.replayAfterAuthDeletion.serviceMutationCalls, "delete-user: completed replay after Auth deletion performs no service mutation");

  const retryState = {
    deletionOperation: {
      user_id: fixture.principals.owner.id,
      status: "started",
      updated_at: "2026-09-10T00:00:00.000Z",
      completed_at: null,
    },
  };
  const retry = await executeRequest(contract, {
    ...ownerRequest(contract),
    token: contract.resumableRetry.request.token,
  }, retryState);
  assert(retry.response.status === contract.resumableRetry.status, "delete-user: refreshed-token retry remains successful");
  assert(retry.body.status === contract.resumableRetry.bodyStatus, "delete-user: refreshed-token retry resumes the deletion receipt");
  assert(retry.counters.deletionRateLimitCalls === contract.resumableRetry.rateLimitCalls, "delete-user: resumed deletion consumes its bounded resume budget");

  const revoked = await executeRequest(contract, contract.revokedReplay.request, {
    authDeleted: true,
    deletionOperation: {
      user_id: fixture.principals.owner.id,
      status: "data_deleted",
      updated_at: "2026-09-10T00:00:00.000Z",
      completed_at: null,
    },
  });
  assert(revoked.response.status === contract.revokedReplay.status, "delete-user: revoked replay cannot resume a data-deleted receipt");
  assert(revoked.body.status === contract.revokedReplay.bodyStatus, "delete-user: revoked replay returns the terminal deletion result");
  assert(revoked.counters.serviceMutationCalls === contract.revokedReplay.serviceMutationCalls, "delete-user: revoked replay performs no service mutation");

  const completionFailureState = { deletionCompletionFailure: true };
  const failedCompletion = await executeRequest(contract, ownerRequest(contract), completionFailureState);
  assert(failedCompletion.response.status === contract.recoveryAfterCompletionFailure.failureStatus, "delete-user: completion receipt failure is surfaced as unavailable");
  assert(failedCompletion.body.code === contract.recoveryAfterCompletionFailure.failureCode, "delete-user: completion receipt failure keeps the unavailable code");
  assert(completionFailureState.deletionOperation.status === "data_deleted", "delete-user: failed completion leaves a data-deleted receipt");
  const authDeleteIndex = failedCompletion.events.indexOf("auth:delete-user");
  const completionUpdateIndex = failedCompletion.events.indexOf("receipt:update:completed");
  assert(authDeleteIndex >= 0, "delete-user: completion failure follows a successful Auth deletion attempt");
  assert(authDeleteIndex < completionUpdateIndex, "delete-user: Auth deletion happens before the failed completion update");

  const revokedAfterFailure = await executeRequest(contract, contract.revokedReplay.request, {
    ...completionFailureState,
  });
  assert(revokedAfterFailure.response.status === contract.recoveryAfterCompletionFailure.revokedStatus, "delete-user: revoked replay after completion failure remains idempotent");
  assert(revokedAfterFailure.body.status === contract.recoveryAfterCompletionFailure.revokedBodyStatus, "delete-user: revoked replay after completion failure returns the terminal result");
  assert(revokedAfterFailure.counters.serviceMutationCalls === 0, "delete-user: revoked replay after completion failure performs no service mutation");

  const authFailureState = { authDeleteFailure: true };
  const failedAuth = await executeRequest(contract, ownerRequest(contract), authFailureState);
  assert(failedAuth.response.status === contract.recoveryAfterAuthFailure.failureStatus, "delete-user: Auth deletion failure is surfaced as unavailable");
  assert(failedAuth.body.code === contract.recoveryAfterAuthFailure.failureCode, "delete-user: Auth deletion failure keeps the unavailable code");
  assert(authFailureState.deletionOperation.status === "data_deleted", "delete-user: Auth deletion failure preserves a data-deleted receipt");

  const recoveredAuth = await executeRequest(contract, ownerRequest(contract), authFailureState);
  assert(recoveredAuth.response.status === contract.recoveryAfterAuthFailure.recoveredStatus, "delete-user: a verified retry can reconcile an Auth failure");
  assert(recoveredAuth.body.status === contract.recoveryAfterAuthFailure.recoveredBodyStatus, "delete-user: verified Auth recovery is idempotent");
}

function ownerRequest(contract) {
  const base = {
    auth: "valid",
    principal: "owner",
    body: {},
  };
  switch (contract.name) {
    case "aladin-books": return { ...base, body: { query: "fixture book" } };
    case "recall-search": return { ...base, body: { query: "fixture memory" } };
    case "generate-embedding": return { ...base, body: { userId: fixture.principals.owner.id, bookId: OWNER_BOOK_ID, contentType: "highlight", contentText: "fixture highlight", sourceId: OWNER_SOURCE_ID } };
    case "extract-keywords":
    case "structure-notes":
    case "generate-book-review": return { ...base, body: { bookId: OWNER_BOOK_ID } };
    case "reading-insights": return { ...base, body: { userId: fixture.principals.owner.id } };
    case "recommend-next-books": return { ...base, body: { userId: fixture.principals.owner.id, locale: "ko" } };
    case "vision-ocr": return { ...base, body: { bookId: OWNER_BOOK_ID, imageId: OWNER_SOURCE_ID, imageBase64: "aGVsbG8=" } };
    case "export-reading-data": return { ...base, body: { format: "csv", includeImages: true } };
    case "delete-user": return { ...base, body: { confirmation: true } };
    default: throw new Error(`unknown contract ${contract.name}`);
  }
}

function scenarioRequest(contract, scenario) {
  if (scenario === "unauthenticated") return { ...ownerRequest(contract), auth: "missing" };
  if (scenario === "invalid") {
    const request = ownerRequest(contract);
    return { ...request, body: {} };
  }
  if (scenario === "oversizedInput") {
    const request = ownerRequest(contract);
    if (contract.name === "vision-ocr") return { ...request, body: { ...request.body, imageBase64: "A".repeat(7 * 1024 * 1024) } };
    if (contract.name === "delete-user") return { ...request, body: { confirmation: true, padding: "x".repeat(70 * 1024) } };
    return { ...request, body: { ...request.body, query: "x".repeat(70 * 1024) } };
  }
  return ownerRequest(contract);
}

async function executeScenario(contract, scenario) {
  const request = scenarioRequest(contract, scenario);
  const options = {
    consentRequired: scenario === "consentRequired",
    rateLimited: scenario === "rateLimit",
    quotaExceeded: contract.name === "vision-ocr" && scenario === "rateLimit",
    providerFailure: scenario === "providerFailure" && contract.name !== "delete-user",
    serviceFailure: (scenario === "providerFailure" && contract.name === "delete-user")
      || (scenario === "databaseFailure" && ["export-reading-data", "generate-book-review", "reading-insights", "recall-search"].includes(contract.name)),
    formulaFixture: contract.name === "export-reading-data" && scenario === "valid",
    exportBareCarriageReturn: contract.name === "export-reading-data" && scenario === "valid",
    exportForeignImageRows: contract.name === "export-reading-data" && scenario === "valid",
  };
  return executeRequest(contract, request, options);
}

async function executeConsentBoundary() {
  const typescript = createRequire(import.meta.url)(path.join(root, "node_modules", "typescript"));
  const compiled = typescript.transpileModule(stripImports(policy), {
    compilerOptions: { target: typescript.ScriptTarget.ES2022, module: typescript.ModuleKind.CommonJS },
    fileName: policyPath,
  }).outputText;
  const moduleExports = {};
  const sandbox = {
    ContractError: class ContractError extends Error {
      constructor(status, code, message, details = undefined) {
        super(message);
        this.status = status;
        this.code = code;
        this.details = details;
      }
    },
    console,
    exports: moduleExports,
    module: { exports: moduleExports },
  };
  vm.runInNewContext(compiled, sandbox, { filename: policyPath });
  const user = { id: FOREIGN_USER_ID, user_metadata: { consents: { ai: true } }, app_metadata: {} };
  const client = (row) => {
    const query = {
      select: () => query,
      eq: () => query,
      maybeSingle: async () => ({ data: row, error: null }),
      then: (resolve, reject) => Promise.resolve({ data: [], error: null }).then(resolve, reject),
    };
    return { from: () => query };
  };
  const sourceClient = ({ embedding = null, image = null, images = [] } = {}) => ({
    from: (table) => {
      const filters = {};
      const query = {
        select: () => query,
        eq: (column, value) => { filters[column] = value; return query; },
        maybeSingle: async () => ({
          data: table === "reading_content_embeddings" ? embedding : image,
          error: null,
        }),
        then: (resolve, reject) => Promise.resolve({
          data: table === "book_images" && filters.book_id === OWNER_BOOK_ID ? images : [],
          error: null,
        }).then(resolve, reject),
      };
      return query;
    },
  });
  let bypassRejected = false;
  try {
    await sandbox.module.exports.requireConsent(client(null), user, "ai");
  } catch (error) {
    bypassRejected = error?.status === 403 && error?.code === "consent_required";
  }
  assert(bypassRejected, "consent boundary rejects caller-editable JWT metadata without durable grant");
  await sandbox.module.exports.requireConsent(client({ status: "granted", version: "2026-09" }), user, "ai");
  pass("consent boundary accepts a durable granted consent row");
  let missingSourceRejected = false;
  try {
    await sandbox.module.exports.requireOwnedSourceForWrite(client(null), FOREIGN_USER_ID, OWNER_BOOK_ID, "photo_ocr", OWNER_SOURCE_ID);
  } catch (error) {
    missingSourceRejected = error?.status === 403 && error?.code === "cross_user_access";
  }
  assert(missingSourceRejected, "source boundary rejects a first write for an unknown source");
  let foreignEmbeddingRejected = false;
  try {
    await sandbox.module.exports.requireOwnedSourceForWrite(
      sourceClient({ embedding: { user_id: FOREIGN_USER_ID, book_id: OWNER_BOOK_ID } }),
      fixture.principals.owner.id,
      OWNER_BOOK_ID,
      "highlight",
      OWNER_SOURCE_ID,
    );
  } catch (error) {
    foreignEmbeddingRejected = error?.status === 403 && error?.code === "cross_user_access";
  }
  assert(foreignEmbeddingRejected, "source boundary rejects an embedding owned by another user");
  let foreignImageRejected = false;
  try {
    await sandbox.module.exports.requireOwnedSourceForWrite(
      sourceClient({ image: { id: OWNER_SOURCE_ID, user_id: FOREIGN_USER_ID, book_id: OWNER_BOOK_ID } }),
      fixture.principals.owner.id,
      OWNER_BOOK_ID,
      "photo_ocr",
      OWNER_SOURCE_ID,
    );
  } catch (error) {
    foreignImageRejected = error?.status === 403 && error?.code === "cross_user_access";
  }
  assert(foreignImageRejected, "source boundary rejects an image owned by another user");
  await sandbox.module.exports.requireOwnedSourceForWrite(
    sourceClient({ images: [{ id: "image-1", user_id: fixture.principals.owner.id, book_id: OWNER_BOOK_ID, highlights: [{ id: OWNER_SOURCE_ID }] }] }),
    fixture.principals.owner.id,
    OWNER_BOOK_ID,
    "highlight",
    OWNER_SOURCE_ID,
  );
  pass("source boundary accepts a highlight in an owned book image");

  await sandbox.module.exports.requireOwnedSourceForWrite(
    sourceClient(),
    fixture.principals.owner.id,
    OWNER_BOOK_ID,
    "note",
    NOTE_SOURCE_ID,
  );
  pass("source boundary accepts a first note in an owned book");
  let foreignNoteRejected = false;
  try {
    await sandbox.module.exports.requireOwnedSourceForWrite(
      sourceClient({ embedding: { user_id: FOREIGN_USER_ID, book_id: OWNER_BOOK_ID } }),
      fixture.principals.owner.id,
      OWNER_BOOK_ID,
      "note",
      NOTE_SOURCE_ID,
    );
  } catch (error) {
    foreignNoteRejected = error?.status === 403 && error?.code === "cross_user_access";
  }
  assert(foreignNoteRejected, "source boundary rejects a note source owned by another user");
  let foreignNoteImageRejected = false;
  try {
    await sandbox.module.exports.requireOwnedSourceForWrite(
      sourceClient({ image: { id: NOTE_SOURCE_ID, user_id: FOREIGN_USER_ID, book_id: OWNER_BOOK_ID } }),
      fixture.principals.owner.id,
      OWNER_BOOK_ID,
      "note",
      NOTE_SOURCE_ID,
    );
  } catch (error) {
    foreignNoteImageRejected = error?.status === 403 && error?.code === "cross_user_access";
  }
  assert(foreignNoteImageRejected, "source boundary rejects a note source that belongs to another user's image");
}

async function executeNoteEmbeddingBoundary() {
  const contract = fixture.cases.find((item) => item.name === "generate-embedding");
  const firstNote = await executeRequest(contract, {
    auth: "valid",
    principal: "owner",
    body: {
      userId: fixture.principals.owner.id,
      bookId: OWNER_BOOK_ID,
      contentType: "note",
      contentText: "first note",
      sourceId: NOTE_SOURCE_ID,
    },
  });
  assert(firstNote.response.status === 200, "generate-embedding: first note write succeeds");
  assert(firstNote.counters.providerCalls === 1, "generate-embedding: first note reaches provider after book ownership");

  const missingNoteSource = await executeRequest(contract, {
    auth: "valid",
    principal: "owner",
    body: {
      userId: fixture.principals.owner.id,
      bookId: OWNER_BOOK_ID,
      contentType: "note",
      contentText: "source-less note",
    },
  });
  assert(missingNoteSource.response.status === 400, "generate-embedding: source-less note is rejected");
  assert(missingNoteSource.body.code === "invalid_request", "generate-embedding: source-less note returns invalid_request");
  assert(missingNoteSource.counters.providerCalls === 0, "generate-embedding: source-less note stops before provider work");

  const foreignNote = await executeRequest(contract, {
    auth: "valid",
    principal: "owner",
    body: {
      userId: fixture.principals.owner.id,
      bookId: OWNER_BOOK_ID,
      contentType: "note",
      contentText: "foreign note source",
      sourceId: NOTE_SOURCE_ID,
    },
  }, { existingEmbedding: { user_id: FOREIGN_USER_ID, book_id: OWNER_BOOK_ID } });
  assert(foreignNote.response.status === 403, "generate-embedding: foreign note source is rejected");
  assert(foreignNote.body.code === "cross_user_access", "generate-embedding: foreign note source code is cross_user_access");
  assert(foreignNote.counters.providerCalls === 0, "generate-embedding: foreign note source stops before provider work");

  const foreignNoteImage = await executeRequest(contract, {
    auth: "valid",
    principal: "owner",
    body: {
      userId: fixture.principals.owner.id,
      bookId: OWNER_BOOK_ID,
      contentType: "note",
      contentText: "foreign image source",
      sourceId: NOTE_SOURCE_ID,
    },
  }, { existingImage: { id: NOTE_SOURCE_ID, user_id: FOREIGN_USER_ID, book_id: OWNER_BOOK_ID } });
  assert(foreignNoteImage.response.status === 403, "generate-embedding: note source reusing a foreign image is rejected");
  assert(foreignNoteImage.body.code === "cross_user_access", "generate-embedding: foreign image note source code is cross_user_access");
  assert(foreignNoteImage.counters.providerCalls === 0, "generate-embedding: foreign image note source stops before provider work");
}

async function executeStoredProviderInputBoundary() {
  const oversizedContent = "x".repeat(128 * 1024);
  for (const name of ["generate-book-review", "structure-notes", "extract-keywords"]) {
    const contract = fixture.cases.find((item) => item.name === name);
    const expected = contract.storedProviderInput;
    assert(expected && typeof expected.status === "number", `${name}: stored provider input fixture is machine-readable`);
    const result = await executeRequest(contract, ownerRequest(contract), { storedContentText: oversizedContent });
    assert(result.response.status === expected.status, `${name}: oversized stored provider input status ${result.response.status} matches ${expected.status}`);
    if (expected.code) assert(result.body.code === expected.code, `${name}: oversized stored provider input code ${result.body.code} matches ${expected.code}`);
    assert(result.counters.providerCalls === expected.providerCalls, `${name}: oversized stored provider input provider calls ${result.counters.providerCalls}`);
  }
}

async function executeStreamingBodyBoundary() {
  const sandbox = makeContractRuntime(
    { principal: "owner" },
    [],
    { providerCalls: 0, serviceMutationCalls: 0, exportAttachments: [] },
  );
  let reads = 0;
  let canceled = false;
  const reader = {
    read: async () => {
      if (reads === 0) {
        reads += 1;
        return { done: false, value: new Uint8Array(64 * 1024) };
      }
      if (reads === 1) {
        reads += 1;
        return { done: false, value: new Uint8Array(1) };
      }
      return { done: true, value: undefined };
    },
    cancel: async () => {
      canceled = true;
    },
  };
  const request = {
    headers: new Headers({ "Content-Type": "application/json" }),
    body: { getReader: () => reader },
  };
  try {
    await sandbox.sharedHelpers.parseJsonBody(request, 64 * 1024);
    fail("shared contract accepts an oversized chunked body");
  } catch (error) {
    assert(error?.status === 413 && error?.code === "payload_too_large", "shared contract rejects an oversized chunked body");
  }
  assert(canceled, "shared contract cancels the body reader at the byte limit");
}

async function executeIntegerBoundary() {
  const sandbox = makeContractRuntime(
    { principal: "owner" },
    [],
    { providerCalls: 0, serviceMutationCalls: 0, exportAttachments: [] },
  );
  let rejected = false;
  try {
    sandbox.sharedHelpers.requireInteger({ limit: null }, "limit", 1, 10, 5);
  } catch (error) {
    rejected = error?.status === 400 && error?.code === "invalid_request";
  }
  assert(rejected, "shared contract rejects explicit null instead of applying an integer fallback");
}

async function executeProviderTimeoutBoundary() {
  const sandbox = makeContractRuntime(
    { principal: "owner" },
    [],
    { providerCalls: 0, serviceMutationCalls: 0, exportAttachments: [] },
    { providerTimeout: true },
  );
  let timedOut = false;
  try {
    await sandbox.sharedHelpers.fetchProvider(
      "https://provider.test/slow",
      { method: "POST" },
      5,
    );
  } catch (error) {
    timedOut = error instanceof Error && error.message === "provider_timeout";
  }
  assert(timedOut, "provider boundary aborts a hanging request and normalizes timeout");
}

async function executeProviderResponseBoundary() {
  const sandbox = makeContractRuntime(
    { principal: "owner" },
    [],
    { providerCalls: 0, serviceMutationCalls: 0, exportAttachments: [], providerOversized: true },
  );
  let rejected = false;
  try {
    await sandbox.sharedHelpers.fetchProvider(
      "https://provider.test/oversized",
      { method: "POST" },
      100,
      8,
    );
  } catch (error) {
    rejected = error instanceof Error && error.message === "provider_response_too_large";
  }
  assert(rejected, "provider boundary cancels an oversized response body");
}

async function executeProviderResponseScenarios() {
  for (const name of ["aladin-books", "generate-embedding", "extract-keywords", "generate-book-review", "vision-ocr", "export-reading-data"]) {
    const contract = fixture.cases.find((item) => item.name === name);
    const result = await executeRequest(contract, ownerRequest(contract), { providerOversized: true });
    assert(result.response.status === 502, `${name}: oversized provider response is rejected before parsing`);
  }
}

assert(fixture.name === "consumer-function-contracts", "fixture identifies consumer function contracts");
assert(fixture.negativeFixture === "cross-user", "fixture declares cross-user negative coverage");
assert(fs.existsSync(consentMigrationPath) && fs.existsSync(consentRoutePath), "consent producer boundary files exist");
assert(fs.existsSync(recallMigrationPath), "recall reservation lease migration exists");
assert(fs.existsSync(deletionMigrationPath), "deletion replay receipt migration exists");
assert(fs.existsSync(deletionScopeMigrationPath), "deletion replay receipt is scoped to one durable operation per user");
await executeConsentBoundary();
await executeNoteEmbeddingBoundary();
await executeStreamingBodyBoundary();
await executeIntegerBoundary();
await executeProviderTimeoutBoundary();
await executeProviderResponseBoundary();
await executeStoredProviderInputBoundary();
await executeProviderResponseScenarios();

const normalizedGrep = grep ? normalized(grep) : null;
const selected = normalizedGrep
  ? fixture.cases.filter((item) => Object.keys(item).some((key) => normalized(key) === normalizedGrep))
  : fixture.cases;
if (selected.length === 0) fail(`no contract cases matched --grep ${grep}`);

for (const contract of selected) {
  const sourcePath = path.join(root, "..", contract.source);
  assert(fs.existsSync(sourcePath), `${contract.name}: source exists`);
  if (!fs.existsSync(sourcePath)) continue;

  const expectations = ["valid", "invalid", "unauthenticated", "crossUser", "consentRequired", "oversizedInput", "rateLimit", "providerFailure", "databaseFailure"];
  for (const expectation of expectations) {
    const value = contract[expectation];
    if (!value) continue;
    const validStatus = expectation === "valid" ? typeof value?.status === "number" : typeof value?.status === "number" || value?.status === null;
    const validCode = expectation === "valid"
      ? (value?.code === undefined || typeof value.code === "string")
      : expectation === "consentRequired" && value?.disposition === "not_applicable"
        ? value?.code === undefined
        : typeof value?.code === "string";
    assert(value && validStatus && validCode, `${contract.name}: ${expectation} fixture is machine-readable`);
    if (expectation === "consentRequired") {
      assert(value?.disposition === "required" || value?.disposition === "not_applicable", `${contract.name}: consent disposition is explicit`);
      if (value?.disposition === "not_applicable") {
        assert(typeof value.reason === "string" && value.reason.length > 0, `${contract.name}: non-applicable consent reason is recorded`);
      }
    }
  }
  const crossUser = contract.crossUser;
  assert(crossUser?.request?.auth === "valid" || crossUser?.request?.auth === "missing", `${contract.name}: cross-user request declares auth principal`);
  assert(crossUser?.assertions?.requestExecuted === true, `${contract.name}: cross-user request declares execution assertion`);
  if (contract.idempotent) {
    assert(contract.idempotent.request?.auth === "valid", `${contract.name}: idempotence request uses a verified principal`);
    assert(contract.idempotent.assertions?.requestExecuted === true, `${contract.name}: idempotence request declares execution assertion`);
  }

  switch (contract.ownership) {
    case "book":
      break;
    case "book_and_source":
      break;
    case "user_id_match":
      break;
    case "user_id_and_email_match":
      break;
    case "jwt_only":
      break;
    default:
      fail(`${contract.name}: unknown ownership policy ${contract.ownership}`);
  }

  try {
    const { response, body, events, counters } = await executeCrossUser(contract);
    assert(crossUser.assertions.requestExecuted === true, `${contract.name}: handler request executed`);
    assert(response.status === crossUser.status, `${contract.name}: cross-user status ${response.status} matches ${crossUser.status}`);
    assert(body.code === crossUser.code, `${contract.name}: cross-user code ${body.code} matches ${crossUser.code}`);
    assert(counters.providerCalls === crossUser.assertions.providerCalls, `${contract.name}: cross-user provider calls ${counters.providerCalls}`);
    assert(counters.serviceMutationCalls === crossUser.assertions.serviceMutationCalls, `${contract.name}: cross-user service mutations ${counters.serviceMutationCalls}`);
    if (contract.ownership === "book" || contract.ownership === "book_and_source") {
      assert(events[0] === "ownership:book", `${contract.name}: ownership rejection is first service boundary`);
      assert(!events.some((event) => event.startsWith("policy:")), `${contract.name}: cross-user request stops before policy work`);
    }
  } catch (error) {
    fail(`${contract.name}: cross-user request harness failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  for (const scenario of ["valid", "invalid", "unauthenticated", "oversizedInput", "consentRequired", "rateLimit", "providerFailure", "databaseFailure"]) {
    if (!contract[scenario] || contract[scenario].status === null) continue;
    try {
      const result = await executeScenario(contract, scenario);
      const { response, body } = result;
      assert(response.status === contract[scenario].status, `${contract.name}: ${scenario} status ${response.status} matches ${contract[scenario].status}`);
      if (scenario === "consentRequired" && contract[scenario].disposition === "not_applicable") {
        assert(body.code === undefined, `${contract.name}: consentRequired not-applicable path does not emit consent_required`);
      } else if (contract[scenario].code !== undefined) {
        assert(body.code === contract[scenario].code, `${contract.name}: ${scenario} code ${body.code} matches ${contract[scenario].code}`);
      }
      if (contract.name === "export-reading-data" && scenario === "valid") {
        assert(typeof body.exportId === "string", "export-reading-data: valid response has exportId");
        assert(body.format === "csv" && body.status === "ready", "export-reading-data: valid response matches export result contract");
        const attachment = result.counters.exportAttachments[0] ?? "";
        assert(attachment.includes("'=HYPERLINK"), "export-reading-data: CSV escapes formula-like book titles");
        assert(attachment.includes("'@SUM"), "export-reading-data: CSV escapes formula-like note text");
        assert(attachment.includes("'-2+3"), "export-reading-data: CSV escapes formula-like image captions");
        assert(attachment.includes('"line1\rline2"'), "export-reading-data: CSV quotes bare carriage returns");
        assert(!attachment.includes(",=HYPERLINK"), "export-reading-data: CSV has no unescaped formula field");
        assert(result.events.includes(`query:book_images:or:user_id.is.null,user_id.eq.${fixture.principals.owner.id}`), "export-reading-data: image query scopes rows before the service-role limit");
      }
      if (contract.name === "delete-user" && scenario === "valid") {
        const imageStorageEvent = result.events.find((event) => event.startsWith("storage:book-images:")) ?? "";
        assert(imageStorageEvent.includes(`${fixture.principals.owner.id}/${OWNER_BOOK_ID}/fixture.jpg`), "delete-user: valid request removes bound book image objects");
        assert(imageStorageEvent.includes(LEGACY_REPLACEMENT_PATH), "delete-user: valid request removes legacy replacement image objects");
        assert(imageStorageEvent.includes(CANONICAL_ORPHAN_PATH), "delete-user: valid request removes canonical orphan image objects");
        assert(imageStorageEvent.includes(OWNERLESS_ORPHAN_PATH), "delete-user: valid request removes ownerless objects from validated user paths");
        assert(!imageStorageEvent.includes("other-user-object.jpg"), "delete-user: valid request rejects unbound shared image paths");
        assert(!imageStorageEvent.includes(FOREIGN_LEGACY_PATH), "delete-user: valid request rejects foreign legacy objects with a victim-shaped book UUID");
        assert(!imageStorageEvent.includes(FOREIGN_ROW_DERIVED_PATH), "delete-user: valid request rejects foreign row-derived storage paths");
        const avatarStorageEvent = result.events.find((event) => event.startsWith("storage:avatars:")) ?? "";
        assert(avatarStorageEvent.includes(`${fixture.principals.owner.id}/orphan.png`), "delete-user: valid request removes owned avatar objects");
        assert(!avatarStorageEvent.includes(FOREIGN_PROFILE_AVATAR_PATH), "delete-user: valid request rejects foreign profile avatar objects");
        assert(!avatarStorageEvent.includes(FOREIGN_DEFAULT_AVATAR_PATH), "delete-user: valid request rejects foreign default avatar objects");
      }
      if (contract.name === "recall-search" && scenario === "valid") {
        assert(result.events.includes("policy:quota:complete"), "recall-search: successful request completes quota reservation");
      }
      if (contract.name === "recall-search" && scenario === "providerFailure") {
        assert(result.events.includes("policy:quota:release"), "recall-search: provider failure releases quota reservation");
      }
    } catch (error) {
      fail(`${contract.name}: ${scenario} request harness failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  if (contract.idempotent) {
    try {
      const { response, body, events, counters } = await executeRequest(contract, contract.idempotent.request, { profilePresent: false });
      assert(response.status === contract.idempotent.status, `${contract.name}: idempotent status ${response.status} matches ${contract.idempotent.status}`);
      assert(body.status === contract.idempotent.bodyStatus, `${contract.name}: idempotent body status is ${body.status}`);
      if (contract.idempotent.assertions.serviceMutationCalls !== undefined) {
        assert(counters.serviceMutationCalls === contract.idempotent.assertions.serviceMutationCalls, `${contract.name}: idempotent mutation calls ${counters.serviceMutationCalls}`);
      }
      if (contract.idempotent.assertions.authDeleteAttempted === true) {
        assert(events.includes("auth:delete-user"), `${contract.name}: idempotent retry attempts Auth deletion`);
      }
    } catch (error) {
      fail(`${contract.name}: idempotent request harness failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  if (contract.name === "delete-user") {
    try {
      await executeDeleteReplay(contract);
    } catch (error) {
      fail(`${contract.name}: post-delete replay harness failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

if (grep) console.log(`Selected ${selected.length} contract cases for ${grep}`);
if (failures.length > 0) {
  console.error(`FAIL ${failures.length} contract assertions`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log(`PASS ${selected.length} consumer function contracts with request-level happy and failure coverage`);
