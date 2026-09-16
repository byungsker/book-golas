import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const fixtureMode = process.argv[2] === "--fixture" ? process.argv[3] : null;
const paths = {
  package: path.join(root, "package.json"),
  contract: path.join(root, "docs/offline-sync-contract.json"),
  fixture: path.join(root, "scripts/fixtures/offline-sync-negative.json"),
  matrix: path.join(root, "docs/consumer-parity-matrix.md"),
  ledger: path.join(root, "docs/consumer-parity-ledger.json"),
  network: path.join(root, "src/components/consumer/network-status.tsx"),
  shell: path.join(root, "src/components/consumer/consumer-shell.tsx"),
  boundary: path.join(root, "src/lib/consumer/offline-boundary.ts"),
  boundaryTest: path.join(root, "src/lib/consumer/offline-boundary.test.ts"),
  e2e: path.join(root, "tests/e2e/offline-sync.spec.ts"),
  en: path.join(root, "messages/en.json"),
  ko: path.join(root, "messages/ko.json"),
  home: path.join(root, "src/app/[locale]/(consumer)/home/page.tsx"),
  reading: path.join(root, "src/app/[locale]/(consumer)/reading/[bookId]/page.tsx"),
  bookDetail: path.join(root, "src/app/[locale]/(consumer)/books/[bookId]/page.tsx"),
  library: path.join(root, "src/components/consumer/library-client.tsx"),
  evidence: path.join(root, "../.omo/evidence/bookgolas-web-app-parity/task-35-bookgolas-web-app-parity.json"),
};

const failures = [];
const requireCondition = (condition, message) => {
  if (!condition) failures.push(message);
};
const source = {};

for (const [name, filePath] of Object.entries(paths)) {
  requireCondition(fs.existsSync(filePath), `missing offline sync ${name}: ${path.relative(root, filePath)}`);
  if (fs.existsSync(filePath)) source[name] = fs.readFileSync(filePath, "utf8");
}

