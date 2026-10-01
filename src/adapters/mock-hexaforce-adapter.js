import { randomUUID } from "node:crypto";
import { ExternalC2Adapter } from "./external-c2-adapter.js";

// Contract demonstrator only. This class does not use or claim an official HexaForce API.
export class MockHexaForceAdapter extends ExternalC2Adapter {
  constructor() {
    super("Mock HexaForce integration boundary");
    this.connected = false;
    this.authenticated = false;
    this.outbound = [];
    this.inbound = [];
    this.acknowledged = new Set();
    this.cursor = 0;
  }

  async connect() {
    this.connected = true;
    return this.health();
  }

  async disconnect() {
    this.connected = false;
    this.authenticated = false;
    return this.health();
  }

  async authenticate(credentials = {}) {
    if (!this.connected) throw new Error("Adapter is offline");
    if (credentials.approvedTestIdentity !== true) throw new Error("Approved test identity required");
    this.authenticated = true;
    return { authenticated: true, sessionId: `mock-${randomUUID()}` };
  }

  async publish(message) {
    this.requireReady();
    if (this.outbound.some((entry) => entry.message.id === message.id)) {
      return this.outbound.find((entry) => entry.message.id === message.id).ack;
    }
    const ack = {
      messageId: message.id,
      status: "received",
      receiptId: randomUUID(),
      receivedAt: new Date().toISOString()
    };
    this.outbound.push({ message: structuredClone(message), ack });
    return structuredClone(ack);
  }

  async acknowledge(messageId) {
    this.requireReady();
    this.acknowledged.add(messageId);
    return { messageId, acknowledged: true };
  }

  async receiveChanges(cursor = 0) {
    this.requireReady();
    const safeCursor = Math.max(0, Number(cursor) || 0);
    return {
      cursor: this.inbound.length,
      changes: this.inbound.slice(safeCursor).map((message) => structuredClone(message))
    };
  }

  injectSyntheticChange(message) {
    this.inbound.push(structuredClone(message));
    this.cursor = this.inbound.length;
  }

  async health() {
    return {
      name: this.name,
      connected: this.connected,
      authenticated: this.authenticated,
      contract: "vendor-neutral mock",
      officialIntegration: false
    };
  }

  requireReady() {
    if (!this.connected || !this.authenticated) throw new Error("Adapter must be connected and authenticated");
  }
}
