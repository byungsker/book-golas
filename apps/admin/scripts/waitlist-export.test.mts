import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { csvEscape } from "../src/shared/lib/csv.ts";

const page = await readFile("src/_pages/admin-waitlist/ui/AdminWaitlistPage.tsx", "utf8");

for (const value of ["=SUM(A1:A2)", "+1", "-1", "@cmd", " \t=SUM(A1:A2)", "\u0000@cmd"]) {
  assert.equal(csvEscape(value).startsWith("'"), true);
}
assert.equal(csvEscape('hello,"world"'), '"hello,""world"""');
assert.match(page, /csvEscape/);

console.log("waitlist export fixtures passed");
