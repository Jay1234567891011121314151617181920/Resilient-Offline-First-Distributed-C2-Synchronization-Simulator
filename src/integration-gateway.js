import { randomUUID } from "node:crypto";
import { TrustEngine } from "./trust-engine.js";
import { AuthorizationPolicy } from "./policy/authorization-policy.js";
import { toTrustMessage, validateCanonicalMessage } from "./schemas/canonical-message.js";
import { MockHexaForceAdapter } from "./adapters/mock-hexaforce-adapter.js";

export class IntegrationGateway {
  constructor() {
    this.adapter = new MockHexaForceAdapter();
    this.policy = new AuthorizationPolicy();
    this.trust = new TrustEngine({ knownSources: ["legacy-7", "modern-alpha", "gateway-01"] });
    this.seen = new Set();
  }

  normalize(sourceEvent, now = Date.now()) {
    return {
      id: sourceEvent.id ?? randomUUID(),
      recordId: sourceEvent.recordId,
      missionId: sourceEvent.missionId ?? "DEMO-MISSION",
      source: {
        systemId: sourceEvent.sourceId,
        systemType: sourceEvent.sourceType,
        adapterId: sourceEvent.adapterId ?? "gateway-01"
      },
      observedAt: sourceEvent.observedAt,
      receivedAt: new Date(now).toISOString(),
      classification: sourceEvent.classification,
      releasability: sourceEvent.releasability ?? ["DEMO-COALITION"],
      schema: { name: sourceEvent.type, version: sourceEvent.schemaVersion ?? "1.0" },
      version: sourceEvent.version ?? 1,
      baseVersion: sourceEvent.baseVersion ?? 0,
      provenance: [
        { actor: sourceEvent.sourceId, action: "observed", at: sourceEvent.observedAt },
        { actor: sourceEvent.adapterId ?? "gateway-01", action: "normalized", at: new Date(now).toISOString() }
      ],
      integrity: {
        algorithm: "DEMO-SIGNATURE",
        keyId: `${sourceEvent.sourceId}-demo-key`,
        signature: "synthetic-not-cryptographic",
        verified: sourceEvent.signatureValid === true
      },
      payload: sourceEvent.payload
    };
  }

  assess(message, receiver, now = Date.now()) {
    const schema = validateCanonicalMessage(message);
    const policy = this.policy.evaluate(message, receiver);
    if (!schema.valid || policy.decision === "deny") {
      return {
        decision: "reject",
        schema,
        policy,
        trust: null,
        explanation: schema.valid ? policy.reasons[0] : schema.errors[0]
      };
    }
    const trust = this.trust.assess(toTrustMessage(message), {
      now,
      allowedClassification: receiver.clearance,
      seenMessageIds: this.seen,
      corroboratingSources: 0
    });
    if (trust.decision === "accept") this.seen.add(message.id);
    return { decision: trust.decision, schema, policy, trust, explanation: trust.explanation };
  }

  async runDemo() {
    const now = Date.now();
    await this.adapter.connect();
    await this.adapter.authenticate({ approvedTestIdentity: true });
    const receiver = {
      id: "demo-hub",
      clearance: "CONFIDENTIAL",
      releasability: ["DEMO-COALITION"],
      missionIds: ["DEMO-MISSION"]
    };
    const sourceEvents = [
      {
        id: "legacy-valid-1",
        recordId: "network-health",
        sourceId: "legacy-7",
        sourceType: "legacy",
        type: "system_status",
        observedAt: new Date(now - 5 * 60_000).toISOString(),
        classification: "RESTRICTED",
        signatureValid: true,
        payload: { status: "degraded", normalizedUnits: true }
      },
      {
        id: "modern-stale-1",
        recordId: "supply-status",
        sourceId: "modern-alpha",
        sourceType: "modern",
        type: "logistics",
        observedAt: new Date(now - 50 * 60_000).toISOString(),
        classification: "CONFIDENTIAL",
        signatureValid: true,
        payload: { status: "limited" }
      },
      {
        id: "classification-denied-1",
        recordId: "restricted-record",
        sourceId: "modern-alpha",
        sourceType: "modern",
        type: "system_status",
        observedAt: new Date(now - 2 * 60_000).toISOString(),
        classification: "SECRET",
        signatureValid: true,
        payload: { status: "withheld" }
      }
    ];
    const results = [];
    for (const event of sourceEvents) {
      const message = this.normalize(event, now);
      const assessment = this.assess(message, receiver, now);
      let acknowledgement = null;
      if (assessment.decision === "accept") acknowledgement = await this.adapter.publish(message);
      results.push({ message, assessment, acknowledgement });
    }
    return { adapter: await this.adapter.health(), receiver, results };
  }
}
