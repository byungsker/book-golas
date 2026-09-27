import fs from "node:fs";
import path from "node:path";
import * as vm from "node:vm";

function loadModule(filePath, typescript, dependencies = {}) {
  const source = fs.readFileSync(filePath, "utf8");
  const compiled = typescript.transpileModule(source, {
    compilerOptions: {
      target: typescript.ScriptTarget.ES2022,
      module: typescript.ModuleKind.CommonJS,
    },
    fileName: filePath,
  }).outputText;
  const sourceModule = { exports: {} };
  const sandbox = {
    AbortController,
    AbortSignal,
    DOMException,
    Error,
    Headers,
    JSON,
    Math,
    Number,
    Object,
    Promise,
    Request,
    Response,
    String,
    URL,
    clearTimeout,
    crypto: globalThis.crypto,
    exports: sourceModule.exports,
    fetch,
    module: sourceModule,
    performance,
    require: (specifier) => dependencies[specifier],
    setTimeout,
  };
  vm.runInNewContext(compiled, sandbox, { filename: filePath });
  return sourceModule.exports;
}

function consentClient(result, calls) {
  const query = {
    select: () => query,
    eq: (column, value) => {
      calls.push([column, value]);
      return query;
    },
    maybeSingle: async () => result,
  };
  return {
    from: (table) => {
      calls.push(["table", table]);
      return query;
    },
  };
}

function budgetClient(result, calls) {
  return {
    rpc: async (name, input) => {
      calls.push([name, input]);
      return result;
    },
  };
}

