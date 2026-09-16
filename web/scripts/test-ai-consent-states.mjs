import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const fixtureMode = process.argv[2] === "--fixture" ? process.argv[3] : null;
const paths = {
  contract: path.join(root, "docs/ai-consent-contract.json"),
  fixture: path.join(root, "scripts/fixtures/ai-consent-negative.json"),
  package: path.join(root, "package.json"),
  source: path.join(root, "src/lib/product/contracts/ai-consent.ts"),
  sourceTest: path.join(root, "src/lib/product/contracts/ai-consent.test.ts"),
  fixtureSource: path.join(root, "src/lib/consumer/ai-consent-fixtures.ts"),
  fixtureTest: path.join(root, "src/lib/consumer/ai-consent-fixtures.test.ts"),
  disclosures: path.join(root, "src/lib/consumer/ai-consent-disclosures.ts"),
  routeFixture: path.join(root, "src/lib/consumer/route-fixture.ts"),
  queries: path.join(root, "src/lib/consumer/queries.ts"),
  proxy: path.join(root, "src/proxy.ts"),
  api: path.join(root, "src/app/api/consumer/ai-consent/route.ts"),
  apiTest: path.join(root, "src/app/api/consumer/ai-consent/route.test.ts"),
  component: path.join(root, "src/components/consumer/ai-consent-settings.tsx"),
  genericConsent: path.join(root, "src/components/consumer/consent-settings.tsx"),
  account: path.join(root, "src/app/[locale]/(consumer)/account/page.tsx"),
  ko: path.join(root, "messages/ko.json"),
  en: path.join(root, "messages/en.json"),
  e2e: path.join(root, "tests/e2e/ai-consent.spec.ts"),
};

const failures = [];
const requireCondition = (condition, message) => {
  if (!condition) failures.push(message);
};

for (const [name, filePath] of Object.entries(paths)) {
  requireCondition(fs.existsSync(filePath), `missing AI consent ${name}: ${path.relative(root, filePath)}`);
  if (fs.existsSync(filePath)) requireCondition(fs.statSync(filePath).size > 0, `empty AI consent ${name}: ${path.relative(root, filePath)}`);
}

