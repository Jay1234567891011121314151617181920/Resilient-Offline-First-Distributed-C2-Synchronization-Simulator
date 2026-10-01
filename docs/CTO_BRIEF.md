# CTO review brief

## Purpose

Demonstrate a defensible integration pattern for offline-first C2 data synchronization across disconnected legacy and modern systems. The project is a synthetic research prototype and does not claim access to, endorsement by, or compatibility certification from Thales or HexaForce.

## Five-minute demonstration

1. Run the complete 20-minute partition scenario.
2. Show Tactical Alpha continuing to queue local work while disconnected.
3. Reconnect and inspect delta synchronization and conflict quarantine.
4. Run the integration gateway assessment.
5. Compare its accepted legacy message, quarantined stale message, and classification-rejected message.
6. Open the canonical schema and explain how provenance survives normalization.

## Architecture choices to review

- **Offline first:** local data and a durable outbox preserve useful work during a partition.
- **Policy before AI:** integrity, schema, classification, releasability, and mission assignment are hard gates.
- **Explainable AI:** the feature model recommends accept, quarantine, or reject with evidence.
- **Idempotent reconciliation:** message IDs, acknowledgements, inbox deduplication, and base versions resist replay and split-brain errors.
- **Vendor-neutral boundary:** a replaceable adapter prevents proprietary transport details from contaminating domain logic.
- **Evidence preservation:** normalization appends provenance rather than replacing the original source context.

## Questions for a HexaForce technical review

1. What integration interfaces and transport patterns are available in an authorized sandbox?
2. Which NATO or national information-exchange profiles are used by the target deployment?
3. How are data-centric security labels, releasability, and ABAC attributes encoded?
4. What are the required identity, certificate, signing, key-rotation, and revocation mechanisms?
5. What cursor, acknowledgement, retry, ordering, and conflict semantics must an edge adapter implement?
6. How are legacy transformations registered, versioned, audited, and accredited?
7. Which AI-derived assessments may influence workflow, and which decisions must remain deterministic?
8. What evidence is required for IVVQ, cybersecurity assessment, and interoperability certification?

## Explicit limitations

- The adapter is a mock contract and uses no official HexaForce endpoint.
- Cryptographic fields are synthetic placeholders.
- The default simulation store remains in memory; the JSON ledger is a reference for durable semantics, not an accredited store.
- No classified, operational, targeting, or weapons-control data is supported.
- Production deployment requires vendor documentation, authorized credentials, security engineering, formal IVVQ, and accreditation.
