import assert from "node:assert/strict";
import { isAiMonitorDemoRequest } from "./ai-monitor-access.ts";

const keys = [
  "NODE_ENV",
  "AI_MONITOR_LOCAL_DEMO",
  "VERCEL_ENV",
  "AI_MONITOR_PREVIEW_DEMO",
  "VERCEL_URL",
] as const;
const previous = new Map(keys.map((key) => [key, process.env[key]]));

try {
  process.env.NODE_ENV = "development";
  process.env.AI_MONITOR_LOCAL_DEMO = "true";
  delete process.env.VERCEL_ENV;
  delete process.env.AI_MONITOR_PREVIEW_DEMO;
  delete process.env.VERCEL_URL;

  assert.equal(isAiMonitorDemoRequest("127.0.0.1:3100"), true);
  assert.equal(isAiMonitorDemoRequest("[::1]:3100"), true);
  assert.equal(isAiMonitorDemoRequest("192.0.2.10:3100"), false);

  process.env.NODE_ENV = "production";
  process.env.VERCEL_ENV = "preview";
  process.env.AI_MONITOR_PREVIEW_DEMO = "true";
  process.env.VERCEL_URL = "book-golas-preview.vercel.app";

  assert.equal(isAiMonitorDemoRequest("book-golas-preview.vercel.app"), true);
  assert.equal(isAiMonitorDemoRequest("book-golas-preview.vercel.app:443"), true);
  assert.equal(isAiMonitorDemoRequest("spoofed.example.com"), false);

  process.env.VERCEL_ENV = "production";
  assert.equal(isAiMonitorDemoRequest("book-golas-preview.vercel.app"), false);
} finally {
  for (const key of keys) {
    const value = previous.get(key);
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

console.log("AI monitor access contract passed");
