import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const paths = {
  contract: path.join(root, "docs/onboarding-contract.json"),
  fixture: path.join(root, "scripts/fixtures/onboarding-negative.json"),
  manifest: path.join(root, "package.json"),
  state: path.join(root, "src/lib/consumer/onboarding.ts"),
  flow: path.join(root, "src/components/consumer/onboarding-flow.tsx"),
  page: path.join(root, "src/app/[locale]/(consumer)/onboarding/page.tsx"),
  e2e: path.join(root, "tests/e2e/onboarding.spec.ts"),
  ko: path.join(root, "messages/ko.json"),
  en: path.join(root, "messages/en.json"),
};

function requireCondition(condition, message) {
  if (!condition) throw new Error(message);
}

for (const filePath of Object.values(paths)) {
  requireCondition(fs.existsSync(filePath), `missing onboarding contract file: ${path.relative(root, filePath)}`);
}

const contract = JSON.parse(fs.readFileSync(paths.contract, "utf8"));
const fixture = JSON.parse(fs.readFileSync(paths.fixture, "utf8"));
const manifest = JSON.parse(fs.readFileSync(paths.manifest, "utf8"));
const state = fs.readFileSync(paths.state, "utf8");
const flow = fs.readFileSync(paths.flow, "utf8");
const page = fs.readFileSync(paths.page, "utf8");
const e2e = fs.readFileSync(paths.e2e, "utf8");
const messages = [JSON.parse(fs.readFileSync(paths.ko, "utf8")), JSON.parse(fs.readFileSync(paths.en, "utf8"))];

requireCondition(contract.issue === 426, "contract must bind GitHub issue 426");
requireCondition(contract.plan === ".omo/plans/bookgolas-web-app-parity.md", "contract must reference the parity plan");
requireCondition(JSON.stringify(contract.locales) === JSON.stringify(["ko", "en"]), "contract must cover ko and en");
requireCondition(contract.pageCount === 3, "contract must require three onboarding pages");
requireCondition(contract.storageScope === "browser-device-localStorage", "contract must preserve browser-local persistence");
requireCondition(contract.authOrder === "authenticated-before-onboarding", "contract must match the native auth order");
requireCondition(manifest.scripts["test:onboarding"]?.includes("scripts/test-onboarding.mjs"), "package script must run the onboarding contract");
requireCondition(state.includes("hasSeenOnboarding_v1") && state.includes("age_policy_status"), "local storage must use native-compatible keys");
requireCondition(state.includes("resetOnboardingState"), "onboarding state must expose a fixture reset");
requireCondition(flow.includes("readOnboardingState") && flow.includes("completeOnboardingState"), "flow must read and persist onboarding state");
requireCondition(page.includes("getSafeNextPath"), "auth handoff must validate the localized destination");
requireCondition(e2e.includes("corrupt-storage"), "browser coverage must include corrupt storage recovery");
requireCondition(fixture.invalidCompletedValues.length >= 3 && fixture.invalidAgePolicyValues.length >= 3, "negative fixture must cover invalid local values");
requireCondition(fixture.unsafeNextTargets.length >= 3, "negative fixture must cover unsafe handoff targets");

for (const messagesForLocale of messages) {
  const onboarding = messagesForLocale.consumer?.onboarding;
  requireCondition(onboarding?.pages?.length === 3, "each locale must provide all three pages");
  requireCondition(Boolean(onboarding.skip && onboarding.next && onboarding.start), "each locale must provide skip, next and start copy");
  requireCondition(Boolean(onboarding.agePolicy?.under14 && onboarding.agePolicy?.age14OrOlder), "each locale must provide both age choices");
}

console.log("onboarding contract: PASS");
