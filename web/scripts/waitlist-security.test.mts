import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { csvEscape } from "../src/lib/csv.ts";

const action = await readFile("src/app/actions/waitlist.ts", "utf8");
const page = await readFile("src/app/admin/waitlist/page.tsx", "utf8");

for (const value of ["=SUM(A1:A2)", "+1", "-1", "@cmd", " \t=SUM(A1:A2)", "\u0000@cmd"]) {
  assert.equal(csvEscape(value).startsWith("'"), true);
}
assert.equal(csvEscape('hello,"world"'), '"hello,""world"""');
assert.equal(action.includes("user_agent"), false);
assert.equal(action.includes("{ email, reason"), false);
assert.equal(page.includes("csvEscape"), true);
console.log("waitlist security fixtures passed");
