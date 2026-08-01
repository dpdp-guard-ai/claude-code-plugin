---
name: dpdp-dsr-setup
description: Scaffolds Data Subject Rights (DSR/SRR) management portal and automated identity verification flows
triggers:
  - dpdp dsr
  - setup dsr portal
  - data subject rights
  - privacy rights
---

# DPDPGuard DSR Rights Scaffolding Assistant

Build self-serve Data Subject Rights (DSR) portals compliant with DPDP Act §11-12, GDPR Art.15-22, and CCPA §1798.100-105.

## Supported Rights Workflows

1. **Right to Access / Summary**: Export personal data in machine-readable JSON/CSV formats.
2. **Right to Correction / Erasure**: Request correction of inaccurate data or deletion of unneeded records.
3. **Right to Grievance Redressal**: Direct messaging to Data Protection Officer (DPO).
4. **Right to Nominate**: Nominate representative in event of death or incapacity.

## Scaffolding Components

- `/privacy/rights` self-service UI route.
- OTP / Magic Link identity verification middleware.
- Automated API endpoints connected to DPDPGuard DSR management engine.
