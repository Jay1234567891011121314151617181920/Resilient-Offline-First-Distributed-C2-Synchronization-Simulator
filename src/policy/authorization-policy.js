const LEVELS = Object.freeze({
  UNCLASSIFIED: 0,
  RESTRICTED: 1,
  CONFIDENTIAL: 2,
  SECRET: 3
});

export class AuthorizationPolicy {
  evaluate(message, receiver) {
    const reasons = [];
    const messageLevel = LEVELS[message.classification];
    const clearanceLevel = LEVELS[receiver.clearance];

    if (messageLevel === undefined) reasons.push("Unknown data classification");
    if (clearanceLevel === undefined) reasons.push("Unknown receiver clearance");
    if (messageLevel !== undefined && clearanceLevel !== undefined && messageLevel > clearanceLevel) {
      reasons.push("Data classification exceeds receiver clearance");
    }

    const releasability = message.releasability ?? [];
    const receiverGroups = new Set(receiver.releasability ?? []);
    if (releasability.length > 0 && !releasability.some((group) => receiverGroups.has(group))) {
      reasons.push("Receiver is outside the permitted releasability groups");
    }

    if (message.missionId && receiver.missionIds && !receiver.missionIds.includes(message.missionId)) {
      reasons.push("Receiver is not assigned to the message mission context");
    }

    return {
      decision: reasons.length === 0 ? "permit" : "deny",
      reasons: reasons.length ? reasons : ["Classification, releasability, and mission attributes permit access"]
    };
  }
}

export { LEVELS };
