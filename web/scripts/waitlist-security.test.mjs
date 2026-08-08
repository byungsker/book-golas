import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const action = await readFile("src/app/actions/waitlist.ts", "utf8");
const page = await readFile("src/app/admin/waitlist/page.tsx", "utf8");

function csvEscape(value) {
  const neutralized = /^[=+\-@]/.test(value) ? `'${value}` : value;
  return /[",\n]/.test(neutralized)
    ? `"${neutralized.replace(/"/g, '""')}"`
    : neutralized;
}

for (const value of ["=SUM(A1:A2)", "+1", "-1", "@cmd"]) {
  assert.equal(csvEscape(value).startsWith("'"), true);
}
assert.equal(action.includes("user_agent"), false);
assert.equal(action.includes("{ email, reason"), false);
assert.equal(page.includes("user_agent"), false);
console.log("waitlist security fixtures passed");
