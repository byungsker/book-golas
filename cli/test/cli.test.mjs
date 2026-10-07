import test from "node:test";
import assert from "node:assert/strict";
import { runCli } from "../bin/bookgolas.mjs";

function output() {
  const state = { stdout: "", stderr: "" };
  return {
    state,
    stdout: { write(value) { state.stdout += value; } },
    stderr: { write(value) { state.stderr += value; } },
  };
}

function body(data = { items: [] }) {
  return {
    data,
    meta: {
      api_version: "v1",
      contract_version: "0.1.0",
      request_id: "req-cli",
      generated_at: "2026-08-22T00:00:00.000Z",
      pagination: {
        page: 1,
        page_size: 20,
        has_more: false,
        total: 0,
      },
      usage: {
        capability: "library.list",
        units: 1,
        attribution: "authenticated_user",
        ledger: "shared_bookgolas_account",
        provider_cost_incurred: false,
      },
    },
  };
}

test("library calls only the Agent API and emits JSON on stdout", async () => {
  const calls = [];
  const streams = output();
  const code = await runCli({
    argv: ["library", "--page", "2", "--page-size", "5"],
    env: { BOOKGOLAS_API_URL: "https://agent.test", BOOKGOLAS_API_TOKEN: "secret-token" },
    ...streams,
    fetchImpl: async (url, init) => {
      calls.push({ url: String(url), method: init.method, authorization: init.headers.Authorization });
      return new Response(JSON.stringify(body()), { status: 200, headers: { "Content-Type": "application/json" } });
    },
  });
  assert.equal(code, 0);
  assert.deepEqual(calls, [{ url: "https://agent.test/v1/library?page=2&page_size=5", method: "GET", authorization: "Bearer secret-token" }]);
  assert.deepEqual(JSON.parse(streams.state.stdout), body());
  assert.equal(streams.state.stderr, "");
});

test("missing token fails before a data request", async () => {
  const streams = output();
  let called = false;
  const code = await runCli({
    argv: ["library"],
    env: { BOOKGOLAS_API_URL: "https://agent.test" },
    ...streams,
    fetchImpl: async () => {
      called = true;
      return new Response("{}", { status: 200 });
    },
  });
  assert.equal(code, 3);
  assert.equal(called, false);
  assert.equal(JSON.parse(streams.state.stdout).error.code, "authentication_required");
});

test("write commands are rejected without contacting the API", async () => {
  const streams = output();
  let called = false;
  const code = await runCli({
    argv: ["books", "add"],
    env: { BOOKGOLAS_API_TOKEN: "secret-token" },
    ...streams,
    fetchImpl: async () => {
      called = true;
      return new Response("{}", { status: 200 });
    },
  });
  assert.equal(code, 4);
  assert.equal(called, false);
  assert.equal(JSON.parse(streams.state.stdout).error.code, "write_disabled");
});

test("retryable upstream responses use bounded exponential retries", async () => {
  const streams = output();
  const statuses = [503, 200];
  const calls = [];
  const code = await runCli({
    argv: ["capabilities"],
    env: { BOOKGOLAS_API_URL: "https://agent.test", BOOKGOLAS_MAX_RETRIES: "2" },
    ...streams,
    sleepImpl: async () => {},
    fetchImpl: async (url, init) => {
      calls.push({ url: String(url), method: init.method });
      const status = statuses.shift();
      return status === 200 ? new Response(JSON.stringify(body()), { status }) : new Response(JSON.stringify({ error: { code: "upstream_unavailable", message: "retry", retryable: true } }), { status });
    },
  });
  assert.equal(code, 0);
  assert.equal(calls.length, 2);
  assert.equal(calls[0].method, "GET");
});

test("authentication errors retain structured protocol output", async () => {
  const streams = output();
  const code = await runCli({
    argv: ["library"],
    env: { BOOKGOLAS_API_URL: "https://agent.test", BOOKGOLAS_API_TOKEN: "secret-token", BOOKGOLAS_MAX_RETRIES: "0" },
    ...streams,
    fetchImpl: async () => new Response(JSON.stringify({ error: { code: "authentication_required", message: "required", retryable: false } }), { status: 401 }),
  });
  assert.equal(code, 3);
  assert.equal(JSON.parse(streams.state.stdout).error.code, "authentication_required");
  assert.match(streams.state.stderr, /authentication_required/);
});
