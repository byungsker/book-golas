import fs from "node:fs";
import path from "node:path";

const webRoot = path.resolve(import.meta.dirname, "..");
const requiredFiles = [
  "src/lib/supabase-config.ts",
  "src/lib/supabase.ts",
  "src/lib/supabase-server.ts",
  "src/lib/supabase-admin.ts",
  "src/proxy.ts",
];

for (const relativePath of requiredFiles) {
  if (!fs.existsSync(path.join(webRoot, relativePath))) {
    throw new Error(`missing auth boundary file: ${relativePath}`);
  }
}

const source = fs.readFileSync(path.join(webRoot, "src/lib/supabase.ts"), "utf8");
for (const marker of ["placeholder.supabase.co", "placeholder-key"]) {
  if (source.includes(marker)) throw new Error(`browser client contains placeholder: ${marker}`);
}

for (const relativePath of [
  "src/app/[locale]/home/page.tsx",
  "src/app/[locale]/account/page.tsx",
  "src/app/[locale]/books/[bookId]/page.tsx",
  "src/app/[locale]/reading/[bookId]/page.tsx",
]) {
  const page = fs.readFileSync(path.join(webRoot, relativePath), "utf8");
  if (!page.includes('export const dynamic = "force-dynamic"')) {
    throw new Error(`authenticated page is not force-dynamic: ${relativePath}`);
  }
}

const staticRoot = path.join(webRoot, ".next/static");
if (fs.existsSync(staticRoot)) {
  const files = [];
  const visit = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(entryPath);
      else files.push(entryPath);
    }
  };
  visit(staticRoot);
  for (const file of files) {
    if (fs.readFileSync(file, "utf8").includes("SUPABASE_SERVICE_ROLE_KEY")) {
      throw new Error(`service-role key name leaked into client asset: ${file}`);
    }
  }
  console.log(`Auth boundary static scan passed: ${files.length} client assets`);
} else {
  console.log("Auth boundary static scan deferred: .next/static is absent");
}

console.log("Auth boundary source scan passed: fail-closed config, server-only clients, dynamic auth pages");
