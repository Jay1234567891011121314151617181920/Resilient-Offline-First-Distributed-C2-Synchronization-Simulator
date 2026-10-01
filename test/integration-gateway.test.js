import test from "node:test";
import assert from "node:assert/strict";
import { IntegrationGateway } from "../src/integration-gateway.js";

test("normalizes legacy input into the canonical envelope", () => {
  const gateway = new IntegrationGateway();
  const now = Date.parse("2026-10-01T10:00:00Z");
  const message = gateway.normalize({
    id: "legacy-1",
    recordId: "status-1",
    sourceId: "legacy-7",
    sourceType: "legacy",
    type: "system_status",
    observedAt: "2026-10-01T09:59:00Z",
    classification: "RESTRICTED",
    signatureValid: true,
    payload: { status: "nominal" }
  }, now);
  assert.equal(message.source.systemType, "legacy");
  assert.equal(message.provenance.length, 2);
  assert.equal(message.schema.version, "1.0");
});

test("denies data above the receiver clearance before AI scoring", () => {
  const gateway = new IntegrationGateway();
  const now = Date.parse("2026-10-01T10:00:00Z");
  const message = gateway.normalize({
    id: "secret-1",
    recordId: "status-1",
    sourceId: "modern-alpha",
    sourceType: "modern",
    type: "system_status",
    observedAt: "2026-10-01T09:59:00Z",
    classification: "SECRET",
    signatureValid: true,
    payload: { status: "withheld" }
  }, now);
  const result = gateway.assess(message, {
    clearance: "RESTRICTED",
    releasability: ["DEMO-COALITION"],
    missionIds: ["DEMO-MISSION"]
  }, now);
  assert.equal(result.decision, "reject");
  assert.equal(result.trust, null);
});

test("mock integration demo accepts, quarantines, and rejects independently", async () => {
  const result = await new IntegrationGateway().runDemo();
  assert.equal(result.adapter.officialIntegration, false);
  assert.deepEqual(result.results.map((item) => item.assessment.decision), ["accept", "quarantine", "reject"]);
  assert.equal(result.results[0].acknowledgement.status, "received");
  assert.equal(result.results[1].acknowledgement, null);
});
