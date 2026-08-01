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
| `dpdp-sdk-selector` | Resolve each deployable to the right DPDP Guard component | `references/component-matrix.md` |
| `dpdp-server-sdk` | Backend enforcement, token brokering, webhooks, audit export | `references/webhook-handling.md` |
| `dpdp-mcp-connect` | Credentials, scopes, and the proposal model for `/mcp/v1` | `references/tool-catalog.md` |
| `dpdp-consent-widget` | Drop-in `consent.js` embed, tracker auto-blocking, Consent Mode v2 | — |
| `dpdp-contract-conformance` | Generated clients, error catalog, audit-hash vectors | — |

The audit rule catalog is the single source of detection logic. The
`dpdp-audit` skill and the `compliance-auditor` agent both read from it, so a
rule added there takes effect in both.

### Integration skills, and which to reach for

`dpdp-sdk-selector` runs first and decides the rest. It resolves each deployable
in a workspace to a real, published component, because DPDP Guard is not one
SDK — it is five integration surfaces with different credential classes:

| Surface | Skill |
|---|---|
| Website, no build step | `dpdp-consent-widget` |
| Web/mobile app with a build | `dpdp-integration` (+ `dpdp-consent-builder`) |
| Backend service | `dpdp-server-sdk` |
| Language with no official SDK | `dpdp-contract-conformance` |
| Agent access to live state | `dpdp-mcp-connect` → `dpdp-operations` |

A client-only integration is unfinished whenever there is a backend: consent
capture without server-side enforcement records a preference and never acts on
it. See [`docs/dpdpbot-alignment.md`](../../docs/dpdpbot-alignment.md) for the
gap review these skills came out of.

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
| `/dpdp-connect` | `[mcp\|sdk\|all] [--tenant https://<deployment>.convex.site]` |

## MCP server

`.mcp.json` at the plugin root registers the `dpdpguard` remote HTTP server, so
installing the plugin is enough to get a connectable agent surface:

```json
{ "mcpServers": { "dpdpguard": { "type": "http", "url": "${DPDPGUARD_TENANT_URL}/mcp/v1" } } }
```

The agent surface is **per-deployment** — there is no shared host — so the URL
is assembled from `DPDPGUARD_TENANT_URL`, which Claude Code expands in an HTTP
server's `url` field. The user sets that one variable; nothing else is
configured.

**No credential is declared here, deliberately.** The entry carries no
`headers`, so Claude Code runs its OAuth 2.1 + PKCE flow: it reads the
`WWW-Authenticate` header the surface returns on 401, discovers the
authorization server, self-registers via RFC 7591 DCR, and prompts for sign-in
at `/mcp`. Setting `headers.Authorization` here would suppress that fallback —
a rejected header is reported as a failed connection, not as a sign-in prompt.

Unattended agent keys are the exception and are added per-machine with
`claude mcp add --header`, never committed. See the `dpdp-mcp-connect` skill.

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
