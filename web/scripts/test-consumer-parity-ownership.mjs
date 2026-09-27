import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "../..");
const ownershipPath = path.resolve(scriptDirectory, "../docs/consumer-parity-ownership.json");
const ledgerPath = path.resolve(scriptDirectory, "../docs/consumer-parity-ledger.json");
const inventoryPath = path.resolve(scriptDirectory, "../docs/native-consumer-surface-inventory.json");
const fixtureIndex = process.argv.indexOf("--fixture");
const fixture = fixtureIndex === -1 ? null : process.argv[fixtureIndex + 1];
const supportedFixtures = new Set([
  "malformed-json",
  "missing-overlay-action",
  "duplicate-native-action",
  "duplicate-surface",
  "missing-capability",
  "mismatched-totals",
  "missing-owner",
  "missing-source",
]);

function readJson(file, label, transform = (source) => source) {
  try {
    return JSON.parse(transform(fs.readFileSync(file, "utf8")));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`${label}: malformed JSON: ${message}`);
  }
}

if (fixture !== null && !supportedFixtures.has(fixture)) {
  console.error(`unknown fixture: ${fixture ?? "(missing value)"}`);
  process.exit(2);
}

const ledger = readJson(ledgerPath, "parity ledger");
const inventory = readJson(inventoryPath, "native inventory");
let ownership;
try {
  ownership = readJson(
    ownershipPath,
    "consumer parity ownership",
    fixture === "malformed-json" ? () => '{"schema_version":' : undefined,
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

if (fixture === "missing-overlay-action") {
  ownership.overlays.find((row) => row.id === "search-mode-menu").native_action_ids =
    ownership.overlays.find((row) => row.id === "search-mode-menu").native_action_ids.filter(
      (id) => id !== "choose-ai-record-search",
    );
}
if (fixture === "duplicate-native-action") {
  const legalTerms = ownership.routes.find((row) => row.id === "legal-terms");
  const announcements = ownership.routes.find((row) => row.id === "announcements");
  announcements.native_action_keys[1] = legalTerms.native_action_keys[1];
}
if (fixture === "duplicate-surface") ownership.routes.push(structuredClone(ownership.routes[0]));
if (fixture === "missing-capability") ownership.capabilities.pop();
if (fixture === "mismatched-totals") ownership.expected_counts.total = 84;
if (fixture === "missing-owner") ownership.routes[0].responsible.owner = "";
if (fixture === "missing-source") ownership.deep_links[0].native_sources = [];

const failures = [];
const fail = (message) => failures.push(message);
const categories = [
  ["routes", "route", ledger.routes, inventory.routes],
  ["overlays", "overlay", ledger.overlays, inventory.overlays],
  ["capabilities", "capability", ledger.native_only_capabilities, inventory.native_only_capabilities],
];
const expectedCounts = { routes: 20, overlays: 53, deep_links: 4, capabilities: 8, total: 85 };
const forbiddenPlaceholder = /^(?:tbd|todo|unknown|placeholder|unassigned)$/i;
const terminalOverlayStatuses = new Set(["implemented-evidence-backed", "disabled"]);
const requiredStates = ["loading", "empty", "error", "unauthorized", "consent", "quota", "offline"];
const overlayEvidenceOwners = new Map();
const isText = (value) => typeof value === "string" && value.trim().length > 0;
const sameValues = (left, right) =>
  Array.isArray(left) &&
  Array.isArray(right) &&
  left.length === right.length &&
  left.every((value, index) => value === right[index]);

if (ownership.schema_version !== 1) fail("schema_version: expected 1");
for (const [key, count] of Object.entries(expectedCounts)) {
  if (ownership.expected_counts?.[key] !== count) {
    fail(`expected_counts.${key}: expected ${count}, received ${ownership.expected_counts?.[key]}`);
  }
}

const rows = [];
for (const [collectionName, category, ledgerRows, inventoryActions] of categories) {
  const collection = ownership[collectionName];
  if (!Array.isArray(collection)) {
    fail(`${collectionName}: expected an array`);
    continue;
  }
  if (collection.length !== expectedCounts[collectionName]) {
    fail(`${collectionName}: expected ${expectedCounts[collectionName]} records, received ${collection.length}`);
  }
  const expectedIds = ledgerRows.map((row) => row.id);
  const actualIds = collection.map((row) => row.id);
  for (const id of expectedIds.filter((id) => !actualIds.includes(id))) fail(`${collectionName}: missing surface ${id}`);
  for (const id of actualIds.filter((id) => !expectedIds.includes(id))) fail(`${collectionName}: unexpected surface ${id}`);
  for (const row of collection) {
    const ledgerRow = ledgerRows.find((candidate) => candidate.id === row.id);
    if (!Object.hasOwn(inventoryActions ?? {}, row.id)) {
      fail(`${category}/${row.id}: missing native inventory action set`);
    }
    validateRow(row, category, ledgerRow, inventoryActions?.[row.id] ?? []);
    rows.push(row);
  }
}

const deepLinks = ownership.deep_links;
if (!Array.isArray(deepLinks)) {
  fail("deep_links: expected an array");
} else {
  if (deepLinks.length !== expectedCounts.deep_links) {
    fail(`deep_links: expected 4 records, received ${deepLinks.length}`);
  }
  for (const expected of ledger.deep_links) {
    const row = deepLinks.find((candidate) => candidate.id === expected.id);
    const inventoryLink = inventory.deep_links.find((candidate) => candidate.id === expected.id);
    if (!row) {
      fail(`deep_links: missing surface ${expected.id}`);
      continue;
    }
    if (!inventoryLink || inventoryLink.source !== expected.source) {
      fail(`deep-link/${expected.id}: missing or mismatched native inventory link`);
    }
    validateRow(row, "deep-link", expected, [expected.id]);
    if (row.native_uri !== expected.source) fail(`deep-link/${row.id}: native_uri mismatch`);
    if (row.canonical_web_url !== expected.canonical_web_url) fail(`deep-link/${row.id}: canonical_web_url mismatch`);
    rows.push(row);
  }
}

const ids = rows.map((row) => row.id);
for (const id of new Set(ids)) {
  const count = ids.filter((candidate) => candidate === id).length;
  if (count !== 1) fail(`surface id ${id}: duplicate surface appears ${count} times`);
}
if (rows.length !== expectedCounts.total) fail(`total records: expected 85, received ${rows.length}`);
const expectedActionKeys = rows.flatMap((row) =>
  row.native_action_ids.map((id) => `${row.category}/${row.id}/${id}`),
);
const actionKeys = rows.flatMap((row) => row.native_action_keys ?? []);
for (const key of expectedActionKeys.filter((key) => !actionKeys.includes(key))) {
  fail(`unaccounted native action key ${key}`);
}
for (const key of new Set(actionKeys)) {
  const count = actionKeys.filter((candidate) => candidate === key).length;
  if (count !== 1) fail(`duplicate native action key ${key} appears ${count} times`);
}

for (const [dependency, description] of Object.entries(ownership.dependency_catalog ?? {})) {
  if (!isText(dependency) || !isText(description)) fail("dependency_catalog: keys and descriptions must be non-empty");
}
for (const source of Object.values(ownership.source_contract ?? {})) {
  if (!isText(source) || !fs.existsSync(path.resolve(repositoryRoot, source))) fail(`source_contract: missing source ${source}`);
}

if (failures.length > 0) {
  for (const failure of failures) console.error(`consumer parity ownership: ${failure}`);
  process.exit(1);
}

const rawActionIds = rows.flatMap((row) => row.native_action_ids);
console.log(
  `consumer parity ownership passed: 85 records (20 routes, 53/53 terminal overlays, 4 deep links, 8 capabilities), ${actionKeys.length} scoped native actions (${new Set(rawActionIds).size} raw IDs)`,
);

function validateRow(row, category, ledgerRow, expectedActions) {
  const prefix = `${category}/${row?.id ?? "(missing id)"}`;
  if (!isText(row?.id)) fail(`${prefix}: missing stable id`);
  if (row?.category !== category) fail(`${prefix}: category must be ${category}`);
  if (!ledgerRow) {
    fail(`${prefix}: no matching ledger record`);
    return;
  }
  const actions = expectedActions ?? ledgerRow.actions?.map((action) => action.id);
  if (!sameValues(row.native_action_ids, actions)) {
    const missing = actions.filter((id) => !row.native_action_ids?.includes(id));
    const extra = (row.native_action_ids ?? []).filter((id) => !actions.includes(id));
    fail(`${prefix}: native action mismatch; missing [${missing.join(", ")}], extra [${extra.join(", ")}]`);
  }
  const actionKeys = actions.map((id) => `${category}/${row.id}/${id}`);
  if (!sameValues(row.native_action_keys, actionKeys)) {
    fail(`${prefix}: native action keys must equal [${actionKeys.join(", ")}]`);
  }
  if (!sameValues(row.native_sources, ledgerRow.native_source)) fail(`${prefix}: missing or mismatched native source reference`);
  const implementation = row.web_implementation;
  if (!isText(implementation?.state)) fail(`${prefix}: missing implementation state`);
  if (!Array.isArray(implementation?.paths)) fail(`${prefix}: implementation paths must be an array`);
  for (const implementationPath of implementation?.paths ?? []) {
    if (!isText(implementationPath) || !fs.existsSync(path.resolve(repositoryRoot, implementationPath))) {
      fail(`${prefix}: implementation path does not exist: ${implementationPath}`);
    }
  }
  if (
    (implementation?.paths?.length ?? 0) === 0 &&
    (implementation?.missing_states_or_actions?.length ?? 0) === 0 &&
    implementation?.state !== "boundary"
  ) fail(`${prefix}: missing implementation path and explicit missing state/action`);
  if (!isText(row.responsible?.owner) || !/^#\d+$/.test(row.responsible.owner)) fail(`${prefix}: missing owner`);
  if (!isText(row.responsible?.component_api_function)) fail(`${prefix}: missing responsible component/API/function`);
  if (forbiddenPlaceholder.test(row.responsible?.component_api_function ?? "")) fail(`${prefix}: placeholder ownership is forbidden`);
  for (const field of ["fixture_or_test", "test_command", "evidence"]) {
    if (!isText(row.verification?.[field])) fail(`${prefix}: missing verification.${field}`);
  }
  if (
    isText(row.verification?.fixture_or_test) &&
    !fs.existsSync(path.resolve(repositoryRoot, row.verification.fixture_or_test))
  ) fail(`${prefix}: fixture/test path does not exist: ${row.verification.fixture_or_test}`);
  if (!Array.isArray(row.dependencies) || row.dependencies.length === 0) fail(`${prefix}: missing dependencies`);
  for (const dependency of row.dependencies ?? []) {
    if (!Object.hasOwn(ownership.dependency_catalog ?? {}, dependency)) fail(`${prefix}: unresolved dependency ${dependency}`);
  }
  if (!isText(row.terminal_status?.current) || !isText(row.terminal_status?.rule)) fail(`${prefix}: missing terminal status rule`);
  if (category === "overlay") validateTerminalOverlay(row, prefix);
}

function validateTerminalOverlay(row, prefix) {
  if (!terminalOverlayStatuses.has(row.terminal_status?.current)) fail(`${prefix}: overlay status must be terminal`);
  if (row.web_implementation?.state !== "boundary" && row.web_implementation?.state !== "implemented-evidence-backed") {
    fail(`${prefix}: overlay implementation must be evidence-backed or a boundary`);
  }
  if ((row.web_implementation?.missing_states_or_actions?.length ?? 0) > 0) fail(`${prefix}: terminal overlay retains missing state/action entries`);
  if (!isText(row.state_profile)) fail(`${prefix}: missing state profile`);
  if (!sameValues(row.required_states, requiredStates)) fail(`${prefix}: required states must equal [${requiredStates.join(", ")}]`);
  const statuses = row.action_statuses;
  if (!statuses || typeof statuses !== "object" || Array.isArray(statuses)) {
    fail(`${prefix}: missing action statuses`);
  } else {
    if (!sameValues(Object.keys(statuses), row.native_action_ids)) fail(`${prefix}: action statuses must cover every native action exactly once`);
    for (const actionId of row.native_action_ids) {
      const expected = row.terminal_status.current === "disabled" ? "disabled" : "implemented-evidence-backed";
      if (statuses[actionId] !== expected) fail(`${prefix}: action ${actionId} must be ${expected}`);
    }
  }
  const evidence = row.verification?.evidence;
  if (!isText(evidence) || !evidence.includes(`/task-19-artifacts/overlays/${row.id}.json`)) {
    fail(`${prefix}: terminal overlay must use direct Task 19 evidence`);
    return;
  }
  const existingOwner = overlayEvidenceOwners.get(evidence);
  if (existingOwner && existingOwner !== row.id) fail(`${prefix}: aliased evidence with ${existingOwner}`);
  overlayEvidenceOwners.set(evidence, row.id);
  const evidencePath = path.resolve(repositoryRoot, evidence);
  if (!fs.existsSync(evidencePath) || fs.statSync(evidencePath).size === 0) fail(`${prefix}: direct evidence is missing or empty: ${evidence}`);
}
