---
name: dpdp-audit
description: Run a multi-regulation privacy compliance audit on local codebase
triggers:
  - /dpdp-audit
allowed_tools:
  - Read
  - Write
  - Bash
---

# /dpdp-audit

Executes a full static analysis privacy audit against active regulations (DPDP, GDPR, CCPA, PDPA).

## Usage

```bash
/dpdp-audit
```

## Options

- `--regulation <dpdp|gdpr|ccpa|pdpa|all>` — Scope audit to specific regulation (default: all active in `.dpdpguard.yaml`).
- `--threshold <critical|high|medium|low>` — Minimum severity threshold (default: medium).

## Output

Generates structured Markdown report with composite score, per-regulation findings, suggested fixes, and penalty exposure calculations.
