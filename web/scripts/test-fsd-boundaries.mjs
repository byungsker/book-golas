import fs from "node:fs";
import path from "node:path";

const webRoot = process.cwd();
const sourceRoot = path.join(webRoot, "src");
const layers = ["_pages", "entities", "shared"];
const layerOrder = new Map(layers.map((name, index) => [name, index]));
const failures = [];

function requireCondition(condition, message) {
  if (!condition) failures.push(message);
}

function collectFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...collectFiles(entryPath));
    if (entry.isFile() && /\.(?:ts|tsx)$/.test(entry.name)) files.push(entryPath);
  }
  return files;
}

function layerInfo(filePath) {
  const relativePath = path.relative(sourceRoot, filePath).split(path.sep);
  if (!layers.includes(relativePath[0]) || !relativePath[1]) return null;
  return {
    layer: relativePath[0],
    slice: relativePath[1],
  };
}

function resolveImport(importer, specifier) {
  if (specifier.startsWith("@/")) {
    return path.resolve(sourceRoot, specifier.slice(2));
  }
  if (specifier.startsWith(".")) {
    return path.resolve(path.dirname(importer), specifier);
  }
  return null;
}

function isPublicAlias(specifier, target) {
  if (!specifier.startsWith("@/")) return false;
  const parts = specifier.slice(2).split("/");
  const targetInfo = layerInfo(target);
  if (!targetInfo) return false;
  return parts.length === 2;
}

function checkPublicEntrypoints(layerDirectory, layerName) {
  if (!fs.existsSync(layerDirectory)) return;
  for (const entry of fs.readdirSync(layerDirectory, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const entryPath = path.join(layerDirectory, entry.name);
    requireCondition(
      fs.existsSync(path.join(entryPath, "index.ts")),
      `${layerName}/${entry.name} must expose index.ts`,
    );
  }
}

for (const layer of layers.filter((name) => name !== "shared")) {
  checkPublicEntrypoints(path.join(sourceRoot, layer), layer);
}
checkPublicEntrypoints(path.join(sourceRoot, "shared"), "shared");

const layerFiles = layers.flatMap((layer) => collectFiles(path.join(sourceRoot, layer)));
const appPagePaths = new Set(
  collectFiles(path.join(sourceRoot, "app")).filter((filePath) => path.basename(filePath) === "page.tsx"),
);
const scannedFiles = collectFiles(sourceRoot);

for (const importer of scannedFiles) {
  const source = fs.readFileSync(importer, "utf8");
  const importerInfo = layerInfo(importer);
  const imports = [...source.matchAll(/\b(?:from\s*|import\s*(?:\(\s*)?)['"]([^'"]+)['"]/g)];

  for (const match of imports) {
    const specifier = match[1];
    const target = resolveImport(importer, specifier);
    if (!target) continue;
    const targetInfo = layerInfo(target);
    if (!targetInfo) continue;

    if (specifier.startsWith("@/")) {
      requireCondition(
        isPublicAlias(specifier, target),
        `${path.relative(webRoot, importer)} imports FSD internals directly: ${specifier}`,
      );
    } else if (specifier.startsWith(".")) {
      requireCondition(
        importerInfo && importerInfo.layer === targetInfo.layer && importerInfo.slice === targetInfo.slice,
        `${path.relative(webRoot, importer)} uses a relative import across FSD slices: ${specifier}`,
      );
    }

    if (!importerInfo) {
      if (appPagePaths.has(importer)) {
        requireCondition(
          targetInfo.layer === "_pages",
          `${path.relative(webRoot, importer)} may enter FSD only through the pages layer: ${specifier}`,
        );
      }
      continue;
    }

    if (importerInfo.layer === targetInfo.layer) {
      requireCondition(
        importerInfo.slice === targetInfo.slice || importerInfo.layer === "shared",
        `${path.relative(webRoot, importer)} imports a sibling slice from ${targetInfo.layer}: ${specifier}`,
      );
      continue;
    }

    requireCondition(
      layerOrder.get(targetInfo.layer) > layerOrder.get(importerInfo.layer),
      `${path.relative(webRoot, importer)} violates FSD layer direction: ${specifier}`,
    );
  }
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(`FSD boundary gate passed for ${layerFiles.length} layer modules`);
