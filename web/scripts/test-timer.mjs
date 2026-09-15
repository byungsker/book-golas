import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const fixtureMode = process.argv[2] === "--fixture" ? process.argv[3] : null;
const paths = {
  contract: path.join(root, "docs/timer-contract.json"),
  fixture: path.join(root, "scripts/fixtures/timer-negative.json"),
  manifest: path.join(root, "package.json"),
  state: path.join(root, "src/lib/consumer/timer-state.ts"),
  stateTest: path.join(root, "src/lib/consumer/timer-state.test.ts"),
  fixtures: path.join(root, "src/lib/consumer/timer-fixtures.ts"),
  fixtureTest: path.join(root, "src/lib/consumer/timer-fixtures.test.ts"),
  routeFixture: path.join(root, "src/lib/consumer/route-fixture.ts"),
  queries: path.join(root, "src/lib/consumer/queries.ts"),
  proxy: path.join(root, "src/proxy.ts"),
  contractSource: path.join(root, "src/lib/product/contracts/timer.ts"),
  contractTest: path.join(root, "src/lib/product/contracts/timer.test.ts"),
  books: path.join(root, "src/lib/product/contracts/books.ts"),
  codec: path.join(root, "src/lib/product/dal/codec.ts"),
  api: path.join(root, "src/app/api/consumer/timer/route.ts"),
  apiTest: path.join(root, "src/app/api/consumer/timer/route.test.ts"),
  provider: path.join(root, "src/components/consumer/consumer-timer-provider.tsx"),
  floating: path.join(root, "src/components/consumer/floating-timer-bar.tsx"),
  control: path.join(root, "src/components/consumer/reading-timer-control.tsx"),
  layout: path.join(root, "src/app/[locale]/(consumer)/layout.tsx"),
  shell: path.join(root, "src/components/consumer/consumer-shell.tsx"),
  detail: path.join(root, "src/components/consumer/book-detail-client.tsx"),
  signOut: path.join(root, "src/components/consumer/sign-out-button.tsx"),
  auth: path.join(root, "src/components/consumer/auth-form.tsx"),
  e2e: path.join(root, "tests/e2e/timer.spec.ts"),
  ko: path.join(root, "messages/ko.json"),
  en: path.join(root, "messages/en.json"),
};

const failures = [];
const requireCondition = (condition, message) => {
  if (!condition) failures.push(message);
};

for (const [name, filePath] of Object.entries(paths)) {
  requireCondition(fs.existsSync(filePath), `missing timer ${name}: ${path.relative(root, filePath)}`);
  if (fs.existsSync(filePath)) {
    requireCondition(fs.statSync(filePath).size > 0, `empty timer ${name}: ${path.relative(root, filePath)}`);
  }
}

