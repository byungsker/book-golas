import http from "node:http";

const hostname = "127.0.0.1";
const port = 54329;
const now = "2026-09-16T00:00:00.000Z";
const userId = "00000000-0000-4000-8000-000000004240";

function base64Url(value) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

const accessToken = `${base64Url({ alg: "HS256", typ: "JWT" })}.${base64Url({
  aud: "authenticated",
  email: "oauth-reader@local.invalid",
  exp: 1893456000,
  role: "authenticated",
  sub: userId,
})}.fixture`;

function sendJson(response, body, status = 200) {
  response.writeHead(status, {
    "access-control-allow-origin": "*",
    "access-control-allow-headers": "authorization, apikey, content-type, x-client-info",
    "access-control-allow-methods": "GET, POST, PATCH, PUT, DELETE, OPTIONS",
    "content-type": "application/json",
  });
  response.end(JSON.stringify(body));
}

function session() {
  return {
    access_token: accessToken,
    token_type: "bearer",
    expires_in: 3600,
    expires_at: 1893456000,
    refresh_token: "oauth-fixture-refresh-token",
    user: {
      id: userId,
      aud: "authenticated",
      role: "authenticated",
      email: "oauth-reader@local.invalid",
      email_confirmed_at: now,
      confirmed_at: now,
      last_sign_in_at: now,
      app_metadata: { provider: "google", providers: ["google", "apple"] },
      user_metadata: { name: "OAuth Reader" },
      identities: [],
      created_at: now,
      updated_at: now,
      is_anonymous: false,
    },
  };
}

const server = http.createServer((request, response) => {
  const url = new URL(request.url ?? "/", `http://${hostname}:${port}`);
  if (request.method === "OPTIONS") {
    sendJson(response, {});
    return;
  }
  if (url.pathname === "/health") {
    sendJson(response, { ready: true });
    return;
  }
  if (url.pathname === "/auth/v1/authorize") {
    const provider = url.searchParams.get("provider");
    const redirectTo = url.searchParams.get("redirect_to");
    const challenge = url.searchParams.get("code_challenge");
    if (!["google", "apple"].includes(provider ?? "") || !redirectTo || !challenge) {
      sendJson(response, { error: "invalid fixture authorization request" }, 400);
      return;
    }
    const callback = new URL(redirectTo);
    callback.searchParams.set("code", `fixture-${provider}-success`);
    response.writeHead(302, { location: callback.toString() });
    response.end();
    return;
  }
  if (url.pathname === "/auth/v1/token") {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
    });
    request.on("end", () => {
      const parsed = JSON.parse(body || "{}");
      if (!String(parsed.auth_code ?? "").startsWith("fixture-")) {
        sendJson(response, { code: "bad_code_verifier", msg: "invalid authorization code" }, 400);
        return;
      }
      sendJson(response, session());
    });
    return;
  }
  if (url.pathname.startsWith("/rest/v1/")) {
    sendJson(response, []);
    return;
  }
  sendJson(response, {});
});

server.listen(port, hostname);

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
