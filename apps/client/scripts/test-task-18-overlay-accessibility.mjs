import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const ownershipPath = path.join(root, "docs/consumer-parity-ownership.json");
const consumerDirectory = path.join(root, "src/components/consumer");

function fail(message) {
  console.error(`Task 18 overlay accessibility audit failed: ${message}`);
  process.exit(1);
}

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath.replace(/^web\//, "")), "utf8");
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath.replace(/^web\//, "")));
}

const ownership = JSON.parse(fs.readFileSync(ownershipPath, "utf8"));
if (ownership.overlays?.length !== 53) fail(`expected 53 ownership rows, found ${ownership.overlays?.length ?? 0}`);
const browserEvidence = Object.fromEntries(ownership.overlays
  .filter((overlay) => ["implemented", "implemented-evidence-backed"].includes(overlay.web_implementation?.state))
  .map((overlay) => [overlay.id, overlay.verification?.fixture_or_test?.replace(/^web\//, "")]));

const consumerFiles = fs.readdirSync(consumerDirectory)
  .filter((name) => name.endsWith(".tsx"))
  .map((name) => `src/components/consumer/${name}`);

const radixFiles = [];
const customModalFiles = [];
const renderedDialogIds = new Set();

for (const relativePath of consumerFiles) {
  const source = read(relativePath);
  if (relativePath.endsWith("consumer-dialog-content.tsx")) continue;

  if (source.includes("<DialogContent")) {
    if (!source.includes('ConsumerDialogContent as DialogContent')) {
      fail(`${relativePath} renders DialogContent without the localized ConsumerDialogContent adapter`);
    }
    if (!source.includes("<DialogTitle")) fail(`${relativePath} renders a Radix dialog without DialogTitle`);
    radixFiles.push(relativePath);
    for (const match of source.matchAll(/<DialogContent[^>]*data-testid="([^"]+)"/g)) renderedDialogIds.add(match[1]);
  }

  if (source.includes('role="dialog"')) {
    if (!source.includes("useAccessibleModal")) fail(`${relativePath} renders a custom dialog without useAccessibleModal`);
    if (!source.includes('aria-modal="true"')) fail(`${relativePath} renders a custom dialog without aria-modal`);
    if (!source.includes("aria-labelledby=")) fail(`${relativePath} renders a custom dialog without an accessible name`);
    customModalFiles.push(relativePath);
    for (const match of source.matchAll(/role="dialog"[\s\S]{0,500}?data-testid="([^"]+)"/g)) renderedDialogIds.add(match[1]);
  }
}

const rows = ownership.overlays.map((overlay) => {
  const state = overlay.web_implementation?.state ?? "unknown";
  const implemented = state === "implemented" || state === "implemented-evidence-backed";
  const sourcePaths = (overlay.web_implementation?.paths ?? []).filter((entry) => entry.endsWith(".tsx"));
  const sourcePresence = sourcePaths.some((entry) => exists(entry) && read(entry).includes(overlay.id));

  if (!implemented) {
    return {
      id: overlay.id,
      ownershipState: state,
      classification: "excluded-nonterminal",
      sourcePresence,
      browserEvidence: null,
      claim: "not-green",
    };
  }

  const evidencePath = browserEvidence[overlay.id];
  if (!evidencePath) fail(`${overlay.id} is implemented but has no named browser evidence`);
  if (!evidencePath.startsWith("tests/e2e/") || !evidencePath.endsWith(".spec.ts")) fail(`${overlay.id} browser evidence must be a focused e2e spec`);
  if (!exists(evidencePath)) fail(`${overlay.id} browser evidence does not exist: ${evidencePath}`);
  if (!read(evidencePath).includes(overlay.id)) fail(`${overlay.id} is not named in ${evidencePath}`);

  const contractSource = sourcePaths.some((entry) => {
    if (!exists(entry)) return false;
    const source = read(entry);
    return source.includes("ConsumerDialogContent as DialogContent") ||
      (source.includes('role="dialog"') && source.includes("useAccessibleModal"));
  });
  const classification = contractSource
    ? "implemented-modal-shared-contract-browser-evidenced"
    : "implemented-nonmodal-browser-evidenced";

  return {
    id: overlay.id,
    ownershipState: state,
    classification,
    sourcePresence,
    browserEvidence: evidencePath,
    claim: "browser-evidenced",
  };
});

const summary = {
  ownershipRows: rows.length,
  implementedRows: rows.filter((row) => row.claim === "browser-evidenced").length,
  implementedModalRows: rows.filter((row) => row.classification.includes("modal-shared")).length,
  implementedNonModalRows: rows.filter((row) => row.classification.includes("nonmodal")).length,
  excludedNonterminalRows: rows.filter((row) => row.claim === "not-green").length,
  radixContractFiles: radixFiles.length,
  customModalContractFiles: customModalFiles.length,
  renderedDialogIds: [...renderedDialogIds].sort(),
};

if (summary.implementedRows !== Object.keys(browserEvidence).length) {
  fail(`implemented evidence count mismatch: ${summary.implementedRows}`);
}

const report = {
  generatedFrom: "docs/consumer-parity-ownership.json",
  policy: "Only implemented ownership rows receive browser-evidenced status; partial, planned, boundary, and disabled rows remain explicitly non-green.",
  sharedContracts: {
    radix: "ConsumerDialogContent over Radix DialogContent: accessible title, focus trap, Escape close, focus return, localized close name",
    custom: "useAccessibleModal: aria-labelledby, focus containment, Escape close, focus return",
  },
  summary,
  rows,
};

const reportIndex = process.argv.indexOf("--report");
if (reportIndex >= 0) {
  const reportPath = process.argv[reportIndex + 1];
  if (!reportPath) fail("--report requires a path");
  fs.mkdirSync(path.dirname(path.resolve(root, reportPath)), { recursive: true });
  fs.writeFileSync(path.resolve(root, reportPath), `${JSON.stringify(report, null, 2)}\n`);
}

console.log(`Task 18 overlay accessibility audit passed: ${summary.ownershipRows} ownership rows; ${summary.implementedModalRows} implemented modals browser-evidenced through shared contracts; ${summary.implementedNonModalRows} implemented non-modal surfaces browser-evidenced; ${summary.excludedNonterminalRows} nonterminal rows explicitly not green; ${summary.radixContractFiles} Radix adapter files and ${summary.customModalContractFiles} custom modal files verified.`);
