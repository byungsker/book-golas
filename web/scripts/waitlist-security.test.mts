import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { csvEscape } from "../src/lib/csv.ts";
import { getWaitlistClientIp, hashWaitlistClientIp } from "../src/lib/waitlist-security.ts";

const action = await readFile("src/app/actions/waitlist.ts", "utf8");
const page = await readFile("src/app/admin/waitlist/page.tsx", "utf8");

for (const value of ["=SUM(A1:A2)", "+1", "-1", "@cmd", " \t=SUM(A1:A2)", "\u0000@cmd"]) {
  assert.equal(csvEscape(value).startsWith("'"), true);
}
assert.equal(csvEscape('hello,"world"'), '"hello,""world"""');
assert.equal(action.includes("user_agent"), false);
assert.equal(action.includes("{ email, reason"), false);
assert.equal(action.includes('register_waitlist_submission'), true);
assert.equal(action.includes("WAITLIST_IP_HMAC_SECRET"), true);
assert.equal(action.includes('from("waitlist")'), false);
assert.equal(getWaitlistClientIp(new Headers({ "x-forwarded-for": "198.51.100.10, 10.0.0.1" })), "198.51.100.10");
assert.equal(getWaitlistClientIp(new Headers({ "x-real-ip": "198.51.100.11" })), "198.51.100.11");
assert.match(hashWaitlistClientIp("198.51.100.10", "fixture-secret"), /^[0-9a-f]{64}$/);
assert.equal(page.includes("csvEscape"), true);
console.log("waitlist security fixtures passed");
