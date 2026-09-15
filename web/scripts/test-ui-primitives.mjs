import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const webRoot = path.resolve(import.meta.dirname, "..");
const fixtureName = process.argv[2] === "--fixture" ? process.argv[3] : null;
const paths = {
  design: path.join(webRoot, "../DESIGN.md"),
  package: path.join(webRoot, "package.json"),
  layout: path.join(webRoot, "src/app/layout.tsx"),
  css: path.join(webRoot, "src/app/globals.css"),
  adapter: path.join(webRoot, "src/components/consumer/blab-primitives.tsx"),
  showcase: path.join(webRoot, "src/components/consumer/ui-primitives-showcase.tsx"),
  route: path.join(webRoot, "src/app/[locale]/ui-primitives/page.tsx"),
  e2e: path.join(webRoot, "tests/e2e/ui-primitives.spec.ts"),
  ko: path.join(webRoot, "messages/ko.json"),
  en: path.join(webRoot, "messages/en.json"),
  contract: path.join(webRoot, "docs/blab-react-parity-contract.json"),
  artifact: path.join(webRoot, "vendor/byungsker-blab-design-system-0.2.0.tgz"),
};

const packageJson = JSON.parse(fs.readFileSync(paths.package, "utf8"));
const adapter = fs.readFileSync(paths.adapter, "utf8");
const showcase = fs.readFileSync(paths.showcase, "utf8");
const e2e = fs.readFileSync(paths.e2e, "utf8");
const layout = fs.readFileSync(paths.layout, "utf8");
const css = fs.readFileSync(paths.css, "utf8");
const design = fs.readFileSync(paths.design, "utf8");
const contract = JSON.parse(fs.readFileSync(paths.contract, "utf8"));
const failures = [];
const focusMarker = ".bookgolas-ui-showcase :where(a, button, [role=\"button\"]):focus-visible";
const focusFailureMessage = "consumer showcase focus ring rule is missing";

function requireCondition(condition, message) {
  if (!condition) failures.push(message);
}

function focusContractFailures(cssSource) {
  return cssSource.includes(focusMarker) ? [] : [focusFailureMessage];
}

if (fixtureName === "missing-focus") {
  const fixturePath = path.join(webRoot, "scripts/fixtures/ui-primitives-missing-focus.json");
  const fixture = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
  if (fixture.remove_marker !== focusMarker) {
    console.error("missing-focus fixture marker does not match the focus contract");
    process.exit(1);
  }
  const simulatedCss = fs.readFileSync(path.join(webRoot, fixture.source), "utf8").replace(fixture.remove_marker, "");
  const simulatedFailures = focusContractFailures(simulatedCss);
  if (simulatedCss.includes(fixture.remove_marker) || !simulatedFailures.includes(fixture.expected_message)) {
    console.error("missing-focus fixture did not exercise the focus contract failure");
    process.exit(1);
  }
  console.log(`UI primitive negative fixture passed: ${simulatedFailures[0]}`);
  process.exit(0);
}

for (const section of [
  "## 1. Atmosphere & Identity",
  "## 2. Color",
  "## 3. Typography",
  "## 4. Spacing & Layout",
  "## 5. Components",
  "## 6. Motion & Interaction",
  "## 7. Depth & Surface",
  "## 8. Accessibility Constraints & Accepted Debt",
]) {
  requireCondition(design.includes(section), `DESIGN.md is missing ${section}`);
}