export async function runAiBackendPolicyContract({ assert, root, typescript }) {
  const sharedRoot = path.join(root, "..", "supabase", "functions", "_shared");
  const consentPath = path.join(sharedRoot, "third-party-ai-consent.ts");
  const usageContractPath = path.join(sharedRoot, "ai-usage-contract.ts");
  const usagePath = path.join(sharedRoot, "ai-usage.ts");
  const consumerPolicyPath = path.join(sharedRoot, "consumer-policy.ts");
  const initialMigrationPath = path.join(root, "..", "supabase", "migrations", "20260102055239_initial_schema.sql");
  const migrationPath = path.join(root, "..", "supabase", "migrations", "20260923094828_reconcile_web_ai_consent_and_spend_policy.sql");
  const contractPath = path.join(root, "docs", "ai-consent-contract.json");
  const requiredPaths = [consentPath, usageContractPath, usagePath, consumerPolicyPath, initialMigrationPath, migrationPath, contractPath];
  for (const filePath of requiredPaths) {
    assert(fs.existsSync(filePath) && fs.statSync(filePath).size > 0, `AI backend policy file exists: ${path.relative(root, filePath)}`);
  }
  if (requiredPaths.some((filePath) => !fs.existsSync(filePath))) return;

  const consent = loadModule(consentPath, typescript);
  const usageContract = loadModule(usageContractPath, typescript);
  const usage = loadModule(usagePath, typescript, {
    "./ai-usage-contract.ts": usageContract,
  });
  const contract = JSON.parse(fs.readFileSync(contractPath, "utf8"));
  const consumerPolicy = fs.readFileSync(consumerPolicyPath, "utf8");
  const initialMigration = fs.readFileSync(initialMigrationPath, "utf8");
  const migration = fs.readFileSync(migrationPath, "utf8");

  assert(/IF EXISTS \([\s\S]*column_name = 'preferred_hour'[\s\S]*COMMENT ON COLUMN public\.fcm_tokens\.preferred_hour/.test(initialMigration), "initial FCM migration guards the legacy preferred_hour comment for reset bootstrap");
  assert(initialMigration.includes('DROP POLICY IF EXISTS "Users can delete their own books" ON public.books') && initialMigration.includes('CREATE POLICY "Users can delete their own books" ON public.books'), "initial RLS migration replaces legacy policy names idempotently");
  assert(consumerPolicy.includes('.from("user_consents")') && consumerPolicy.includes('"Consent verification is unavailable"'), "existing consumer policy remains canonical and fail closed");
  assert(migration.includes("record_third_party_ai_consent") && migration.includes("INSERT INTO public.user_consents"), "provider consent RPC atomically updates canonical consent");
  assert(migration.includes("sync_canonical_ai_consent_revocation") && migration.includes("ENABLE ROW LEVEL SECURITY"), "canonical revocation and RLS boundaries are migration-backed");
  for (const reason of ["rate_limit_exceeded", "concurrency_exceeded", "budget_exceeded", "hard_cap_exceeded"]) {
    assert(migration.includes(reason), `migration persists ${reason} decisions`);
  }
  assert(migration.includes("REVOKE ALL ON FUNCTION public.reserve_ai_usage") && migration.includes("TO authenticated"), "AI reservation RPC preserves authenticated execution boundaries");

  const grantedCalls = [];
  const granted = await consent.readThirdPartyAiConsent(
    consentClient({ data: { status: "granted", version: "third-party-ai-v2" }, error: null }, grantedCalls),
    "user-1",
    "open_ai",
  );
  assert(granted.state === "granted" && granted.canSend === true, "canonical AI consent grants OpenAI sends");
  assert(grantedCalls.some(([column, value]) => column === "kind" && value === "ai"), "OpenAI consent maps to canonical user_consents.ai");

  const denied = await consent.readThirdPartyAiConsent(
    consentClient({ data: { status: "denied", version: "third-party-ai-v2" }, error: null }, []),
    "user-1",
    "google_cloud_vision",
  );
  const unknown = await consent.readThirdPartyAiConsent(
    consentClient({ data: null, error: null }, []),
    "user-1",
    "open_ai",
  );
  const unavailable = await consent.readThirdPartyAiConsent(
    consentClient({ data: null, error: { message: "offline" } }, []),
    "user-1",
    "open_ai",
  );
  assert(denied.state === "revoked" && denied.canSend === false, "revoked OCR consent fails closed");
  assert(unknown.state === "unknown" && unknown.canSend === false, "unknown AI consent fails closed");
  assert(unavailable.state === "unavailable" && unavailable.canSend === false, "unavailable consent storage fails closed");

  for (const reason of ["rate_limit_exceeded", "concurrency_exceeded", "budget_exceeded", "hard_cap_exceeded"]) {
    const calls = [];
    let observedCode = null;
    try {
      await usage.consumeAiBudget(
        budgetClient({ data: { allowed: false, reason }, error: null }, calls),
        100,
        { functionName: "contract-test", feature: "summary", provider: "open_ai", model: "gpt-4o-mini", maxOutputTokens: 100 },
      );
    } catch (error) {
      observedCode = error?.code ?? null;
    }
    assert(observedCode === reason, `AI spend policy preserves ${reason}`);
    assert(calls.length === 1 && calls[0][0] === "reserve_ai_usage", `${reason} stops at the reservation boundary`);
  }

  let malformedCode = null;
  try {
    await usage.consumeAiBudget(
      budgetClient({ data: { allowed: true }, error: null }, []),
      Number.NaN,
      { functionName: "contract-test", provider: "open_ai", model: "gpt-4o-mini" },
    );
  } catch (error) {
    malformedCode = error?.code ?? null;
  }
  assert(malformedCode === "invalid_contract_input", "malformed usage contract input fails closed");

  let modelCode = null;
  try {
    await usage.consumeAiBudget(
      budgetClient({ data: null, error: null }, []),
      100,
      { functionName: "contract-test", provider: "open_ai", model: "unapproved-model" },
    );
  } catch (error) {
    modelCode = error?.code ?? null;
  }
  assert(modelCode === "model_not_allowed", "unapproved AI models fail before reservation");

  const row = usageContract.buildAiUsageLogRow({
    context: { userId: "user-1", requestId: "request-1", callId: "call-1", functionName: "contract-test", feature: "summary", provider: "open_ai", model: "gpt-4o-mini", promptVersion: "v1" },
    usage: { input_tokens: 10, output_tokens: 5, total_tokens: 15 },
    latencyMs: 10.4,
    status: "success",
  });
  assert(row.input_tokens === 10 && row.output_tokens === 5 && row.total_tokens === 15 && row.estimated_cost_microusd === 5, "usage accounting is deterministic in integer microdollars");

  const response = usage.aiUsageErrorResponse(new usage.AiUsageError("provider_error", 502, "request-1"), {});
  const responseBody = await response.json();
  assert(response.status === 502 && responseBody.error === "provider_error" && responseBody.audit?.requestId === "request-1", "provider failures expose a stable auditable error shape");

  const providerCalls = [];
  const usageRows = [];
  let providerFailureCode = null;
  try {
    await usage.withTrackedAiBudget(
      {
        rpc: async (name, input) => {
          providerCalls.push([name, input]);
          return name === "reserve_ai_usage"
            ? { data: { allowed: true, leaseId: "lease-1" }, error: null }
            : { data: true, error: null };
        },
      },
      { from: () => ({ insert: async (row) => { usageRows.push(row); return { error: null }; } }) },
      "user-1",
      100,
      { functionName: "contract-test", feature: "summary", provider: "open_ai", model: "gpt-4o-mini", promptVersion: "v1", requestId: "request-1", callId: "call-1", maxOutputTokens: 100 },
      async () => { throw new Error("provider unavailable"); },
    );
  } catch (error) {
    providerFailureCode = error?.code ?? null;
  }
  assert(providerFailureCode === "provider_error" && usageRows[0]?.status === "failure", "provider failure is accounted before returning an error");
  assert(providerCalls.map(([name]) => name).join(",") === "reserve_ai_usage,release_ai_usage", "provider failure releases its concurrency lease");

  assert(contract.backendConsent?.canonicalTable === "user_consents", "machine-readable contract names canonical consent storage");
  assert(contract.backendConsent?.providerKinds?.open_ai === "ai" && contract.backendConsent?.providerKinds?.google_cloud_vision === "ocr", "machine-readable contract pins provider-to-kind mappings");
  assert(Array.isArray(contract.aiSpendPolicy?.blockedReasons) && contract.aiSpendPolicy.blockedReasons.includes("hard_cap_exceeded"), "machine-readable contract declares spend-policy failures");
  assert(contract.migrationValidation?.status === "blocked" && contract.migrationValidation?.requiredForCompletion === true, "migration gate remains blocked until database checks pass");
  assert(contract.migrationValidation?.owner === "Todo 4 backend owner", "migration gate names its remediation owner");
  assert(contract.migrationValidation?.commands?.join(",") === "supabase db reset,supabase db lint", "migration gate records the required database commands");
  assert(typeof contract.migrationValidation?.reason === "string" && typeof contract.migrationValidation?.nextStep === "string", "migration gate records blocker reason and next step");
}
