# Threat model

## Scope

The system receives delayed and potentially conflicting synthetic reports from modern and legacy nodes following intermittent network connectivity. Its defensive objective is to preserve availability without silently sacrificing integrity, confidentiality, or auditability.

## Protected assets

- Integrity and freshness of the common operational picture.
- Classification labels and receiver authorization boundaries.
- Source identity, provenance, and message ordering.
- Availability of node-local workflows during a partition.
- An auditable explanation of every merge decision.

## Principal threats

| Threat | Example | Control represented in the prototype |
| --- | --- | --- |
| Replay | A valid old report is submitted again | Unique IDs and a seen-message registry |
| Tampering | Payload changes in transit | Signature-validity hard gate |
| Stale-data hazard | Delayed report is presented as current | Type-sensitive freshness limit and visible data age |
| Unauthorized disclosure | Node receives data above its clearance | Classification hard gate |
| Schema confusion | Legacy fields are interpreted incorrectly | Canonical contract validation |
| Split-brain conflict | Nodes update the same record while partitioned | Base-version conflict detection and quarantine |
| Compromised source | Authenticated node emits deceptive data | Provenance, anomaly signals, and corroboration |
| Availability attack | Excessive backlog overwhelms reconciliation | Bounded inputs and recommended queue quotas |

## Trust pipeline for legacy and modern sources

1. Normalize data through an adapter without discarding the original evidence.
2. Verify identity, integrity, sequence, and anti-replay metadata.
3. Evaluate classification labels and receiver authorization before content use.
4. Calculate freshness according to data type rather than a universal timeout.
5. Validate the canonical schema and semantic units.
6. Compare the report with independent sources and the recent event history.
7. Produce an explainable score, but enforce policy gates separately.
8. Accept, quarantine for human review, or reject; append the result to an audit log.

## AI-specific risks

- **Automation bias:** operators may over-trust a high score. Mitigation: expose failed checks and preserve human authority.
- **Training-data poisoning:** a compromised historical corpus may normalize malicious patterns. Mitigation: signed datasets, lineage, and independent validation.
- **Concept drift:** operational conditions change. Mitigation: monitor distributions and fall back to deterministic policy.
- **Adversarial inputs:** crafted values may manipulate a learned model. Mitigation: schema validation, constrained features, and out-of-distribution detection.
- **Unexplainable decisions:** black-box classification can impair accountability. Mitigation: use interpretable features and log evidence.
- **Model availability:** inference may be unavailable during disconnection. Mitigation: local deterministic gates remain fully functional.

## Out of scope

Real cryptography, classified-network accreditation, mission authorization, weapons or targeting functions, deployment hardening, and integration with operational systems are explicitly out of scope.
