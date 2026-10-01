# Integration guide

## Boundary

The integration gateway separates external-system concerns from C2 synchronization and trust logic. `ExternalC2Adapter` defines the minimum connector lifecycle: connect, authenticate, publish, acknowledge, fetch changes, and report health.

`MockHexaForceAdapter` exists only to exercise that lifecycle. Replace it after receiving authorized vendor documentation; do not infer a production interface from the mock.

## Inbound processing

1. Receive the source event through a system-specific adapter.
2. Preserve the source event and calculate its evidence hash in a production implementation.
3. Normalize it into `canonical-message.schema.json`.
4. Append the adapter transformation to the provenance chain.
5. Verify schema, identity, integrity, sequence, and replay metadata.
6. Evaluate classification, releasability, and mission-based authorization.
7. Run the explainable trust model only after mandatory policy succeeds.
8. Accept, quarantine, or reject and record the reason.

## Outbound processing

1. Commit the local change and an outbox entry in one transaction.
2. Publish only when the adapter is authenticated.
3. Use the message ID as the idempotency key.
4. Store the remote acknowledgement before retiring the outbox entry.
5. Retry with bounded exponential backoff and jitter.
6. Never interpret network timeout as a confirmed rejection or acceptance.

## Durable ledger

`JsonMessageLedger` demonstrates atomic-file persistence for local development:

- Pending outbox entries survive process restart.
- Acknowledgements are stored with the corresponding message.
- Inbox decisions prevent duplicate processing.
- Quarantined messages retain their decision evidence.
- Audit events record each state transition.

For deployment, replace this implementation with an approved encrypted transactional store and hardware-backed key management.

## Configuration required for a real adapter

Keep all credentials out of the repository. The authorized adapter will require deployment-specific values such as endpoint, trust anchors, client identity, supported schema versions, classification policy bundle, retry limits, and audit destination.