requireCondition(packageJson.scripts["test:ui-primitives"] === "node scripts/test-ui-primitives.mjs", "test:ui-primitives script is missing");
requireCondition(packageJson.scripts["test:ui-primitives:negative"] === "node scripts/test-ui-primitives.mjs --fixture missing-focus", "ui primitive negative script is missing");
requireCondition(packageJson.scripts["test:ui-primitives:browser"] === "playwright test tests/e2e/ui-primitives.spec.ts --project=chromium", "ui primitive browser script is missing");
requireCondition(packageJson.scripts.doctor === "npx react-doctor@latest", "react-doctor script is missing");
requireCondition(layout.includes("https://unpkg.com/react-scan/dist/auto.global.js"), "react-scan runtime is missing");
requireCondition(layout.includes("//unpkg.com/react-grab/dist/index.global.js"), "react-grab runtime is missing");
requireCondition((layout.match(/process\.env\.NODE_ENV === \"development\"/g) ?? []).length >= 2, "React dev tools are not development-gated");

const adapterImports = [...adapter.matchAll(/\bfrom\s+["']([^"']+)["']/g)].map(([, moduleName]) => moduleName);
requireCondition(adapterImports.length > 0, "consumer adapter must import the BLDS package");
requireCondition(adapterImports.every((moduleName) => moduleName === "@byungsker/blab-design-system"), "consumer adapter must use only the BLDS public package root");
for (const adapterExport of [
  "ConsumerButton",
  "ConsumerCard",
  "ConsumerTextField",
  "ConsumerLoadingState",
  "ConsumerEmptyState",
  "ConsumerErrorState",
  "ConsumerRetryButton",
  "ConsumerSnackbar",
  "ConsumerPressable",
  "ConsumerTabBar",
  "ConsumerBottomBar",
  "ConsumerSegmentedControl",
]) {
  requireCondition(adapter.includes(`function ${adapterExport}`), `consumer adapter is missing ${adapterExport}`);
}

for (const state of [
  "loading-state",
  "empty-state",
  "error-state",
  "unauthorized-state",
  "consent-state",
  "quota-state",
  "offline-state",
]) {
  requireCondition(showcase.includes(`data-testid=\"${state}\"`), `showcase is missing ${state}`);
}
for (const marker of [
  "ConsumerButton",
  "ConsumerCard",
  "ConsumerTextField",
  "ConsumerLoadingState",
  "ConsumerEmptyState",
  "ConsumerErrorState",
  "ConsumerTabBar",
  "ConsumerSegmentedControl",
  "ConsumerBottomBar",
  "ConsumerPressable",
  "ConsumerSnackbar",
]) {
  requireCondition(showcase.includes(marker), `showcase is missing ${marker}`);
}
requireCondition(fs.existsSync(paths.route), "ui primitive showcase route is missing");
requireCondition(focusContractFailures(css).length === 0, focusFailureMessage);
requireCondition(css.includes("var(--blab-focus-ring)"), "consumer focus ring must use the BLDS token");
requireCondition(e2e.includes('colorScheme: "dark"') && e2e.includes('colorScheme: "light"'), "responsive browser coverage must include both BLDS themes");
requireCondition(e2e.includes("task-9-ui-primitives-${locale}-${viewport.id}-${theme.id}.png"), "responsive browser coverage must capture both BLDS themes");

for (const locale of ["ko", "en"]) {
  const messages = JSON.parse(fs.readFileSync(paths[locale], "utf8"));
  requireCondition(messages.consumer?.uiPrimitives, `${locale} UI primitive messages are missing`);
  requireCondition(messages.consumer?.uiPrimitives?.boundariesFootnote, `${locale} native-only boundary copy is missing`);
}

requireCondition(contract.locales.includes("ko") && contract.locales.includes("en"), "BLDS contract locale coverage is incomplete");
requireCondition(contract.viewports.some(({ width, height }) => width === 390 && height === 844), "BLDS contract is missing 390x844");
requireCondition(contract.viewports.some(({ width, height }) => width === 1440 && height === 900), "BLDS contract is missing 1440x900");
for (const state of ["loading", "empty", "error", "retry", "unauthorized", "consent", "quota", "offline"]) {
  requireCondition(contract.states.includes(state), `BLDS contract is missing ${state}`);
}

const packageStyles = execFileSync("tar", ["-xOf", paths.artifact, "package/src/styles.css"], { encoding: "utf8" });
requireCondition(packageStyles.includes("@media (prefers-reduced-motion: reduce)"), "BLDS reduced-motion contract is missing");

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log("UI primitive contract passed: DESIGN.md, BLDS adapters, localized states, dev-only tooling and reduced-motion coverage");
