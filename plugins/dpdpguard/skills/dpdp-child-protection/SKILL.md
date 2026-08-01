---
name: dpdp-child-protection
description: Minor age-gating, verifiable parental consent (VPC), and ad-tracker suppression controller under DPDP Act §9
triggers:
  - dpdp child
  - minor protection
  - age verification
  - parental consent
---

# DPDPGuard Minor & Child Data Protection Assistant

Enforce strict compliance for processing data of minors under DPDP Act §9 (under 18) and GDPR Art.8 (under 16).

## Functional Capabilities

- **Age Gate Component**: Standard DOB selector with `isMinor` computation.
- **Verifiable Parental Consent (VPC)**: Scaffolds DigiLocker or parent email verification flow.
- **Script Suppressor**: React/DOM controller component that suppresses GA4, Meta Pixel, and Hotjar for minor accounts.
- **Audit Rule Enforcement**: Detects behavioral tracking or targeted ad code attached to minor profiles.
