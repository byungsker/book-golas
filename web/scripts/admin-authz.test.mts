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

for (const path of routes) {
  const source = await readFile(path, "utf8");
  const authIndex = source.indexOf("requireAdminUser");
  const serviceIndex = source.indexOf("createServiceRoleSupabaseClient()");
  assert.notEqual(authIndex, -1, `${path} must require an admin user`);
  assert.notEqual(serviceIndex, -1, `${path} must use the server service-role boundary`);
  assert.ok(authIndex < serviceIndex, `${path} must establish auth before the service-role client`);
}

const templateRoute = await readFile("src/app/api/admin/push-templates/route.ts", "utf8");
const waitlistRoute = await readFile("src/app/api/admin/waitlist/route.ts", "utf8");
assert.equal(templateRoute.includes('rpc("admin_update_push_template"'), true);
assert.equal(templateRoute.includes('.from("push_templates").update'), false);
assert.equal(waitlistRoute.includes('rpc("admin_delete_waitlist_entry"'), true);
assert.equal(waitlistRoute.includes('.from("waitlist").delete'), false);

console.log("admin authz fixtures passed");
