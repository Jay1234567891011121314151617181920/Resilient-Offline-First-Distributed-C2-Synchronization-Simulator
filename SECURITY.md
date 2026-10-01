# Security policy

## Supported use

This repository is a defensive, synthetic-data research simulator. Do not connect it to operational networks, real C2 infrastructure, classified data, or safety-critical equipment.

## Reporting a vulnerability

Do not disclose security defects through a public issue. Contact the repository owner privately and include the affected version, reproduction steps, potential impact, and a suggested mitigation if available.

## Security properties and boundaries

- The HTTP server binds to loopback by default.
- Browser resources use a restrictive Content Security Policy.
- API request bodies are size-limited.
- UI values are escaped before insertion into HTML.
- Trust decisions expose their evidence and reasons.
- This prototype does not implement real cryptographic identity, encrypted persistence, or authorization.

Treat every external source, including a previously authenticated node, as potentially compromised. Production implementations require mutual authentication, key rotation and revocation, anti-rollback protection, encrypted storage, audit retention, rate limiting, and independent security assessment.
