export class ExternalC2Adapter {
  constructor(name) {
    if (new.target === ExternalC2Adapter) throw new Error("ExternalC2Adapter is abstract");
    this.name = name;
  }

  async connect() { throw new Error("connect() is not implemented"); }
  async disconnect() { throw new Error("disconnect() is not implemented"); }
  async authenticate() { throw new Error("authenticate() is not implemented"); }
  async publish(_message) { throw new Error("publish() is not implemented"); }
  async acknowledge(_messageId) { throw new Error("acknowledge() is not implemented"); }
  async receiveChanges(_cursor) { throw new Error("receiveChanges() is not implemented"); }
  async health() { throw new Error("health() is not implemented"); }
}
