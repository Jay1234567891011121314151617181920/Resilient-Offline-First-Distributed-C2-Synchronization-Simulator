import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

export class JsonMessageLedger {
  constructor(filePath) {
    this.filePath = filePath;
    this.state = { outbox: [], inbox: [], quarantine: [], audit: [] };
  }

  async open() {
    try {
      this.state = JSON.parse(await readFile(this.filePath, "utf8"));
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
      await this.persist();
    }
    return this;
  }

  async enqueue(message) {
    if (!this.state.outbox.some((item) => item.message.id === message.id)) {
      this.state.outbox.push({ message: structuredClone(message), status: "pending", ack: null });
      await this.audit("outbox.enqueued", message.id);
    }
    return this.pending();
  }

  async markAcknowledged(messageId, ack) {
    const item = this.state.outbox.find((entry) => entry.message.id === messageId);
    if (!item) throw new Error(`Unknown outbox message: ${messageId}`);
    item.status = "acknowledged";
    item.ack = structuredClone(ack);
    await this.audit("outbox.acknowledged", messageId);
  }

  async recordInbox(messageId, decision) {
    if (!this.hasInbox(messageId)) {
      this.state.inbox.push({ messageId, decision: structuredClone(decision), processedAt: new Date().toISOString() });
      await this.audit("inbox.processed", messageId);
    }
  }

  async quarantine(message, decision) {
    this.state.quarantine.push({ message: structuredClone(message), decision: structuredClone(decision) });
    await this.audit("message.quarantined", message.id);
  }

  hasInbox(messageId) {
    return this.state.inbox.some((entry) => entry.messageId === messageId);
  }

  pending() {
    return this.state.outbox
      .filter((entry) => entry.status === "pending")
      .map((entry) => structuredClone(entry));
  }

  async audit(event, messageId) {
    this.state.audit.push({ event, messageId, timestamp: new Date().toISOString() });
    await this.persist();
  }

  async persist() {
    await mkdir(dirname(this.filePath), { recursive: true });
    const temporaryPath = `${this.filePath}.tmp`;
    await writeFile(temporaryPath, JSON.stringify(this.state, null, 2), "utf8");
    await rename(temporaryPath, this.filePath);
  }
}
