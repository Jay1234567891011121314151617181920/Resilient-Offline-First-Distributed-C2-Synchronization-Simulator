import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { JsonMessageLedger } from "../src/persistence/json-message-ledger.js";

test("persists outbox messages until acknowledgement", async () => {
  const directory = await mkdtemp(join(tmpdir(), "c2-ledger-"));
  const path = join(directory, "ledger.json");
  const ledger = await new JsonMessageLedger(path).open();
  await ledger.enqueue({ id: "message-1", payload: { status: "offline" } });
  assert.equal(ledger.pending().length, 1);
  await ledger.markAcknowledged("message-1", { status: "received" });
  assert.equal(ledger.pending().length, 0);
  const disk = JSON.parse(await readFile(path, "utf8"));
  assert.equal(disk.outbox[0].status, "acknowledged");
  assert.equal(disk.audit.length, 2);
});
