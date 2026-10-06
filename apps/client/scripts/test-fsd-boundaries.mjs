import fs from "node:fs";
import path from "node:path";

const webRoot = process.cwd();
const sourceRoot = path.join(webRoot, "src");
const layerOrder = new Map([
  ["_app", 0],
  ["_pages", 1],
  ["widgets", 2],
  ["features", 3],
  ["entities", 4],
  ["shared", 5],
]);
const sliceLayers = new Set(["_pages", "widgets", "features", "entities"]);
const groupedLayers = new Set(["_app", "shared"]);
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
  const layer = relativePath[0];
  if (!layerOrder.has(layer)) return null;
  if (sliceLayers.has(layer)) {
    if (!relativePath[1]) return null;
    return { layer, slice: relativePath[1] };
  }
  if (groupedLayers.has(layer)) return { layer, slice: null };
  return null;
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

function sourceModuleExists(target) {
  if (fs.existsSync(target) && fs.statSync(target).isDirectory()) return true;
  return [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"].some((extension) =>
    fs.existsSync(target + extension),
  );
}

function isPublicAlias(specifier) {
  if (!specifier.startsWith("@/")) return false;
  const parts = specifier.slice(2).split("/");
  const layer = parts[0];
  if (!layerOrder.has(layer)) return true;

  if (sliceLayers.has(layer)) {
    const slice = parts[1];
    if (!slice) return false;
    const sliceDirectory = path.join(sourceRoot, layer, slice);
    if (parts.length === 2) {
      return ["index.ts", "index.tsx"].some((entrypoint) =>
        fs.existsSync(path.join(sliceDirectory, entrypoint)),
      );
    }
    if (parts.length === 3 && parts[2] === "index.server") {
      return ["index.server.ts", "index.server.tsx"].some((entrypoint) =>
        fs.existsSync(path.join(sliceDirectory, entrypoint)),
      );
    }
    return false;
  }

  if (groupedLayers.has(layer)) {
    if (parts.at(-1) === "index.server") {
      const boundaryDirectory = path.join(sourceRoot, ...parts.slice(0, -1));
      return fs.existsSync(path.join(boundaryDirectory, "index.server.ts"));
    }
    const boundaryDirectory = path.join(sourceRoot, ...parts);
    return fs.existsSync(path.join(boundaryDirectory, "index.ts"));
  }

  return false;
}

function checkPublicEntrypoints(layerDirectory, layerName) {
  if (!fs.existsSync(layerDirectory)) return;
  for (const entry of fs.readdirSync(layerDirectory, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const entryPath = path.join(layerDirectory, entry.name);
    requireCondition(
      fs.existsSync(path.join(entryPath, "index.ts")) ||
        fs.existsSync(path.join(entryPath, "index.tsx")) ||
        fs.existsSync(path.join(entryPath, "index.server.ts")) ||
        fs.existsSync(path.join(entryPath, "index.server.tsx")),
      `${layerName}/${entry.name} must expose index.ts or index.server.ts`,
    );
  }
}

for (const layer of sliceLayers) {
  checkPublicEntrypoints(path.join(sourceRoot, layer), layer);
}

const layerFiles = [...layerOrder.keys()].flatMap((layer) =>
  collectFiles(path.join(sourceRoot, layer)),
);
const isTestFile = (filePath) => /\.(?:test|spec)\.(?:ts|tsx)$/.test(filePath);
const appFiles = collectFiles(path.join(webRoot, "app")).filter((filePath) => !isTestFile(filePath));
const scannedFiles = [
  ...collectFiles(sourceRoot),
  ...(fs.existsSync(path.join(webRoot, "proxy.ts")) ? [path.join(webRoot, "proxy.ts")] : []),
].filter((filePath) => !isTestFile(filePath));

for (const importer of scannedFiles) {
  const source = fs.readFileSync(importer, "utf8");
  const importerInfo = layerInfo(importer);
  const imports = [...source.matchAll(/\b(?:from\s*|import\s*(?:\(\s*)?)['"]([^'"]+)['"]/g)];

  for (const match of imports) {
    const specifier = match[1];
    const target = resolveImport(importer, specifier);
    if (!target || !sourceModuleExists(target)) continue;
    const targetInfo = layerInfo(target);
    if (!targetInfo) continue;

    if (specifier.startsWith("@/")) {
      requireCondition(
        isPublicAlias(specifier),
        `${path.relative(webRoot, importer)} bypasses an FSD public API: ${specifier}`,
      );
    } else if (specifier.startsWith(".")) {
      requireCondition(
        importerInfo && importerInfo.layer === targetInfo.layer &&
          (groupedLayers.has(importerInfo.layer) || importerInfo.slice === targetInfo.slice),
        `${path.relative(webRoot, importer)} uses a relative import across FSD boundaries: ${specifier}`,
      );
    }

    if (!importerInfo) {
      continue;
    }

    if (importerInfo.layer === targetInfo.layer) {
      if (groupedLayers.has(importerInfo.layer)) continue;
      const sameSlice = importerInfo.slice === targetInfo.slice;
      const publicCrossImport =
        (importerInfo.layer === "widgets" || importerInfo.layer === "features") &&
        isPublicAlias(specifier);
      requireCondition(
        sameSlice || publicCrossImport,
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

for (const appFile of appFiles) {
  const appFileName = path.basename(appFile);
  const allowedLayers = appFileName === "page.tsx"
    ? new Set(["_pages"])
    : appFileName === "route.ts"
      ? new Set(["_app"])
      : new Set(["layout.tsx", "loading.tsx", "error.tsx", "not-found.tsx", "template.tsx", "default.tsx"]).has(appFileName)
        ? new Set(["_app", "_pages"])
        : null;
  if (!allowedLayers) continue;
  const source = fs.readFileSync(appFile, "utf8");
  const imports = [...source.matchAll(/\b(?:from\s*|import\s*(?:\(\s*)?)['"]([^'"]+)['"]/g)];
  for (const match of imports) {
    const target = resolveImport(appFile, match[1]);
    const targetInfo = target ? layerInfo(target) : null;
    if (!targetInfo) continue;
    requireCondition(
      allowedLayers.has(targetInfo.layer),
      `${path.relative(webRoot, appFile)} must use an FSD ${[...allowedLayers].join(" or ")} public API: ${match[1]}`,
    );
    requireCondition(
      isPublicAlias(match[1]),
      `${path.relative(webRoot, appFile)} bypasses an FSD public API: ${match[1]}`,
    );
  }
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(`FSD boundary gate passed for ${layerFiles.length} layer modules`);
