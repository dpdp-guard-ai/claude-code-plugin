# DPDPGuard Privacy Compliance Plugin

Internal documentation for `plugins/dpdpguard`.

## Skills

| Skill | Description |
|---|---|
| `dpdp-audit` | Static code analysis for 85+ privacy rules across 4 regulations |
| `dpdp-integration` | Scaffolding & helper generation for multi-platform applications |
| `dpdp-consent-builder` | Multilingual consent UI components (22 Indian languages) |
| `dpdp-dsr-setup` | Automated DSR workflow endpoints & UI portal generator |
| `dpdp-breach-response` | Incident management & DPB reporting payload generator |
| `dpdp-retention-guard` | Deemed erasure cron jobs & 2-clock retention rules |
| `dpdp-child-protection` | Minor age-gating & tracking script suppression controller |
| `dpdp-operations` | Live MCP terminal interface for DPDPGuard platform |

## Agents

| Agent | Description |
|---|---|
| `compliance-auditor` | Automated subagent for scanning code diffs and recommending privacy fixes |
| `dpo-assistant` | Subagent for drafting RoPA entries, privacy notices, and DSR responses |
| `breach-responder` | Subagent for incident containment and reporting payloads |

## Commands

| Command | Description |
|---|---|
| `/dpdp-audit` | Run multi-regulation privacy compliance audit |
| `/dpdp-score` | Fetch live compliance score from backend |
| `/dpdp-integrate` | Guided SDK integration wizard |
| `/dpdp-consent` | Generate consent banner and notice |
| `/dpdp-breach` | 72-hour breach response assistant |
| `/dpdp-dsr` | Manage DSR requests from CLI |

## Hooks

| Hook | Trigger | Description |
|---|---|---|
| `pii-commit-guard` | PreToolUse (Bash) | Scans git commit diffs for raw PII logging |
