const REQUIRED_FIELDS = [
  "id",
  "recordId",
  "source",
  "observedAt",
  "receivedAt",
  "classification",
  "schema",
  "version",
  "baseVersion",
  "provenance",
  "integrity",
  "payload"
];

export function validateCanonicalMessage(message) {
  const errors = [];
  for (const field of REQUIRED_FIELDS) {
    if (message?.[field] === undefined || message?.[field] === null) errors.push(`Missing required field: ${field}`);
  }
  if (!message?.source?.systemId) errors.push("Missing source.systemId");
  if (!message?.source?.systemType) errors.push("Missing source.systemType");
  if (!message?.schema?.name || !message?.schema?.version) errors.push("Missing schema identity or version");
  if (!Number.isInteger(message?.version) || message.version < 1) errors.push("version must be a positive integer");
  if (!Number.isInteger(message?.baseVersion) || message.baseVersion < 0) errors.push("baseVersion must be a non-negative integer");
  if (Number.isNaN(Date.parse(message?.observedAt))) errors.push("observedAt must be an ISO-8601 timestamp");
  if (Number.isNaN(Date.parse(message?.receivedAt))) errors.push("receivedAt must be an ISO-8601 timestamp");
  if (!Array.isArray(message?.provenance)) errors.push("provenance must be an array");
  if (typeof message?.payload !== "object" || message.payload === null || Array.isArray(message.payload)) {
    errors.push("payload must be an object");
  }
  return { valid: errors.length === 0, errors };
}

export function toTrustMessage(message) {
  return {
    id: message.id,
    recordId: message.recordId,
    sourceId: message.source.systemId,
    type: message.schema.name,
    payload: message.payload,
    classification: message.classification,
    timestamp: message.observedAt,
    version: message.version,
    baseVersion: message.baseVersion,
    provenance: message.provenance.map((entry) => entry.actor ?? entry.systemId).filter(Boolean).join(" -> "),
    signatureValid: message.integrity.verified === true
  };
}
