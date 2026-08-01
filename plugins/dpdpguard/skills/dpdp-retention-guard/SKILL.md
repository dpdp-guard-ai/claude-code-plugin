---
name: dpdp-retention-guard
description: Automated data retention policy enforcer and deemed erasure scheduler (3-year rule)
triggers:
  - dpdp retention
  - data deletion schedule
  - deemed erasure
  - retention policy
---

# DPDPGuard Retention Policy & Deemed Erasure Guard

Scaffold data retention rules and automated erasure pipelines under DPDP Rule 8 and GDPR Art.5(1)(e).

## Key Workflows

1. **Schema Retention Audit**: Identifies PII tables lacking TTL or `retentionPolicy` bindings.
2. **Two-Clock Pattern**: Implements separate Data Clock (functional records) and Log Clock (audit trails).
3. **Deemed Erasure Scheduler**: 3-year inactivity threshold scanner for e-commerce, gaming, and social media apps.
4. **48-Hour Warning Pipeline**: Sends automated pre-erasure notification emails before executing account deletion.
