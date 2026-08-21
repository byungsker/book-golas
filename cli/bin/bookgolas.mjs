#!/usr/bin/env node
import { boundedInteger, createApiClient, CliError, EXIT_CODES } from "../src/client.mjs";

const HELP = `bookgolas 0.1.0

Read-only agent companion for the Bookgolas Agent API.

Commands:
  capabilities
  books search --query <text>
  library
  progress [--book-id <id>]
  recall [--book-id <id>]
  insights
  entitlement

Environment:
  BOOKGOLAS_API_URL       API origin, default http://127.0.0.1:8787
  BOOKGOLAS_API_TOKEN     Bearer token for authenticated commands
  BOOKGOLAS_TIMEOUT_MS    Per-request timeout, 100-60000 ms
  BOOKGOLAS_MAX_RETRIES   GET retries, 0-3

All successful command output is versioned JSON on stdout. Diagnostics use stderr.
`;

function parseArgs(argv) {
  const values = {};
  const positional = [];
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--help" || value === "-h") values.help = true;
    else if (value === "--api-url") values.apiUrl = argv[++index];
    else if (value === "--query") values.query = argv[++index];
    else if (value === "--book-id") values.bookId = argv[++index];
    else if (value === "--page") values.page = argv[++index];
    else if (value === "--page-size") values.pageSize = argv[++index];
    else if (value === "--token") throw new CliError("Use BOOKGOLAS_API_TOKEN instead of a token argument", "secret_argument_forbidden", EXIT_CODES.usage);
    else if (value.startsWith("--")) throw new CliError(`Unknown option: ${value}`, "unknown_option", EXIT_CODES.usage);
    else positional.push(value);
  }
  values.positional = positional;
  return values;
}

function commandPath(args) {
  const [namespace, action] = args.positional;
  if (namespace === "capabilities" && !action) return { path: "/v1/capabilities", params: {}, auth: false };
  const pagination = {
    page: boundedInteger(args.page, 1, 1, 10_000),
    page_size: boundedInteger(args.pageSize, 20, 1, 100),
  };
  if (namespace === "books" && action === "search") {
    if (!args.query) throw new CliError("--query is required for books search", "missing_argument", EXIT_CODES.usage);
    return { path: "/v1/books/search", params: { q: args.query, ...pagination }, auth: true };
  }
  if (namespace === "library" && !action) return { path: "/v1/library", params: pagination, auth: true };
  if (namespace === "progress" && !action) return { path: "/v1/reading-progress", params: { book_id: args.bookId, ...pagination }, auth: true };
  if (namespace === "recall" && !action) return { path: "/v1/recall", params: { book_id: args.bookId, ...pagination }, auth: true };
  if (namespace === "insights" && !action) return { path: "/v1/insights", params: pagination, auth: true };
  if (namespace === "entitlement" && !action) return { path: "/v1/entitlement", params: {}, auth: true };
  if (["add", "update", "delete", "write"].includes(action) || ["add", "update", "delete", "write"].includes(namespace)) {
    throw new CliError("Write commands are disabled in Bookgolas Agent API 0.1.0", "write_disabled", EXIT_CODES.forbidden);
  }
  throw new CliError("Unknown command; use capabilities or --help", "unknown_command", EXIT_CODES.usage);
}

function writeJson(stream, value) {
  stream.write(`${JSON.stringify(value)}\n`);
}

export async function runCli({ argv = process.argv.slice(2), env = process.env, stdout = process.stdout, stderr = process.stderr, fetchImpl = fetch, sleepImpl } = {}) {
  const cancellation = new AbortController();
  const onSigint = () => cancellation.abort(new DOMException("Request cancelled", "AbortError"));
  process.once("SIGINT", onSigint);
  try {
    const args = parseArgs(argv);
    if (args.help) {
      stdout.write(HELP);
      return EXIT_CODES.ok;
    }
    const command = commandPath(args);
    const token = env.BOOKGOLAS_API_TOKEN?.trim() || undefined;
    if (command.auth && !token) throw new CliError("BOOKGOLAS_API_TOKEN is required for this command", "authentication_required", EXIT_CODES.authentication);
    const client = createApiClient({
      baseUrl: args.apiUrl || env.BOOKGOLAS_API_URL || "http://127.0.0.1:8787",
      token,
      timeoutMs: env.BOOKGOLAS_TIMEOUT_MS || 10_000,
      maxRetries: env.BOOKGOLAS_MAX_RETRIES || 2,
      fetchImpl,
      sleepImpl,
    });
    const body = await client.get(command.path, command.params, cancellation.signal);
    writeJson(stdout, body);
    return EXIT_CODES.ok;
  } catch (error) {
    const cliError = error instanceof CliError
      ? error
      : new CliError("The CLI could not complete the command", "unexpected_error", EXIT_CODES.unexpected);
    writeJson(stdout, { error: { code: cliError.code, message: cliError.message, retryable: cliError.retryable } });
    stderr.write(`bookgolas: ${cliError.code}\n`);
    return cliError.exitCode;
  } finally {
    process.removeListener("SIGINT", onSigint);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const code = await runCli();
  process.exitCode = code;
}
