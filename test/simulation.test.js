import test from "node:test";
import assert from "node:assert/strict";
import { C2Simulation } from "../src/simulation.js";

test("queues offline reports and synchronizes on reconnect", () => {
  const sim = new C2Simulation();
  sim.disconnect("alpha");
  sim.advance(5);
  sim.submitReport("alpha", {
    recordId: "alpha-observation",
    type: "system_status",
    payload: { status: "degraded" }
  });
  sim.advance(15);
  const before = sim.getState().nodes.find((node) => node.id === "alpha");
  assert.equal(before.queuedMessages, 1);
  assert.equal(before.connected, false);

  const result = sim.reconnect("alpha");
  assert.equal(result.outageMinutes, 20);
  assert.equal(result.queued, 1);
  assert.equal(result.results[0].assessment.decision, "accept");
  assert.equal(sim.getState().canonicalRecords.some((r) => r.recordId === "alpha-observation"), true);
});

test("quarantines a concurrent stale-base conflict", () => {
  const sim = new C2Simulation();
  sim.disconnect("alpha");
  sim.submitReport("alpha", {
    recordId: "supply-status",
    type: "logistics",
    payload: { status: "limited" }
  });
  sim.submitReport("legacy-7", {
    recordId: "supply-status",
    type: "logistics",
    payload: { status: "available" }
  });
  const result = sim.reconnect("alpha");
  assert.equal(result.results[0].conflict, true);
  assert.equal(result.results[0].assessment.decision, "quarantine");
});

test("complete demo models a 20-minute outage", () => {
  const sim = new C2Simulation();
  const result = sim.runDemo();
  assert.equal(result.outageMinutes, 20);
  assert.equal(result.queued, 2);
});