if (failures.length === 0) {
  const contract = JSON.parse(fs.readFileSync(paths.contract, "utf8"));
  const fixture = JSON.parse(fs.readFileSync(paths.fixture, "utf8"));
  const manifest = JSON.parse(fs.readFileSync(paths.manifest, "utf8"));
  const source = Object.fromEntries(
    Object.entries(paths).map(([name, filePath]) => [name, fs.readFileSync(filePath, "utf8")]),
  );
  const requiredStates = ["loading", "empty", "error", "unauthorized", "consent", "quota", "offline", "logged-out", "running", "paused", "stopping", "saved", "discarded", "max-duration"];

  requireCondition(contract.issue === 436, "timer contract must bind issue 436");
  requireCondition(contract.plan === ".omo/plans/bookgolas-web-app-parity.md", "timer contract must reference the parity plan");
  requireCondition(JSON.stringify(contract.locales) === JSON.stringify(["ko", "en"]), "timer must cover Korean and English");
  for (const state of requiredStates) requireCondition(contract.states.includes(state), `timer contract must cover ${state}`);
  for (const operation of ["start", "pause", "resume", "stop", "restore", "clearOnLogout"]) requireCondition(contract.operations.includes(operation), `timer contract must cover ${operation}`);
  requireCondition(contract.constants.minimumSeconds === 30 && contract.constants.maximumSeconds === 28800, "timer bounds must match the native ceiling");
  requireCondition(Array.isArray(contract.nativeOnly) && contract.nativeOnly.length >= 6, "timer native-only capabilities must be explicit");
  requireCondition(fixture.issue === 436 && fixture.fixtures.length >= 6, "timer negative fixtures must cover thresholds, replay, logout, ownership and offline failure");
  requireCondition(manifest.scripts["test:timer"] === "node scripts/test-timer.mjs && vitest run src/lib/product/contracts/timer.test.ts src/lib/consumer/timer-state.test.ts src/lib/consumer/timer-fixtures.test.ts src/app/api/consumer/timer/route.test.ts", "package must expose the exact timer acceptance command");
  requireCondition(manifest.scripts["test:timer:negative"] === "node scripts/test-timer.mjs --fixture minimum && node scripts/test-timer.mjs --fixture duplicate && node scripts/test-timer.mjs --fixture logout && node scripts/test-timer.mjs --fixture over-max", "package must expose the exact timer negative command");
  requireCondition(source.contractSource.includes("TimerFinishRequestSchema") && source.contractSource.includes("timerMaximumSeconds") && source.contractSource.includes("idempotencyKey"), "timer request contract must own the bounds and idempotency key");
  requireCondition(source.contractTest.includes("user_id") && source.contractTest.includes("endedAt") && source.contractTest.includes("timerRequestMaximumSeconds"), "timer contract tests must reject caller identity, reversed dates and excessive input");
  requireCondition(source.state.includes("timerStorageKey") && source.state.includes("timerMinimumMilliseconds") && source.state.includes("timerMaximumMilliseconds") && source.state.includes("pauseTimerState") && source.state.includes("resumeTimerState"), "timer state must persist pause/resume and native bounds");
  requireCondition(source.state.includes("clearBrowserTimerState") && source.state.includes("bookgolas:logout"), "timer state must clear on logout");
  requireCondition(source.stateTest.includes("round-trips") && source.stateTest.includes("pauses and resumes") && source.stateTest.includes("eight hours"), "timer state tests must cover restore, pause/resume and max duration");
  requireCondition(source.api.includes("resolveProductSession") && source.api.includes('.eq("user_id", userId)') && source.api.includes('.is("deleted_at", null)'), "timer API must derive and enforce the verified owner scope");
  requireCondition(source.api.includes("idempotencyKey") && source.api.includes("23505") && source.api.includes("total_reading_seconds"), "timer API must replay idempotently and update saved totals");
  requireCondition(source.api.includes("timerMinimumSeconds") && source.api.includes("timerMaximumSeconds") && source.api.includes("private, no-store"), "timer API must enforce minimum/maximum and private caching");
  requireCondition(source.apiTest.includes("discards") && source.apiTest.includes("caps") && source.apiTest.includes("duplicate") && source.apiTest.includes("unauthorized"), "timer API tests must cover threshold, replay and typed failure paths");
  requireCondition(source.routeFixture.includes('"timer-minimum"') && source.routeFixture.includes('"timer-over-max"') && source.routeFixture.includes('"timer-duplicate"') && source.routeFixture.includes('"timer-unauthorized"') && source.fixtures.includes("cappedDuration < 30") && source.fixtures.includes("savedRequests"), "timer fixtures must model negative and replay paths");
  requireCondition(source.fixtureTest.includes("short sessions") && source.fixtureTest.includes("idempotently") && source.fixtureTest.includes("offline"), "timer fixture tests must cover short, replay and offline paths");
  requireCondition(source.routeFixture.includes('"timer-happy"') && source.proxy.includes('startsWith("timer-")') && source.queries.includes('startsWith("timer-")'), "timer fixtures must remain bounded by the loopback route and auth boundaries");
  requireCondition(source.provider.includes("localStorage") && source.provider.includes("SIGNED_OUT") && source.provider.includes("timer-saved") && source.provider.includes("stopTimer"), "timer provider must restore, clear on auth logout and publish saved totals");
  requireCondition(source.floating.includes("bookgolas-floating-timer-root") && source.floating.includes("timer-pause") && source.floating.includes("timer-stop"), "floating timer bar must expose stable controls");
  requireCondition(source.control.includes("reading-timer-open") && source.control.includes("reading-timer-dialog") && source.control.includes("timer-start"), "book detail must expose the timer modal and start action");
  requireCondition(source.layout.includes("ConsumerTimerProvider") && source.shell.includes("consumer-timer-mount") === false, "timer provider must wrap the shell and own the floating mount");
  requireCondition(source.detail.includes("ReadingTimerControl") && source.detail.includes("totalReadingSeconds") && source.detail.includes("bookgolas:timer-saved"), "detail must expose the control and saved total");
  requireCondition(source.signOut.includes("broadcastBrowserLogout") && source.auth.includes("broadcastBrowserLogout"), "all browser sign-out paths must clear timer state");
  requireCondition(source.books.includes("totalReadingSeconds") && source.codec.includes("total_reading_seconds"), "book DTOs must carry saved session totals");
  requireCondition(source.ko.includes('"timer"') && source.en.includes('"timer"') && source.ko.includes('"totalReadingTime"') && source.en.includes('"totalReadingTime"'), "timer copy must be localized in Korean and English");
  requireCondition(source.e2e.includes("starts, pauses, resumes, stops and survives refresh") && source.e2e.includes("minimum sessions are discarded") && source.e2e.includes("duplicate stop is harmless") && source.e2e.includes("logout clears browser timer state"), "browser suite must name the issue-defined happy and failure scenarios");
  requireCondition(source.e2e.includes("task-22-bookgolas-web-app-parity.png") && source.e2e.includes("timer-over-max"), "browser suite must capture evidence and exercise the maximum bound");

  if (fixtureMode === "minimum") {
    requireCondition(source.fixtures.includes('cappedDuration < 30') && source.api.includes('cappedDuration < timerMinimumSeconds') && source.e2e.includes("timer-minimum"), "minimum fixture must discard before persistence");
  }
  if (fixtureMode === "duplicate") {
    requireCondition(source.fixtures.includes("savedRequests") && source.api.includes("existing") && source.e2e.includes("idempotencyKey"), "duplicate fixture must replay one session by idempotency key");
  }
  if (fixtureMode === "logout") {
    requireCondition(source.state.includes("broadcastBrowserLogout") && source.provider.includes("handleLogout") && source.e2e.includes("localStorage"), "logout fixture must clear browser state through the auth event");
  }
  if (fixtureMode === "over-max") {
    requireCondition(source.contractSource.includes("timerRequestMaximumSeconds") && source.api.includes("Math.min(input.durationSeconds, timerMaximumSeconds)") && source.e2e.includes("86_400"), "over-max fixture must cap persisted duration at eight hours");
  }
}

if (failures.length > 0) {
  console.error(`timer contract failed with ${failures.length} error(s)`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`timer contract passed${fixtureMode ? ` (${fixtureMode})` : ""}`);
