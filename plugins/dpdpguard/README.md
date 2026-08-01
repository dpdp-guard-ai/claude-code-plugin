# DPDPGuard Privacy Compliance Plugin

Internal documentation for `plugins/dpdpguard`.

## Skills

Skills carry the operating procedure — the workflow, the verification steps,
and the boundaries. Commands and agents delegate to them rather than
duplicating the method.

| Skill | Purpose | Reference files |
|---|---|---|
| `dpdp-audit` | Static analysis for privacy violations across four regulations | `references/rule-catalog.md` |
| `dpdp-consent-builder` | Consent banners, preference centres, privacy notices | `references/languages.md`, `references/notice-checklist.md` |
| `dpdp-dsr-setup` | Rights portals: access, correction, erasure, grievance, nomination | — |
| `dpdp-breach-response` | Incident workflow, 72-hour clock, regulator and principal drafts | `references/dpb-intimation-template.md`, `references/principal-notice-template.md` |
| `dpdp-retention-guard` | Retention policy design and deemed-erasure jobs | — |
| `dpdp-child-protection` | Age assurance, parental consent, §9(3) tracking suppression | — |
| `dpdp-integration` | SDK integration across web, mobile, and backend stacks | — |
| `dpdp-operations` | Live MCP posture queries and DPO approval proposals | — |

The audit rule catalog is the single source of detection logic. The
`dpdp-audit` skill and the `compliance-auditor` agent both read from it, so a
rule added there takes effect in both.

## Agents

| Agent | Purpose | Writes files? |
|---|---|---|
| `compliance-auditor` | Reviews diffs and schemas, reports findings with citations | No — read-only by design |
| `dpo-assistant` | Drafts RoPA entries, DSR responses, notices, approval proposals | Drafts only |
| `breach-responder` | Timeline assembly, containment tracking, notification drafts | Drafts only |

Every agent is constrained to draft-and-report. None of them modify
application source, commit, send a regulator filing, or contact a data
principal — those are human decisions, and the agent prompts say so
explicitly.

## Commands

| Command | Arguments |
|---|---|
| `/dpdp-audit` | `[path\|diff] [--regulation …] [--threshold …]` |
| `/dpdp-score` | `[--gaps-only] [--severity …]` |
| `/dpdp-integrate` | `[--framework …] [--skip-scaffold]` |
| `/dpdp-consent` | `[--purposes …] [--locales …]` |
| `/dpdp-breach` | `"<incident summary>"` |
| `/dpdp-dsr` | `[overdue\|list\|show <id>\|acknowledge <id>]` |

## Hooks

| Hook | Event | Behaviour |
|---|---|---|
| `pii-commit-guard` | `PreToolUse` (Bash) | Blocks `git commit` when the staged diff contains personal data, identity numbers, or credentials |

The guard reads the hook payload from **stdin** and exits `2` to block, per the
Claude Code PreToolUse contract. It scans added lines only, and honours a
`dpdpguard:allow` marker for intentional fixtures. If it cannot parse its
input it fails open — it is defence in depth, not the only control.

## Conventions

- Skills, commands, and agents all require frontmatter; `bun run validate`
  enforces it, along with kebab-case naming, name/path agreement, and the
  hooks schema.
- Commands use `allowed-tools` (hyphenated). `allowed_tools` is not a
  recognised key and the validator rejects it.
- Agents declare `tools` as a comma-separated string.
- Hook scripts are POSIX `sh` and must pass `shellcheck --shell=sh`.
