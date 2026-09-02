import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const pagePaths = [
  "src/app/admin/page.tsx",
  "src/app/admin/announcements/page.tsx",
  "src/app/admin/push-logs/page.tsx",
  "src/app/admin/push-templates/page.tsx",
  "src/app/admin/test-push/page.tsx",
  "src/app/admin/waitlist/page.tsx",
];

for (const path of pagePaths) {
  const source = await readFile(path, "utf8");
  assert.equal(source.includes(".from(\""), false, `${path} must not query Supabase from the browser`);
}

const routes = [
  "src/app/api/admin/announcements/route.ts",
  "src/app/api/admin/push-logs/route.ts",
  "src/app/api/admin/push-templates/route.ts",
  "src/app/api/admin/waitlist/route.ts",
];

const serverAuth = await readFile("src/lib/supabase-server.ts", "utf8");
const proxy = await readFile("src/proxy.ts", "utf8");
assert.match(serverAuth, /requireAdminUser\(\): Promise<AdminUser \| null>\s*\{\s*return null;/s);
assert.doesNotMatch(serverAuth, /admin.?email/i);
assert.match(proxy, /admin_disabled/);
assert.doesNotMatch(proxy, /admin.?email/i);

for (const path of routes) {
  const source = await readFile(path, "utf8");
  const executable = source.replace(/^import .*?;$/gm, "");
  const authIndex = executable.indexOf("requireAdminUser");
  const serviceIndex = executable.indexOf("createServiceRoleSupabaseClient()");
  assert.notEqual(authIndex, -1, `${path} must invoke requireAdminUser`);
  assert.notEqual(serviceIndex, -1, `${path} must use the server service-role boundary`);
  assert.ok(authIndex < serviceIndex, `${path} must establish auth before the service-role client`);
  assert.match(executable, /status:\s*401/);
  assert.match(executable, /status:\s*500/);
}

const templateRoute = await readFile("src/app/api/admin/push-templates/route.ts", "utf8");
const waitlistRoute = await readFile("src/app/api/admin/waitlist/route.ts", "utf8");
assert.equal(templateRoute.includes('rpc("admin_update_push_template"'), true);
assert.equal(templateRoute.includes('.from("push_templates").update'), false);
assert.match(templateRoute, /UUID\.test\(id\)/);
assert.match(templateRoute, /status:\s*404/);
assert.equal(waitlistRoute.includes('rpc("admin_delete_waitlist_entry"'), true);
assert.equal(waitlistRoute.includes('.from("waitlist").delete'), false);
assert.match(waitlistRoute, /UUID\.test\(id\)/);
assert.match(waitlistRoute, /status:\s*404/);

console.log("admin authz fixtures passed");
