import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  getWaitlistClientIp,
  hashWaitlistClientIp,
  shouldSendWaitlistWelcome,
  toPublicWaitlistResult,
} from "../src/_pages/consumer-landing/api/waitlist-security.ts";

const action = await readFile("src/_pages/consumer-landing/api/joinWaitlist.ts", "utf8");

assert.equal(action.includes("user_agent"), false);
assert.equal(action.includes("{ email, reason"), false);
assert.equal(action.includes('register_waitlist_submission'), true);
assert.equal(action.includes("WAITLIST_IP_HMAC_SECRET"), true);
assert.equal(action.includes('from("waitlist")'), false);
assert.equal(action.includes("toPublicWaitlistResult"), true);
assert.equal(action.includes("shouldSendWaitlistWelcome"), true);
assert.deepEqual(toPublicWaitlistResult("success"), toPublicWaitlistResult("duplicate"));
assert.equal(shouldSendWaitlistWelcome("success"), true);
assert.equal(shouldSendWaitlistWelcome("duplicate"), false);
assert.deepEqual(toPublicWaitlistResult("rate_limited"), { ok: false, code: "unknown" });
assert.equal(getWaitlistClientIp(new Headers({ "x-vercel-forwarded-for": "198.51.100.10" })), "198.51.100.10");
assert.equal(getWaitlistClientIp(new Headers({ "x-forwarded-for": "198.51.100.10" })), null);
assert.equal(getWaitlistClientIp(new Headers({ "x-forwarded-for": "198.51.100.10, 10.0.0.1" })), null);
assert.equal(getWaitlistClientIp(new Headers({ "cf-connecting-ip": "198.51.100.11" })), null);
assert.equal(getWaitlistClientIp(new Headers({ "x-vercel-forwarded-for": "2001:0db8:0:0:0:0:0:1" })), "2001:db8::1");
assert.throws(() => hashWaitlistClientIp("198.51.100.10", "fixture-secret"));
assert.match(hashWaitlistClientIp("198.51.100.10", "fixture-secret-012345678901234567890123"), /^[0-9a-f]{64}$/);

console.log("waitlist security fixtures passed");
