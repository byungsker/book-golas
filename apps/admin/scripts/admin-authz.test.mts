import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const pagePaths = [
  "app/(protected)/page.tsx",
  "app/(protected)/announcements/page.tsx",
  "app/(protected)/push-logs/page.tsx",
  "app/(protected)/push-templates/page.tsx",
  "app/(protected)/test-push/page.tsx",
  "app/(protected)/waitlist/page.tsx",
];

for (const path of pagePaths) {
  const source = await readFile(path, "utf8");
  assert.equal(source.includes('.from("'), false, path + " must not query Supabase from the browser");
}

const routes = [
  ["app/api/admin/ai-monitor/route.ts", "src/_app/api-routes/admin-ai-monitor.ts"],
  ["app/api/admin/ai-usage/route.ts", "src/_app/api-routes/admin-ai-usage.ts"],
  ["app/api/admin/announcements/route.ts", "src/_app/api-routes/admin-announcements.ts"],
  ["app/api/admin/fcm-tokens/route.ts", "src/_app/api-routes/admin-push/fcm-tokens.ts"],
  ["app/api/admin/push-logs/route.ts", "src/_app/api-routes/admin-push-logs.ts"],
  ["app/api/admin/push-templates/route.ts", "src/_app/api-routes/admin-push-templates.ts"],
  ["app/api/admin/send-bulk-push/route.ts", "src/_app/api-routes/admin-push/bulk-push.ts"],
  ["app/api/admin/send-test-push/route.ts", "src/_app/api-routes/admin-push/test-push.ts"],
  ["app/api/admin/users/route.ts", "src/_app/api-routes/admin-users/users.ts"],
  ["app/api/admin/waitlist/route.ts", "src/_app/api-routes/admin-waitlist.ts"],
];

for (const [routePath, handlerPath] of routes) {
  const wrapper = await readFile(routePath, "utf8");
  const handler = await readFile(handlerPath, "utf8");
  assert.match(wrapper, /@\/_app\/api-routes/);
  const executable = handler.replace(/^import .*?;$/gm, "");
  const authIndex = executable.indexOf("requireAdminUser");
  assert.notEqual(authIndex, -1, routePath + " must invoke requireAdminUser");
  assert.match(executable, /status:\s*401/);
  assert.match(executable, /status:\s*500/);

  const serviceCall = executable.search(/create(?:ServiceRole)?(?:Admin)?SupabaseClient\(\)/);
  if (serviceCall !== -1) {
    assert.ok(authIndex < serviceCall, routePath + " must authenticate before creating an admin client");
  }
}

const serverAuth = await readFile("src/_app/auth/admin.ts", "utf8");
const proxy = await readFile("proxy.ts", "utf8");
assert.match(serverAuth, /isAdminEmail/);
assert.match(proxy, /isAdminEmail/);

const templateRoute = await readFile("src/_app/api-routes/admin-push-templates.ts", "utf8");
const waitlistRoute = await readFile("src/_app/api-routes/admin-waitlist.ts", "utf8");
assert.equal(templateRoute.includes('rpc("admin_update_push_template"'), true);
assert.equal(templateRoute.includes('.from("push_templates").update'), false);
assert.match(templateRoute, /UUID\.test\(id\)/);
assert.match(templateRoute, /status:\s*404/);
assert.equal(waitlistRoute.includes('rpc("admin_delete_waitlist_entry"'), true);
assert.equal(waitlistRoute.includes('.from("waitlist").delete'), false);
assert.match(waitlistRoute, /UUID\.test\(id\)/);
assert.match(waitlistRoute, /status:\s*404/);

console.log("admin authz fixtures passed");
