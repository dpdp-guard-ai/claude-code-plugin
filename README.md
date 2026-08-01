# DPDPGuard Claude Code Plugin (`@dpdpguard/claude-code-plugin`)

First-party Claude Code plugin bringing **multi-regulation privacy compliance** (DPDP Act 2023, GDPR, CCPA, PDPA) directly into your AI-assisted coding workflow.

## Features

- 🛡️ **85+ Audit Rules**: Detect pre-ticked checkboxes, dark patterns, PII console logging, unencrypted storage, and child tracking.
- 🇮🇳 **DPDP Act 2023 Scaffolding**: Support for all 22 Eighth Schedule Indian languages in privacy notices & consent banners.
- ⚡ **Suggestion-Only Audit Engine**: Never modifies your source code directly — generates clean code patches with legal rationale.
- 📡 **Remote Rule Registry**: Fetches real-time rule updates from `rules.dpdpguard.com` with offline cache fallback.
- 🆓 **Free MCP Operations**: Live backend tools (`dsr_overdue_list`, `breach_timeline_assemble`, `posture_gaps_list`) are 100% free for all accounts.
- 🚀 **First-Class CI/CD**: Built-in GitHub Action (`action.yml`) for PR gating with SARIF reporting.

## Installation

```bash
# Add to Claude Code marketplace
claude plugin marketplace add https://github.com/dpdpguard/claude-code-plugin
claude plugin install dpdpguard
```

Or initialize in a project directly:

```bash
npx @dpdpguard/claude-code-plugin init
```

## Quick Start Commands

- `/dpdp-audit` — Run multi-regulation privacy audit across local codebase.
- `/dpdp-score` — Fetch live compliance score & posture gaps from DPDPGuard backend.
- `/dpdp-integrate` — Launch guided scaffolding wizard for DPDPGuard SDK.
- `/dpdp-consent` — Generate compliant multilingual consent banner and privacy notice.
- `/dpdp-breach` — Launch 72-hour data breach response checklist & reporting payload.
- `/dpdp-dsr` — Manage Data Subject Rights requests from CLI.

## Repository Layout

Built on the **bstack** Claude Code plugin template architecture.

```
plugins/dpdpguard/
├── .claude-plugin/plugin.json
├── hooks/
│   ├── hooks.json
│   └── pii-commit-guard.sh
├── skills/
│   ├── dpdp-audit/
│   ├── dpdp-integration/
│   ├── dpdp-consent-builder/
│   ├── dpdp-dsr-setup/
│   ├── dpdp-breach-response/
│   ├── dpdp-retention-guard/
│   ├── dpdp-child-protection/
│   └── dpdp-operations/
├── agents/
│   ├── compliance-auditor.md
│   ├── dpo-assistant.md
│   └── breach-responder.md
└── commands/
    ├── dpdp-audit.md
    ├── dpdp-score.md
    ├── dpdp-integrate.md
    ├── dpdp-consent.md
    ├── dpdp-breach.md
    └── dpdp-dsr.md
```

## License

MIT © DPDPGuard
