import test from "node:test";
import assert from "node:assert/strict";
import { TrustEngine } from "../src/trust-engine.js";

const now = Date.parse("2026-10-01T10:30:00.000Z");
const validMessage = {
  id: "message-1",
  recordId: "record-1",
  sourceId: "alpha",
  type: "system_status",
  payload: { status: "nominal" },
  classification: "RESTRICTED",
  timestamp: "2026-10-01T10:20:00.000Z",
  version: 1,
  provenance: "modern:alpha:operator",
  signatureValid: true
};

test("accepts current, signed, authorized data", () => {
  const engine = new TrustEngine({ knownSources: ["alpha"] });
  const result = engine.assess(validMessage, { now, allowedClassification: "SECRET" });
  assert.equal(result.decision, "accept");
  assert.equal(result.score, 100);
});

test("rejects replayed messages even when aggregate attributes are strong", () => {
  const engine = new TrustEngine({ knownSources: ["alpha"] });
  const result = engine.assess(validMessage, {
    now,
    allowedClassification: "SECRET",
    seenMessageIds: new Set(["message-1"])
  });
  assert.equal(result.decision, "reject");
  assert.equal(result.checks.integrity, false);
});

test("rejects data above the receiving node classification", () => {
  const engine = new TrustEngine({ knownSources: ["alpha"] });
  const result = engine.assess(
    { ...validMessage, classification: "SECRET" },
    { now, allowedClassification: "RESTRICTED" }
  );
  assert.equal(result.decision, "reject");
});

test("quarantines stale data for human review", () => {
  const engine = new TrustEngine({ knownSources: ["alpha"] });
  const result = engine.assess(
    { ...validMessage, timestamp: "2026-10-01T09:00:00.000Z" },
    { now, maxAgeMinutes: 30, allowedClassification: "SECRET" }
  );
  assert.equal(result.decision, "quarantine");
  assert.equal(result.checks.freshness, false);
});