if (failures.length === 0) {
  const packageJson = JSON.parse(source.package);
  const contract = JSON.parse(source.contract);
  const fixture = JSON.parse(source.fixture);
  const ledger = JSON.parse(source.ledger);
  const messagesEn = JSON.parse(source.en);
  const messagesKo = JSON.parse(source.ko);
  const requiredStates = ["loading", "empty", "error", "unauthorized", "consent", "quota", "offline", "reconnect", "conflict", "duplicate", "unsupported-mutation"];
  const requiredMutations = ["progress", "book-metadata", "book-status", "notes-highlights", "review", "timer", "images-ocr", "ai", "web-push", "account"];
  const requiredNativeOnly = ["iOS widget", "Siri/App Shortcuts", "native push", "camera", "share sheet", "subscription"];

  requireCondition(contract.issue === 447 && contract.task === 35 && contract.parentIssue === 412, "offline sync contract must bind issue 447/task 35/parent 412");
  requireCondition(contract.plan === ".omo/plans/bookgolas-web-app-parity.md", "offline sync contract must reference the parity plan");
  requireCondition(contract.targetVersion === "1.1.0" && contract.targetBranch === "version/web/1.1.0", "offline sync contract must target Web 1.1.0");
  requireCondition(contract.featureBranch === "codex/feature/web/1.1.0/BOK-447-offline-boundary", "offline sync feature branch is incorrect");
  requireCondition(contract.locales?.join(",") === "ko,en", "offline sync contract must cover ko and en");
  requireCondition(contract.policy === "online-core", "offline sync policy must be online-core");
  requireCondition(contract.queue?.enabled === false && contract.queue?.name === null && contract.queue?.replay === false, "offline queue must be explicitly disabled");
  requireCondition(contract.noSilentWrites === true, "offline sync must forbid silent writes");
  for (const state of requiredStates) requireCondition(contract.states?.includes(state), `offline sync state missing: ${state}`);
  requireCondition(contract.stateRows?.length === requiredStates.length, "offline sync state rows must cover every required state");
  for (const row of contract.stateRows ?? []) {
    requireCondition(typeof row.state === "string" && typeof row.native === "string" && typeof row.web === "string" && typeof row.action === "string" && typeof row.retryable === "boolean" && row.queue === false, `offline state row is incomplete: ${row.state}`);
  }
  requireCondition(Array.isArray(contract.parityRows) && contract.parityRows.length >= 8, "offline parity rows are incomplete");
  const parityIds = new Set();
  for (const row of contract.parityRows ?? []) {
    requireCondition(typeof row.id === "string" && !parityIds.has(row.id), `offline parity row id is missing or duplicated: ${row.id}`);
    parityIds.add(row.id);
    requireCondition(typeof row.nativeFlutter === "string" && Array.isArray(row.nativeActions) && row.nativeActions.length > 0 && Array.isArray(row.nativeStates) && row.nativeStates.length > 0 && typeof row.webRoute === "string" && typeof row.webComponent === "string" && typeof row.browserDisposition === "string" && typeof row.offlineDisposition === "string", `offline parity row is incomplete: ${row.id}`);
    requireCondition(row.owner === "#447", `offline parity row must be owned by #447: ${row.id}`);
  }
  for (const mutation of requiredMutations) {
    const row = contract.mutations?.find((item) => item.id === mutation);
    requireCondition(Boolean(row), `offline mutation is missing: ${mutation}`);
    if (row) requireCondition(row.queued === false && typeof row.browserDisposition === "string" && typeof row.preservation === "string", `offline mutation is not explicit: ${mutation}`);
  }
  for (const feature of requiredNativeOnly) requireCondition(contract.nativeOnly?.some((item) => item.feature === feature), `native-only capability missing: ${feature}`);
  requireCondition(contract.observability?.event === "bookgolas:online-reconnected", "reconnect event is not canonical");
  requireCondition(contract.observability?.queueAttribute === "data-queue-enabled=false", "queue-disabled UI marker is missing");
  requireCondition(contract.evidence?.stages?.join(",") === "RED,GREEN,SURFACE,CLEANUP", "offline sync evidence stages are incomplete");

  requireCondition(fixture.issue === 447 && fixture.task === 35 && fixture.parentIssue === 412, "offline negative fixture metadata is incorrect");
  requireCondition(fixture.plan === contract.plan && fixture.targetVersion === contract.targetVersion && fixture.targetBranch === contract.targetBranch && fixture.featureBranch === contract.featureBranch, "offline negative fixture target is inconsistent");
  const fixtureNames = new Set(fixture.fixtures?.map((item) => item.name));
  for (const name of ["duplicate", "unsupported-mutation", "queue-enabled", "missing-reconnect"]) requireCondition(fixtureNames.has(name), `offline negative fixture missing: ${name}`);
  requireCondition(fixtureNames.size === fixture.fixtures?.length, "offline negative fixture names must be unique");
  for (const item of fixture.fixtures ?? []) requireCondition(item.expectedExit === 1 && Array.isArray(item.assertions) && item.assertions.length > 0, `offline negative fixture is incomplete: ${item.name}`);
  for (const marker of fixture.forbiddenMarkers ?? []) requireCondition(!source.network.toLowerCase().includes(marker.toLowerCase()) && !source.boundary.toLowerCase().includes(marker.toLowerCase()), `offline source contains forbidden queue technology: ${marker}`);

  requireCondition(typeof packageJson.scripts?.["test:offline-sync"] === "string" && packageJson.scripts["test:offline-sync"].includes("test-offline-sync.mjs"), "package must expose npm run test:offline-sync");
  requireCondition(typeof packageJson.scripts?.["test:offline-sync:negative"] === "string" && packageJson.scripts["test:offline-sync:negative"].includes("--fixture duplicate") && packageJson.scripts["test:offline-sync:negative"].includes("--fixture unsupported-mutation"), "package must expose offline negative fixtures");
  requireCondition(packageJson.scripts.test.includes("test:offline-sync") && packageJson.scripts.test.includes("test:offline-sync:negative"), "full Web test command must include offline sync acceptance");

  for (const marker of ["data-testid=\"network-status\"", "data-network-state", "data-online-core=\"true\"", "data-queue-enabled=\"false\"", "data-mutation-mode", "CustomEvent", "reconnected", "onDismiss"]) requireCondition(source.network.includes(marker), `network status is missing ${marker}`);
  requireCondition((source.network + source.boundary).includes("bookgolas:online-reconnected") && source.network.includes("navigator.onLine") && source.network.includes("retryable"), "network status must expose reconnect and retry behavior");
  requireCondition(source.shell.includes("NetworkStatus") && !source.home.includes("NetworkStatus") && !source.reading.includes("NetworkStatus") && !source.bookDetail.includes("NetworkStatus") && !source.library.includes("NetworkStatus"), "network status must be mounted once in the shared consumer shell");
  for (const marker of ["queueEnabled: false", "noSilentWrites: true", "localDraftMutations", "onlineOnlyMutations", "getOfflineMutationDecision", "preservation: mutation === \"review\" ? \"local-draft\" : \"none\""]) requireCondition(source.boundary.includes(marker), `offline boundary logic is missing ${marker}`);
  requireCondition(source.boundaryTest.includes("duplicate") && source.boundaryTest.includes("unsupported") && source.boundaryTest.includes("queued: false"), "offline boundary tests must cover negative mutations");

  requireCondition(messagesEn.consumer?.network?.offline.includes("not queued") && messagesEn.consumer.network.reconnected.includes("Retry"), "English network boundary copy is incomplete");
  requireCondition(messagesKo.consumer?.network?.offline.includes("대기열") && messagesKo.consumer.network.reconnected.includes("다시 시도"), "Korean network boundary copy is incomplete");
  requireCondition(source.matrix.includes("#447") && source.matrix.includes("online-only boundary") && source.matrix.includes("data-queue-enabled=\"false\"") && source.matrix.includes("loading, empty, error, unauthorized, consent, quota, offline"), "parity matrix must match the offline evidence label");
  const ledgerCapability = ledger.native_only_capabilities?.find((item) => item.id === "offline-boundary");
  requireCondition(ledgerCapability?.web?.owner === "#447" && ledgerCapability?.web?.status === "partial" && ledgerCapability?.web?.target?.includes("Online-core boundary with explicit offline state"), "parity ledger offline label is inconsistent");

  for (const marker of ["context.setOffline(true)", "context.setOffline(false)", "network-status", "data-queue-enabled", "offline", "reconnect", "conflict", "duplicate", "unsupported-mutation", "task-35-bookgolas-web-app-parity.png"]) requireCondition(source.e2e.includes(marker), `offline browser suite is missing ${marker}`);
  requireCondition(source.e2e.includes("no hidden queue") && source.e2e.includes("no mutation write"), "offline browser suite must assert no silent writes");
  requireCondition(source.evidence.includes("RED") && source.evidence.includes("GREEN") && source.evidence.includes("SURFACE") && source.evidence.includes("CLEANUP") && source.evidence.includes("Plan: .omo/plans/bookgolas-web-app-parity.md"), "offline sync evidence must contain four stages and plan footer");

  if (fixtureMode) {
    const selected = fixture.fixtures?.find((item) => item.name === fixtureMode);
    requireCondition(Boolean(selected), `unknown offline negative fixture: ${fixtureMode}`);
    if (selected) {
      const contractText = JSON.stringify(contract);
      const assertionIsRepresented = (assertion) => {
        if (!assertion.includes("=")) return contractText.includes(assertion);
        const [key, value] = assertion.split("=", 2);
        const normalizedValue = value === "true" ? "true" : value === "false" ? "false" : JSON.stringify(value);
        return contractText.includes(`"${key}":${normalizedValue}`) || contractText.includes(`"${key}": ${normalizedValue}`) || contractText.includes(assertion);
      };
      requireCondition(selected.expectedFailure && selected.assertions.every(assertionIsRepresented), `${fixtureMode} is not represented in the contract`);
    }
  }
}

if (failures.length > 0) {
  console.error(`Offline sync contract failed with ${failures.length} error(s)`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

if (!fixtureMode) {
  const vitest = path.join(root, "node_modules/.bin/vitest");
  const result = spawnSync(vitest, ["run", "src/lib/consumer/offline-boundary.test.ts"], { cwd: root, stdio: "inherit" });
  if (result.error) {
    console.error(`offline sync tests could not start: ${result.error.message}`);
    process.exit(1);
  }
  if (result.status !== 0) process.exit(result.status ?? 1);
}

console.log(`Offline sync contract passed${fixtureMode ? ` (${fixtureMode})` : ""}`);
