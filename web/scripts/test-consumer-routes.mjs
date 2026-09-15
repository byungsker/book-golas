import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";

const webRoot = path.resolve(import.meta.dirname, "..");
const vitest = path.join(webRoot, "node_modules", ".bin", "vitest");
const testResult = spawnSync(
  vitest,
  [
    "run",
    "src/lib/consumer/paths.test.ts",
    "src/lib/consumer/route-fixture.test.ts",
    "src/lib/consumer/queries.test.ts",
    "src/app/[locale]/(auth)/auth/callback/route.test.ts",
    "src/proxy.test.ts",
  ],
  { cwd: webRoot, encoding: "utf8", stdio: "inherit" },
);
if (testResult.status !== 0) process.exit(testResult.status ?? 1);

const requiredRoutes = [
  "(auth)/auth/sign-in/page.tsx",
  "(auth)/auth/sign-up/page.tsx",
  "(auth)/auth/reset-password/page.tsx",
  "(consumer)/announcements/page.tsx",
  "(consumer)/onboarding/page.tsx",
  "(consumer)/home/page.tsx",
  "(consumer)/library/page.tsx",
  "(consumer)/stats/page.tsx",
  "(consumer)/calendar/page.tsx",
  "(consumer)/account/page.tsx",
  "(consumer)/account/notifications/page.tsx",
  "(consumer)/book-list/page.tsx",
  "(consumer)/books/new/page.tsx",
  "(consumer)/books/[bookId]/page.tsx",
  "(consumer)/reading/[bookId]/page.tsx",
  "(consumer)/books/[bookId]/review/page.tsx",
  "(consumer)/books/[bookId]/mind-map/page.tsx",
  "(consumer)/books/scan/page.tsx",
  "(consumer)/subscription/page.tsx",
];

for (const route of requiredRoutes) {
  const target = path.join(webRoot, "src/app/[locale]", route);
  if (!fs.existsSync(target) || fs.statSync(target).size === 0) {
    throw new Error(`missing canonical consumer route: ${route}`);
  }
}

for (const locale of ["ko", "en"]) {
  const messages = JSON.parse(
    fs.readFileSync(path.join(webRoot, `messages/${locale}.json`), "utf8"),
  );
  for (const key of [
    "announcements",
    "onboarding",
    "library",
    "stats",
    "calendar",
    "accountNotifications",
    "bookList",
    "newBook",
    "review",
    "mindMap",
    "scan",
    "subscription",
  ]) {
    if (!messages.consumer?.routes?.[key]?.title || !messages.consumer.routes[key].description) {
      throw new Error(`missing ${locale} route copy: ${key}`);
    }
  }
}

const consumerLayout = fs.readFileSync(
  path.join(webRoot, "src/app/[locale]/(consumer)/layout.tsx"),
  "utf8",
);
if (!consumerLayout.includes("getCurrentConsumerUser")) {
  throw new Error("consumer layout does not own the authenticated boundary");
}

for (const detailRoute of [
  "src/app/[locale]/(consumer)/books/[bookId]/page.tsx",
  "src/app/[locale]/(consumer)/reading/[bookId]/page.tsx",
  "src/components/consumer/consumer-route-placeholder.tsx",
]) {
  const source = fs.readFileSync(path.join(webRoot, detailRoute), "utf8");
  if (!source.includes("fetchOwnedBook")) {
    throw new Error(`detail route lacks an ownership lookup: ${detailRoute}`);
  }
}

console.log(`Consumer route contract passed: ${requiredRoutes.length} canonical templates in ko and en`);
