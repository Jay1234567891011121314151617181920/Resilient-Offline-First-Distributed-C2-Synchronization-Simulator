const CLASSIFICATION_LEVELS = Object.freeze({
  UNCLASSIFIED: 0,
  RESTRICTED: 1,
  CONFIDENTIAL: 2,
  SECRET: 3
});

const DEFAULT_WEIGHTS = Object.freeze({
  integrity: 30,
  provenance: 20,
  freshness: 20,
  classification: 15,
  schema: 10,
  corroboration: 5
});

export class TrustEngine {
  constructor({ knownSources = [], weights = DEFAULT_WEIGHTS } = {}) {
    this.knownSources = new Set(knownSources);
    this.weights = weights;
  }

  assess(message, context = {}) {
    const now = context.now ?? Date.now();
    const maxAgeMinutes = context.maxAgeMinutes ?? 30;
    const allowedClassification = context.allowedClassification ?? "SECRET";
    const seenMessageIds = context.seenMessageIds ?? new Set();
    const corroboratingSources = context.corroboratingSources ?? 0;
    const ageMinutes = Math.max(0, (now - Date.parse(message.timestamp)) / 60_000);
    const reasons = [];

    const checks = {
      integrity: message.signatureValid === true && !seenMessageIds.has(message.id),
      provenance: this.knownSources.has(message.sourceId) && Boolean(message.provenance),
      freshness: Number.isFinite(ageMinutes) && ageMinutes <= maxAgeMinutes,
      classification:
        CLASSIFICATION_LEVELS[message.classification] !== undefined &&
        CLASSIFICATION_LEVELS[message.classification] <= CLASSIFICATION_LEVELS[allowedClassification],
      schema:
        typeof message.payload === "object" &&
        message.payload !== null &&
        typeof message.type === "string" &&
        typeof message.version === "number",
      corroboration: corroboratingSources > 0 || message.type === "system_status"
    };

    if (!checks.integrity) reasons.push("Integrity or replay check failed");
    if (!checks.provenance) reasons.push("Source identity or provenance is not trusted");
    if (!checks.freshness) reasons.push(`Data is stale (${ageMinutes.toFixed(1)} minutes old)`);
    if (!checks.classification) reasons.push("Classification exceeds the receiving node's clearance");
    if (!checks.schema) reasons.push("Payload does not satisfy the canonical data contract");
    if (!checks.corroboration) reasons.push("No independent corroboration is available");

    const score = Math.round(
      Object.entries(checks).reduce(
        (total, [name, passed]) => total + (passed ? this.weights[name] : 0),
        0
      )
    );

    // Hard safety gates cannot be outweighed by a high aggregate score.
    let decision = "accept";
    if (!checks.integrity || !checks.classification || !checks.schema) decision = "reject";
    else if (score < 80 || !checks.freshness || !checks.provenance) decision = "quarantine";

    return {
      score,
      decision,
      checks,
      reasons: reasons.length ? reasons : ["All trust and usability controls passed"],
      ageMinutes: Number(ageMinutes.toFixed(1)),
      explanation: `${decision.toUpperCase()}: ${score}/100. ${
        reasons[0] ?? "All trust and usability controls passed"
      }.`
    };
  }
}

export { CLASSIFICATION_LEVELS, DEFAULT_WEIGHTS };