if (failures.length === 0) {
  const contract = JSON.parse(fs.readFileSync(paths.contract, "utf8"));
  const fixture = JSON.parse(fs.readFileSync(paths.fixture, "utf8"));
  const packageJson = JSON.parse(fs.readFileSync(paths.package, "utf8"));
  const en = JSON.parse(fs.readFileSync(paths.en, "utf8"));
  const ko = JSON.parse(fs.readFileSync(paths.ko, "utf8"));
  const source = Object.fromEntries(Object.entries(paths).map(([name, filePath]) => [name, fs.readFileSync(filePath, "utf8")]));
  const aiConsentCopy = JSON.stringify({ en: en.consumer?.aiConsent, ko: ko.consumer?.aiConsent });

  requireCondition(contract.issue === 438 && contract.task === 28, "AI consent contract must bind issue 438/task 28");
  requireCondition(contract.parentIssue === 412, "AI consent contract must bind parent issue 412");
  requireCondition(contract.plan === ".omo/plans/bookgolas-web-app-parity.md", "AI consent contract must reference the parity plan");
  requireCondition(contract.targetVersion === "1.1.0" && contract.targetBranch === "version/web/1.1.0", "AI consent contract must target Web 1.1.0");
  requireCondition(contract.policyVersion === 2, "AI consent policy version must be 2");
  requireCondition(contract.locales?.join(",") === "ko,en", "AI consent contract must cover ko and en");
  requireCondition(contract.providers?.length === 2, "AI consent contract must cover both providers");
  for (const provider of ["google_cloud_vision", "open_ai"]) {
    const row = contract.providers?.find((candidate) => candidate.id === provider);
    requireCondition(Boolean(row?.nativeService && row?.webLabelKey && row?.recipient?.ko && row?.recipient?.en && row?.data), `provider row is incomplete: ${provider}`);
  }
  for (const state of ["allowed", "not_allowed", "unknown", "unavailable"]) requireCondition(contract.consentStates?.includes(state), `consent state missing: ${state}`);
  for (const state of ["loading", "empty", "error", "unauthorized", "consent", "quota", "offline"]) requireCondition(contract.consumerRouteStates?.includes(state), `consumer route state missing: ${state}`);
  for (const state of ["idle", "loading", "success", "unknown", "unauthorized", "consent_required", "insufficient_data", "input_too_large", "rate_limit_exceeded", "quota_exceeded", "concurrency_exceeded", "budget_exceeded", "hard_cap_exceeded", "provider_timeout", "provider_error", "configuration_error", "offline"]) requireCondition(contract.operationalStates?.includes(state), `operational state missing: ${state}`);
  for (const code of ["unauthorized", "consent_required", "input_too_large", "rate_limit_exceeded", "quota_exceeded", "concurrency_exceeded", "budget_exceeded", "hard_cap_exceeded", "provider_timeout", "provider_error", "configuration_error", "offline"]) requireCondition(contract.errorMatrix?.some((entry) => entry.code === code), `error mapping missing: ${code}`);
  for (const invariant of ["policy version", "receipt", "Unknown, unavailable", "Withdrawal", "Operational quota", "no upgrade"]) requireCondition(contract.invariants?.some((entry) => entry.toLowerCase().includes(invariant.toLowerCase())), `invariant missing: ${invariant}`);
  for (const reference of ["third_party_ai_consent_service.dart", "reading_insights_service.dart", "google_vision_ocr_service.dart", "third-party-ai-consent.ts", "ai-usage.ts", "feature_flags.dart"]) requireCondition(contract.nativeReferences?.some((entry) => entry.includes(reference)), `native reference missing: ${reference}`);

  requireCondition(fixture.issue === 438 && fixture.task === 28 && fixture.plan === contract.plan, "AI consent negative fixture metadata is incomplete");
  requireCondition(fixture.fixtures?.length >= 15, "AI consent negative fixtures must cover the full error/state matrix");
  requireCondition(new Set(fixture.fixtures?.map((item) => item.routeFixture)).size === fixture.fixtures?.length, "AI consent fixture names must be unique");
  requireCondition(packageJson.scripts?.["test:ai-consent-states"] === "node scripts/test-ai-consent-states.mjs && vitest run src/lib/product/contracts/ai-consent.test.ts src/lib/consumer/ai-consent-fixtures.test.ts src/app/api/consumer/ai-consent/route.test.ts", "package must expose the exact AI consent acceptance command");
  requireCondition(packageJson.scripts?.["test:ai-consent-states:negative"] === "node scripts/test-ai-consent-states.mjs --fixture unauthorized && node scripts/test-ai-consent-states.mjs --fixture consent && node scripts/test-ai-consent-states.mjs --fixture input-too-large && node scripts/test-ai-consent-states.mjs --fixture daily-rate-limit && node scripts/test-ai-consent-states.mjs --fixture quota && node scripts/test-ai-consent-states.mjs --fixture concurrency && node scripts/test-ai-consent-states.mjs --fixture budget && node scripts/test-ai-consent-states.mjs --fixture hard-cap && node scripts/test-ai-consent-states.mjs --fixture timeout && node scripts/test-ai-consent-states.mjs --fixture provider && node scripts/test-ai-consent-states.mjs --fixture configuration && node scripts/test-ai-consent-states.mjs --fixture unknown", "package must expose the exact AI consent negative command");

  requireCondition(source.source.includes("AI_CONSENT_POLICY_VERSION = 2") && source.source.includes('"google_cloud_vision"') && source.source.includes('"open_ai"'), "contract must pin both provider values and policy version");
  requireCondition(source.source.includes("AiConsentMutationRequestSchema") && source.source.includes(".strict()") && !source.source.includes("user_id"), "consent mutation schema must be strict and omit caller ownership");
  requireCondition(source.source.includes("canSendToAiProvider") && source.source.includes('state === "allowed"'), "consent contract must expose an allow-only send gate");
  requireCondition(source.disclosures.includes("Google Cloud Vision") && source.disclosures.includes("OpenAI") && source.disclosures.includes("optionalNotice"), "provider disclosures must be canonical and localized");
  requireCondition(source.fixtureSource.includes("receiptId") && source.fixtureSource.includes("consentStatusUnknownError") && source.fixtureSource.includes("ai-consent-unknown"), "fixtures must cover receipts and unknown fail-closed state");
  requireCondition(source.routeFixture.includes('"ai-consent-happy"') && source.proxy.includes('startsWith("ai-consent-")') && source.queries.includes('startsWith("ai-consent-")'), "AI consent fixtures must cross the authenticated loopback boundary");
  requireCondition(source.api.includes("auth.getUser") && source.api.includes('.eq("user_id", userId)') && source.api.includes("record_third_party_ai_consent") && source.api.includes("revalidatePath"), "API must derive ownership, call canonical RPC and revalidate account");
  requireCondition(source.api.includes("MAX_BODY_BYTES") && source.api.includes("AiConsentMutationRequestSchema") && !source.api.includes("p_user_id"), "API must validate body size/schema and reject caller ownership");
  requireCondition(source.component.includes("data-ai-consent-state") && source.component.includes("data-ai-can-send") && source.component.includes("ai-consent-receipt-") && source.component.includes("failClosed"), "UI must expose state, receipt and fail-closed evidence");
  requireCondition(source.component.includes("mapAiOperationalError") && source.component.includes("unknown") && source.component.includes("unavailable"), "UI must map operational and unavailable states");
  requireCondition(source.genericConsent.includes('consentKinds = ["notifications", "camera", "share", "ocr"]'), "generic consent UI must leave provider-specific AI controls to the new surface");
  requireCondition(source.account.includes("AiConsentSettings") && source.account.includes("aiConsent.title") && source.account.includes("ConsentSettings"), "account page must render provider AI consent and remaining generic consent");
  requireCondition(source.en.includes('"aiConsent"') && source.ko.includes('"aiConsent"') && aiConsentCopy.includes("google_cloud_vision") && aiConsentCopy.includes("open_ai"), "AI consent copy must exist in Korean and English");
  requireCondition(!/(upgrade|purchase|subscribe)/i.test(aiConsentCopy), "AI consent consumer copy must not contain billing CTA text");
  requireCondition(source.sourceTest.includes("stale") && source.sourceTest.includes("canSendToAiProvider") && source.fixtureTest.includes("withdraw") && source.apiTest.includes("401") && source.apiTest.includes("413") && source.apiTest.includes("429"), "unit/route tests must cover fail-closed and HTTP error boundaries");
  requireCondition(source.e2e.includes("grant") && source.e2e.includes("withdraw") && source.e2e.includes("unknown") && source.e2e.includes("quota") && source.e2e.includes("budget") && source.e2e.includes("provider"), "browser suite must name grant/withdraw/state and operational failure scenarios");
  requireCondition(source.e2e.includes("task-28-bookgolas-web-app-parity.png"), "browser suite must capture issue evidence");

  const fixtureNames = fixture.fixtures?.map((item) => item.name) ?? [];
  if (fixtureMode) {
    const selected = fixture.fixtures?.find((item) => item.name === fixtureMode);
    requireCondition(Boolean(selected), `unknown AI consent negative fixture: ${fixtureMode}`);
    if (selected) {
      requireCondition(source.fixtureSource.includes(selected.routeFixture), `fixture source must include ${selected.routeFixture}`);
      requireCondition(source.e2e.includes(selected.routeFixture), `browser suite must exercise ${selected.routeFixture}`);
      if (selected.expected.code) requireCondition(source.fixtureSource.includes(`"${selected.expected.code}"`) || source.fixtureTest.includes(`"${selected.expected.code}"`) || source.apiTest.includes(`"${selected.expected.code}"`), `${fixtureMode} must preserve ${selected.expected.code}`);
      if (selected.expected.status === 429) requireCondition(selected.expected.uiState !== "consent_required", `${fixtureMode} must remain an operational state`);
      if (fixtureMode === "unknown") requireCondition(selected.expected.canSend === false && source.component.includes('state: "unknown"'), "unknown must remain blocked");
    }
    requireCondition(fixtureNames.includes(fixtureMode), `fixture metadata must include ${fixtureMode}`);
  }
}

if (failures.length > 0) {
  console.error(`AI consent contract failed with ${failures.length} error(s)`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`AI consent contract passed${fixtureMode ? ` (${fixtureMode})` : ""}`);
