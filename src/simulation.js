import { randomUUID } from "node:crypto";
import { TrustEngine } from "./trust-engine.js";

const deepCopy = (value) => structuredClone(value);

export class C2Simulation {
  constructor() {
    this.reset();
  }

  reset() {
    this.clock = Date.now();
    this.eventLog = [];
    this.seenMessageIds = new Set();
    this.canonicalRecords = new Map();
    this.nodes = new Map([
      ["hq", this.makeNode("hq", "Command Hub", "modern", "SECRET")],
      ["alpha", this.makeNode("alpha", "Tactical Alpha", "modern", "CONFIDENTIAL")],
      ["legacy-7", this.makeNode("legacy-7", "Legacy Gateway 7", "legacy", "RESTRICTED")]
    ]);
    this.trustEngine = new TrustEngine({ knownSources: [...this.nodes.keys()] });
    this.seedRecords();
    this.log("simulation", "Simulation reset; all nodes are connected.");
    return this.getState();
  }

  makeNode(id, name, generation, clearance) {
    return {
      id,
      name,
      generation,
      clearance,
      connected: true,
      disconnectedAt: null,
      lastSyncAt: this.clock,
      queue: [],
      localRecords: new Map(),
      syncStats: { sent: 0, accepted: 0, quarantined: 0, rejected: 0, conflicts: 0 }
    };
  }

  seedRecords() {
    const seeds = [
      ["network-health", "system_status", { status: "nominal", latencyMs: 42 }],
      ["supply-status", "logistics", { status: "available", confidence: "confirmed" }],
      ["safety-area-a", "safety_alert", { status: "clear", severity: "low" }]
    ];
    for (const [recordId, type, payload] of seeds) {
      const record = this.makeMessage("hq", recordId, type, payload, "RESTRICTED");
      this.canonicalRecords.set(recordId, record);
      for (const node of this.nodes.values()) node.localRecords.set(recordId, deepCopy(record));
      this.seenMessageIds.add(record.id);
    }
  }

  makeMessage(sourceId, recordId, type, payload, classification = "RESTRICTED", overrides = {}) {
    const node = this.requireNode(sourceId);
    const previous = node.localRecords.get(recordId);
    return {
      id: randomUUID(),
      recordId,
      sourceId,
      sourceGeneration: node.generation,
      type,
      payload,
      classification,
      timestamp: new Date(this.clock).toISOString(),
      version: (previous?.version ?? 0) + 1,
      baseVersion: previous?.version ?? 0,
      provenance: `${node.generation}:${sourceId}:local-sensor-or-operator`,
      signatureValid: true,
      ...overrides
    };
  }

  disconnect(nodeId) {
    const node = this.requireNode(nodeId);
    if (!node.connected) return this.getState();
    node.connected = false;
    node.disconnectedAt = this.clock;
    this.log("connectivity", `${node.name} disconnected; offline-first mode enabled.`, nodeId);
    return this.getState();
  }

  advance(minutes = 1) {
    const safeMinutes = Math.min(24 * 60, Math.max(0, Number(minutes) || 0));
    this.clock += safeMinutes * 60_000;
    this.log("clock", `Simulation advanced by ${safeMinutes} minute(s).`);
    return this.getState();
  }

  submitReport(nodeId, input = {}) {
    const node = this.requireNode(nodeId);
    const message = this.makeMessage(
      nodeId,
      input.recordId ?? `report-${randomUUID().slice(0, 8)}`,
      input.type ?? "situation_report",
      input.payload ?? { status: "observed" },
      input.classification ?? "RESTRICTED",
      input.overrides ?? {}
    );
    node.localRecords.set(message.recordId, deepCopy(message));

    if (node.connected) {
      this.processAtHub(node, message);
    } else {
      node.queue.push(message);
      this.log("queue", `${node.name} queued ${message.recordId} while offline.`, nodeId);
    }
    return { message: deepCopy(message), state: this.getState() };
  }

