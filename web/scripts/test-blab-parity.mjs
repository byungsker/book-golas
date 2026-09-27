import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const webRoot = path.resolve(import.meta.dirname, "..");
const contractPath = path.join(webRoot, "docs/blab-react-parity-contract.json");
const packagePath = path.join(webRoot, "package.json");
const adapterPath = path.join(webRoot, "src/components/consumer/blab-primitives.tsx");
const vendorReadmePath = path.join(webRoot, "vendor/README.md");
const artifactPath = path.join(webRoot, "vendor/byungsker-blab-design-system-0.2.0.tgz");
const lockPath = path.join(webRoot, "package-lock.json");
const nativeTestSourcePath = path.join(webRoot, "docs/blab-native-reference-test.dart");
const fixtureName = process.argv[2] === "--fixture" ? process.argv[3] : null;

const contract = JSON.parse(fs.readFileSync(contractPath, "utf8"));
const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8"));
const fixturePath = fixtureName
  ? path.join(webRoot, "scripts/fixtures/blab-parity-missing-component.json")
  : null;
const adapterSourcePath = fixturePath
  ? path.join(webRoot, JSON.parse(fs.readFileSync(fixturePath, "utf8")).adapter_source)
  : adapterPath;
const adapter = fs.readFileSync(adapterSourcePath, "utf8");
const vendorReadme = fs.readFileSync(vendorReadmePath, "utf8");
const packageLock = JSON.parse(fs.readFileSync(lockPath, "utf8"));
const failures = [];
let artifactSha256 = "missing";

function requireCondition(condition, message) {
  if (!condition) failures.push(message);
}

if (fixtureName === "missing-component") {
  const fixture = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
  requireCondition(!adapter.includes(`function ${fixture.remove_adapter_export}`), `negative fixture did not remove ${fixture.remove_adapter_export}`);
}

requireCondition(contract.schema_version === 1, "contract schema_version must be 1");
requireCondition(contract.source.flutter_commit === "10a9016f58b30728f179f1c96b0ed738c40c271c", "BLDS source commit is not pinned");
requireCondition(packageJson.dependencies["@byungsker/blab-design-system"] === "file:vendor/byungsker-blab-design-system-0.2.0.tgz", "Web dependency must use the versioned BLDS artifact");
requireCondition(fs.existsSync(artifactPath), "versioned BLDS artifact is missing");
if (fs.existsSync(artifactPath)) {
  artifactSha256 = crypto.createHash("sha256").update(fs.readFileSync(artifactPath)).digest("hex");
  requireCondition(vendorReadme.includes(`SHA-256: \`${artifactSha256}\``), "vendor README SHA-256 does not match the artifact");
  const lockEntry = packageLock.packages["node_modules/@byungsker/blab-design-system"];
  requireCondition(lockEntry?.resolved === "file:vendor/byungsker-blab-design-system-0.2.0.tgz", "lockfile does not resolve the versioned BLDS artifact");
  requireCondition(lockEntry?.integrity === "sha512-AtPDKb6WSGr1ipk60IJoBjrNyPoPcBKiZQh7fUYLnvwL96ou028sA24Lz7SF/jCuKSAXYK6hqzLxIXkC7oEC+Q==", "lockfile BLDS integrity is not pinned to the reviewed artifact");
  const packageStyles = execFileSync("tar", ["-xOf", artifactPath, "package/src/styles.css"], { encoding: "utf8" });
  const publicPackage = await import("@byungsker/blab-design-system");
  for (const exportName of ["BLabColors", "BLabTypography", "BLabButton", "BLabCard", "BLabTextField", "BLabLoadingState", "BLabEmptyState", "BLabErrorState"]) {
    requireCondition(exportName in publicPackage, `BLDS package export ${exportName} is missing from the reviewed artifact`);
  }
  for (const token of contract.tokens) {
    for (const cssVariable of token.css_variable.split("|")) {
      requireCondition(packageStyles.includes(cssVariable), `BLDS CSS variable ${cssVariable} is missing from the reviewed artifact`);
    }
  }
}
const adapterImports = [...adapter.matchAll(/\bfrom\s+["']([^"']+)["']/g)].map(([, moduleName]) => moduleName);
requireCondition(adapterImports.length > 0, "adapter must import the BLDS public package root");
requireCondition(adapterImports.every((moduleName) => moduleName === "@byungsker/blab-design-system"), "adapter must import only BLDS public package paths");
requireCondition(JSON.stringify(contract.locales) === JSON.stringify(["ko", "en"]), "contract must cover ko and en");
requireCondition(JSON.stringify(contract.themes) === JSON.stringify(["light", "dark"]), "contract must cover light and dark themes");
requireCondition(contract.viewports.some(({ width, height }) => width === 390 && height === 844), "contract must cover 390x844");
requireCondition(contract.viewports.some(({ width, height }) => width === 1440 && height === 900), "contract must cover 1440x900");
requireCondition(contract.tokens.length >= 8, "contract must include token mappings");
for (const token of contract.tokens) {
  requireCondition(token.native_export && token.react_export && token.css_variable && token.role, `token ${token.id} is missing a Flutter-to-React mapping`);
}
for (const state of ["loading", "empty", "error", "retry", "unauthorized", "consent", "quota", "offline"]) {
  requireCondition(contract.states.includes(state), `contract is missing ${state} state`);
}
for (const component of ["button", "card", "text-field", "state-feedback"]) {
  const entry = contract.components.find(({ id }) => id === component);
  requireCondition(Boolean(entry), `contract is missing ${component}`);
  if (entry) {
    requireCondition(entry.props.length > 0, `${component} is missing props`);
    requireCondition(entry.variants.length > 0, `${component} is missing variants`);
    requireCondition(entry.states.length > 0, `${component} is missing states`);
    requireCondition(entry.accessibility.length > 0, `${component} is missing accessibility contract`);
    requireCondition(entry.motion.length > 0, `${component} is missing motion contract`);
  }
}
requireCondition(contract.native_only_boundaries.length >= 6, "native-only boundaries are incomplete");
for (const adapterExport of [
  "ConsumerButton",
  "ConsumerCard",
  "ConsumerTextField",
  "ConsumerLoadingState",
  "ConsumerEmptyState",
  "ConsumerErrorState",
]) {
  requireCondition(adapter.includes(`function ${adapterExport}`), `adapter is missing ${adapterExport}`);
}
requireCondition(contract.native_reference?.flutter_commit === contract.source.flutter_commit, "native reference is not pinned to BLDS source");
requireCondition(Object.keys(contract.native_reference?.sources ?? {}).length >= 4, "native reference sources are incomplete");
requireCondition(fs.existsSync(nativeTestSourcePath), "native Flutter reference test source is missing");
for (const nativeEvidencePath of contract.native_reference?.comparison?.native_visual_evidence ?? []) {
  requireCondition(fs.existsSync(path.resolve(webRoot, "..", nativeEvidencePath)), `native visual evidence is missing: ${nativeEvidencePath}`);
}

if (fixtureName === "missing-component") {
  const fixture = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
  requireCondition(failures.some((message) => message.includes(fixture.expected_message)), `negative fixture did not report: ${fixture.expected_message}`);
  requireCondition(failures.length > 0, "missing-component fixture did not fail");
  console.log(`BLDS parity negative fixture passed: ${failures[0]}`);
  process.exit(0);
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(`BLDS React parity contract passed: artifact=${path.relative(webRoot, artifactPath)} sha256=${artifactSha256} contract=${path.relative(webRoot, contractPath)} evidence=docs/evidence/bookgolas-web-app-parity`);
