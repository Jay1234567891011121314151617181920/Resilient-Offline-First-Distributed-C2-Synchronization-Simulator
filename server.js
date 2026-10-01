import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { C2Simulation } from "./src/simulation.js";
import { IntegrationGateway } from "./src/integration-gateway.js";

const ROOT = fileURLToPath(new URL(".", import.meta.url));
const PUBLIC = join(ROOT, "public");
const PORT = Number(process.env.PORT) || 3000;
const simulation = new C2Simulation();
const integrationProfile = Object.freeze({
  mode: "vendor-neutral mock",
  officialHexaForceConnection: false,
  contractVersion: "1.0",
  controls: [
    "Canonical message envelope",
    "Classification and releasability ABAC",
    "Provenance preservation",
    "Explainable trust assessment",
    "Idempotent acknowledgement",
    "Durable inbox/outbox reference implementation"
  ],
  nextDependency: "Authorized vendor API, schemas, credentials, and sandbox"
});

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml"
};

function sendJson(res, status, value) {
  const body = JSON.stringify(value);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(body),
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    "content-security-policy": "default-src 'none'; frame-ancestors 'none'"
  });
  res.end(body);
  return true;
}

async function bodyJson(req) {
  let body = "";
  for await (const chunk of req) {
    body += chunk;
    if (body.length > 64_000) throw new Error("Request body too large");
  }
  return body ? JSON.parse(body) : {};
}

async function routeApi(req, res, url) {
  if (req.method === "GET" && url.pathname === "/api/state") {
    return sendJson(res, 200, simulation.getState());
  }
  if (req.method === "GET" && url.pathname === "/api/integration/profile") {
    return sendJson(res, 200, integrationProfile);
  }
  if (req.method !== "POST") return false;
  const body = await bodyJson(req);
  if (url.pathname === "/api/reset") return sendJson(res, 200, simulation.reset());
  if (url.pathname === "/api/demo") return sendJson(res, 200, simulation.runDemo());
  if (url.pathname === "/api/integration/demo") {
    return sendJson(res, 200, await new IntegrationGateway().runDemo());
  }
  if (url.pathname === "/api/advance") return sendJson(res, 200, simulation.advance(body.minutes));

  const match = url.pathname.match(/^\/api\/nodes\/([a-z0-9-]+)\/(disconnect|reconnect|report)$/);
  if (!match) return false;
  const [, nodeId, action] = match;
  if (action === "disconnect") return sendJson(res, 200, simulation.disconnect(nodeId));
  if (action === "reconnect") return sendJson(res, 200, simulation.reconnect(nodeId));
  return sendJson(res, 201, simulation.submitReport(nodeId, body));
}

async function serveStatic(req, res, url) {
  if (req.method !== "GET" && req.method !== "HEAD") return false;
  const pathname = url.pathname === "/" ? "/index.html" : url.pathname;
  const resolved = normalize(join(PUBLIC, pathname));
  if (!resolved.startsWith(PUBLIC)) return false;
  try {
    const data = await readFile(resolved);
    res.writeHead(200, {
      "content-type": MIME[extname(resolved)] ?? "application/octet-stream",
      "content-length": data.length,
      "x-content-type-options": "nosniff",
      "referrer-policy": "no-referrer",
      "content-security-policy": "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'"
    });
    if (req.method === "HEAD") res.end();
    else res.end(data);
    return true;
  } catch {
    return false;
  }
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host ?? "localhost"}`);
    if (url.pathname.startsWith("/api/")) {
      if (await routeApi(req, res, url)) return;
    } else if (await serveStatic(req, res, url)) return;
    sendJson(res, 404, { error: "Not found" });
  } catch (error) {
    const status = error instanceof SyntaxError ? 400 : 422;
    sendJson(res, status, { error: error.message });
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Resilient C2 Sync Lab running at http://127.0.0.1:${PORT}`);
});