  reconnect(nodeId) {
    const node = this.requireNode(nodeId);
    node.connected = true;
    const outageMinutes = node.disconnectedAt
      ? Math.round((this.clock - node.disconnectedAt) / 60_000)
      : 0;
    const queued = [...node.queue].sort(
      (a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp)
    );
    node.queue = [];
    const results = queued.map((message) => this.processAtHub(node, message));

    // Delta sync: only records whose version or id differs are copied back.
    let deltas = 0;
    for (const [recordId, record] of this.canonicalRecords) {
      const local = node.localRecords.get(recordId);
      if (!local || local.id !== record.id) {
        node.localRecords.set(recordId, deepCopy(record));
        deltas += 1;
      }
    }
    node.disconnectedAt = null;
    node.lastSyncAt = this.clock;
    this.log(
      "reconnect",
      `${node.name} reconnected after ${outageMinutes} minute(s): ${queued.length} queued, ${deltas} delta(s).`,
      nodeId
    );
    return { outageMinutes, queued: queued.length, deltas, results, state: this.getState() };
  }

  processAtHub(node, message) {
    node.syncStats.sent += 1;
    const current = this.canonicalRecords.get(message.recordId);
    const conflict = Boolean(current && message.baseVersion < current.version && current.id !== message.id);
    const corroboratingSources = [...this.canonicalRecords.values()].filter(
      (record) => record.type === message.type && record.sourceId !== message.sourceId
    ).length;
    const assessment = this.trustEngine.assess(message, {
      now: this.clock,
      maxAgeMinutes: message.type === "safety_alert" ? 10 : 30,
      allowedClassification: "SECRET",
      seenMessageIds: this.seenMessageIds,
      corroboratingSources
    });

    if (conflict && assessment.decision === "accept") {
      assessment.decision = "quarantine";
      assessment.reasons.unshift("Concurrent update conflicts with a newer canonical record");
      assessment.explanation = `QUARANTINE: ${assessment.score}/100. ${assessment.reasons[0]}.`;
      node.syncStats.conflicts += 1;
    }

    node.syncStats[assessment.decision === "accept" ? "accepted" : `${assessment.decision}d`] += 1;
    if (assessment.decision === "accept") {
      this.canonicalRecords.set(message.recordId, deepCopy(message));
      this.seenMessageIds.add(message.id);
      this.replicateToConnectedNodes(message, node.id);
    }
    this.log(
      "trust",
      `${message.recordId}: ${assessment.explanation}`,
      node.id,
      { messageId: message.id, assessment }
    );
    return { messageId: message.id, recordId: message.recordId, conflict, assessment };
  }

  replicateToConnectedNodes(message, sourceId) {
    for (const node of this.nodes.values()) {
      if (node.connected && node.id !== sourceId) {
        node.localRecords.set(message.recordId, deepCopy(message));
        node.lastSyncAt = this.clock;
      }
    }
  }

  runDemo() {
    this.reset();
    this.disconnect("alpha");
    this.advance(5);
    this.submitReport("alpha", {
      recordId: "safety-area-a",
      type: "safety_alert",
      payload: { status: "restricted", severity: "medium" },
      classification: "CONFIDENTIAL"
    });
    this.advance(10);
    this.submitReport("alpha", {
      recordId: "supply-status",
      type: "logistics",
      payload: { status: "limited", confidence: "locally-observed" }
    });
    this.submitReport("legacy-7", {
      recordId: "supply-status",
      type: "logistics",
      payload: { status: "available", confidence: "legacy-feed" }
    });
    this.advance(5);
    return this.reconnect("alpha");
  }

  getState() {
    return {
      clock: new Date(this.clock).toISOString(),
      nodes: [...this.nodes.values()].map((node) => ({
        ...node,
        queuedMessages: node.queue.length,
        records: [...node.localRecords.values()].map(deepCopy),
        queue: undefined,
        localRecords: undefined,
        dataAgeMinutes: Math.round((this.clock - node.lastSyncAt) / 60_000)
      })),
      canonicalRecords: [...this.canonicalRecords.values()].map(deepCopy),
      eventLog: this.eventLog.slice(-40).reverse().map(deepCopy)
    };
  }

  log(kind, message, nodeId = null, detail = null) {
    this.eventLog.push({
      id: randomUUID(),
      timestamp: new Date(this.clock).toISOString(),
      kind,
      nodeId,
      message,
      detail
    });
  }

  requireNode(id) {
    const node = this.nodes.get(id);
    if (!node) throw new Error(`Unknown node: ${id}`);
    return node;
  }
}
