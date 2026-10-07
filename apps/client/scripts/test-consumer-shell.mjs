import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const paths = {
  contract: path.join(root, "docs/consumer-shell-contract.json"),
  fixture: path.join(root, "scripts/fixtures/consumer-shell-negative.json"),
  manifest: path.join(root, "package.json"),
  shell: path.join(root, "src/components/consumer/consumer-shell.tsx"),
  floatingTimer: path.join(root, "src/components/consumer/floating-timer-bar.tsx"),
  announcements: path.join(root, "src/app/[locale]/(consumer)/announcements/page.tsx"),
  announcementsLoading: path.join(root, "src/app/[locale]/(consumer)/announcements/loading.tsx"),
  state: path.join(root, "src/lib/consumer/shell.ts"),
  layout: path.join(root, "src/app/[locale]/(consumer)/layout.tsx"),
  e2e: path.join(root, "tests/e2e/consumer-shell.spec.ts"),
  en: path.join(root, "messages/en.json"),
  ko: path.join(root, "messages/ko.json"),
};

function requireCondition(condition, message) {
  if (!condition) throw new Error(message);
}

for (const filePath of Object.values(paths)) {
  requireCondition(fs.existsSync(filePath), `missing consumer shell file: ${path.relative(root, filePath)}`);
  requireCondition(fs.statSync(filePath).size > 0, `empty consumer shell file: ${path.relative(root, filePath)}`);
}

const contract = JSON.parse(fs.readFileSync(paths.contract, "utf8"));
const fixture = JSON.parse(fs.readFileSync(paths.fixture, "utf8"));
const manifest = JSON.parse(fs.readFileSync(paths.manifest, "utf8"));
const shell = fs.readFileSync(paths.shell, "utf8");
const floatingTimer = fs.readFileSync(paths.floatingTimer, "utf8");
const announcements = fs.readFileSync(paths.announcements, "utf8");
const announcementsLoading = fs.readFileSync(paths.announcementsLoading, "utf8");
const state = fs.readFileSync(paths.state, "utf8");
const layout = fs.readFileSync(paths.layout, "utf8");
const e2e = fs.readFileSync(paths.e2e, "utf8");

requireCondition(contract.issue === 425, "contract must bind GitHub issue 425");
requireCondition(contract.plan === ".omo/plans/bookgolas-web-app-parity.md", "contract must reference the parity plan");
requireCondition(JSON.stringify(contract.tabs) === JSON.stringify(["home", "library", "stats", "calendar", "account"]), "contract must define exactly five tabs");
requireCondition(contract.adminNavigationCoupled === false, "consumer tab state must stay separate from admin navigation");
requireCondition(contract.nativeOnlyCapabilitiesAdded.length === 0, "shell must not add native-only capabilities");
requireCondition(manifest.scripts["test:consumer-shell"] === "node scripts/test-consumer-shell.mjs", "package script must run the shell contract");
requireCondition(layout.includes("<ConsumerShell"), "authenticated layout must mount the shell");
requireCondition(!shell.includes("consumer-timer-mount"), "shell must not duplicate the timer provider mount");
requireCondition(floatingTimer.includes("bookgolas-floating-timer-root") && floatingTimer.includes("consumer-timer-mount"), "timer provider must expose the floating timer mount point");
requireCondition(shell.includes("ConsumerBottomBar") && shell.includes("lg:grid"), "shell must provide mobile and desktop navigation");
requireCondition(state.includes("getNextCycledPath"), "shell must implement re-tap cycles");
requireCondition(e2e.includes("expired-session") && e2e.includes("unauthorized-private-data"), "browser coverage must include both negative fixtures");
requireCondition(announcements.includes("push_announcements") && !announcements.includes("ConsumerRoutePlaceholder"), "announcements must read sent announcements instead of rendering a placeholder");
requireCondition(announcements.includes("announcements-content") && announcements.includes("announcements-empty") && announcements.includes("announcements-error"), "announcements must expose content, empty and error fixtures");
requireCondition(announcementsLoading.includes("ConsumerLoadingState"), "announcements must expose a loading state");
requireCondition(Boolean(fixture.expiredSession && fixture.unauthorizedPrivateData && fixture.foreignBookId), "negative fixture must define expired session and foreign data");

for (const locale of ["en", "ko"]) {
  const messages = JSON.parse(fs.readFileSync(paths[locale], "utf8"));
  const tabs = messages.consumer?.shell?.tabs;
  requireCondition(tabs && Object.keys(tabs).length === 5, `${locale} must localize exactly five tabs`);
  requireCondition(Boolean(messages.consumer.shell.search?.bookTitle && messages.consumer.shell.search?.recallTitle), `${locale} must localize both search modes`);
  requireCondition(Boolean(messages.consumer.announcements?.emptyTitle && messages.consumer.announcements?.errorTitle), `${locale} must localize announcement states`);
}

const vitest = path.join(root, "node_modules", ".bin", "vitest");
const result = spawnSync(vitest, ["run", "src/_app/layouts/consumer/model/shell.test.ts", "src/shared/config/consumer-route-fixture.test.ts", "src/proxy.test.ts"], {
  cwd: root,
  encoding: "utf8",
  stdio: "inherit",
});
if (result.status !== 0) process.exit(result.status ?? 1);

console.log("consumer shell contract: PASS");
