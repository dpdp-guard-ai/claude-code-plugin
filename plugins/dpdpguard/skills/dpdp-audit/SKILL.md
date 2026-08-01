---
name: dpdp-audit
description: Static code analysis for 85+ privacy compliance rules across DPDP Act, GDPR, CCPA, and PDPA
triggers:
  - dpdp audit
  - privacy audit
  - compliance scan
  - audit code
---

# DPDPGuard Multi-Regulation Privacy Compliance Audit

Conduct static code auditing across your codebase for compliance violations against:
- 🇮🇳 **DPDP Act 2023 (India)**
- 🇪🇺 **GDPR (EU)**
- 🇺🇸 **CCPA (California)**
- 🇹🇭 **PDPA (Thailand)**

## Workflow

1. **Rule Fetching**: Fetch latest rule definitions from `https://rules.dpdpguard.com/v1/audit-rules` (or load cached `.dpdpguard-cache/rules.json`).
2. **Config Reading**: Load active regulations and exclusion paths from `.dpdpguard.yaml`.
3. **Static Analysis**: Scan source files, ASTs, schema files, and config files for rule patterns.
4. **Report Generation**: Output structured Markdown audit report artifact with:
   - Composite compliance score (0-100)
   - Per-regulation breakdown
   - Critical / High / Medium / Low severity findings
   - Suggested manual code fixes (suggestion-only, never auto-modifies code)
   - Penalty exposure estimates
5. **Telemetry**: Send anonymized rule hit rate metrics if telemetry is enabled.
