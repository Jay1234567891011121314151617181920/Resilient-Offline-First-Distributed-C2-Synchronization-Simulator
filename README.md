# Resilient C2 Sync Lab

A defensive research prototype that demonstrates how an offline-first distributed command-and-control application behaves when a tactical node loses connectivity for 20 minutes and later reconnects.

The project uses synthetic, non-operational data. It does not control weapons, target systems, or real infrastructure.

## What the project demonstrates

- Local continuity while disconnected, with visibly aging data.
- Durable store-and-forward queues for locally created reports.
- Delta synchronization instead of complete database replacement.
- Concurrent-update detection using record and base versions.
- Replay and duplicate resistance using unique message identifiers.
- Explainable accept, quarantine, and reject decisions.
- Interoperability metadata for legacy and modern sources.
- A complete, repeatable 20-minute network-partition scenario.
- A vendor-neutral external C2 adapter contract and clearly labelled mock HexaForce boundary.
- A canonical interoperability envelope with classification, releasability, provenance, schema, and integrity metadata.
- ABAC policy enforcement before AI-assisted trust scoring.
- An atomic JSON inbox/outbox ledger reference for disconnected delivery semantics.

## Research question: can arriving data be used?

An AI-enabled distributed system should not treat "AI confidence" as proof. This prototype uses an interpretable trust model and non-bypassable policy gates to determine whether data from disconnected legacy and modern systems is trustworthy, current, appropriately classified, and usable.

| Dimension | Evidence used | Prototype behavior |
| --- | --- | --- |
| Integrity | Signature state and message ID | Reject invalid or replayed data |
| Provenance | Known source and provenance chain | Quarantine unknown or unattributed sources |
| Freshness | Source timestamp and data-type TTL | Quarantine expired information |
| Classification | Data label versus receiver clearance | Reject unauthorized disclosure |
| Usability | Canonical schema and required fields | Reject malformed data |
| Corroboration | Independent sources reporting similar types | Raise or lower review confidence |
| Consistency | Base version versus current version | Quarantine concurrent conflicts |

The score is advisory. Integrity, classification, and schema are hard gates. AI cannot override them, and uncertain or conflicting data is routed to human review.

## Run locally

Requires Node.js 20 or newer. There are no third-party runtime dependencies.

```bash
npm start
```

Open <http://127.0.0.1:3000> and select **Run complete scenario**.

Run automated checks with:

```bash
npm test
```

## Scenario flow

```text
Connected -> Alpha disconnects -> local reports are queued
          -> other nodes keep updating the canonical view
          -> 20 simulated minutes pass
          -> Alpha reconnects and re-authenticates
          -> queued messages are assessed
          -> safe messages merge; conflicts/stale data quarantine
          -> missing canonical deltas synchronize to Alpha
```

## Architecture

```text
Browser dashboard
      |
Local HTTP API
      |
C2 simulation engine ---- Explainable trust engine
      |                         |
Node-local stores         policy gates + weighted evidence
      |
Persistent-style outbound queues (in-memory in this prototype)
```

The in-memory adapters intentionally keep the example easy to inspect. A production evolution should replace them with encrypted durable storage, authenticated transport, hardware-backed keys, a schema registry, attribute-based access control, and an append-only audit system.

## API

- `GET /api/state`
- `POST /api/demo`
- `POST /api/reset`
- `POST /api/advance` with `{ "minutes": 5 }`
- `POST /api/nodes/:id/disconnect`
- `POST /api/nodes/:id/reconnect`
- `POST /api/nodes/:id/report`
- `GET /api/integration/profile`
- `POST /api/integration/demo`

## HexaForce integration concept

This repository contains a mock adapter contract, not an official HexaForce integration. It deliberately avoids inventing proprietary endpoints or authentication mechanisms. The boundary can be replaced once authorized vendor API documentation, schemas, credentials, and a sandbox are available.

For a technical review, see [CTO review brief](docs/CTO_BRIEF.md) and [integration guide](docs/INTEGRATION_GUIDE.md).

## Safety and limitations

This is an educational simulator, not a deployable military system. Cryptographic signatures are represented as a boolean test fixture, storage is in memory, identity is synthetic, and no claim of certification or accreditation is made. See [SECURITY.md](SECURITY.md) and [docs/THREAT_MODEL.md](docs/THREAT_MODEL.md).

## License

MIT
