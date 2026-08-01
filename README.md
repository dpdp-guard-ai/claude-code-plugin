# DPDPGuard Claude Code Plugin (`@dpdpguard/claude-code-plugin`)

Claude Code plugin bringing **multi-regulation privacy compliance** (DPDP Act
2023, GDPR, CCPA, PDPA) into your AI-assisted coding workflow.

## What it does

- **Audit** — a documented detection catalog covering PII leakage, consent dark
  patterns, retention gaps, children's data, rights endpoints, and security
  safeguards. Each rule carries a grep signal, a confirmation step, a statutory
  citation, and a default severity.
- **Scaffold** — consent banners, preference centres, privacy notices, and DSR
  portals that satisfy the design rules the audit checks for.
- **Respond** — a breach workflow that pins the 72-hour clock to the awareness
  timestamp and drafts both the Board intimation and the affected-principal
  notice.
- **Integrate** — resolve each deployable in a workspace to the right DPDP Guard
  component (embeddable widget, client SDKs, server SDKs, or a client generated
  from the published API contract) and wire it, including the server-side
  enforcement and webhook handling a client-only integration leaves out.
- **Operate** — live posture, gap, and DSR-queue queries against the DPDPGuard
  MCP agent surface at `/mcp/v1`, with every state change raised as a proposal
  for a named human to approve.
- **Guard** — a `PreToolUse` hook that blocks `git commit` when the staged diff
  contains personal data, identity numbers, or credentials.

Everything is **suggestion-only**. Skills and agents report findings and
produce drafts; they never modify application source, commit, file with a
regulator, or contact a data principal.

## Installation

```bash
claude plugin marketplace add https://github.com/dpdpguard/claude-code-plugin
claude plugin install dpdpguard
```

Or initialise in a project directly:

```bash
npx @dpdpguard/claude-code-plugin init
```

## Commands

| Command | Purpose |
|---|---|
| `/dpdp-audit` | Multi-regulation privacy audit of the codebase or working diff |
| `/dpdp-score` | Live compliance score and posture gaps from the MCP server |
| `/dpdp-integrate` | Guided SDK integration for the detected stack |
| `/dpdp-consent` | Consent banner, preference centre, and privacy notice |
| `/dpdp-breach` | 72-hour breach response workflow and notification drafts |
| `/dpdp-dsr` | List, inspect, and act on Data Subject Rights requests |
| `/dpdp-connect` | Resolve the workspace to DPDP Guard components and wire MCP access |

See [`plugins/dpdpguard/README.md`](plugins/dpdpguard/README.md) for the full
skill, agent, and hook reference, and
[`docs/dpdpbot-alignment.md`](docs/dpdpbot-alignment.md) for how this plugin
maps onto the DPDP Guard platform's actual SDK, API, and agent surfaces.

## Repository layout

```
.claude-plugin/marketplace.json   # marketplace catalog (source of truth)
.agents/plugins/marketplace.json  # Codex mirror (generated)
.github/workflows/
├── ci.yml                        # validate · test · lint · commitlint
└── publish.yml                   # npm Trusted Publishing (OIDC)
bin/
├── init.js                       # npx initializer
└── audit-ci.js                   # CI auditor entrypoint (placeholder)
scripts/
├── sync-codex.ts                 # generates Codex artefacts, deterministically
└── validate-plugin.ts            # enforces the CLAUDE.md structural rules
test/plugin.test.ts
plugins/dpdpguard/
├── .claude-plugin/plugin.json    # plugin manifest (source of truth)
├── .codex-plugin/plugin.json     # generated — never edit by hand
├── hooks/                        # hooks.json + POSIX sh guards
├── skills/                       # 13 skills, some with references/
├── agents/                       # 3 subagents
└── commands/                     # 7 slash commands
```

## Development

```bash
bun install
bun run validate        # frontmatter, naming, hooks schema, manifest consistency
bun test                # validator unit tests + hook behaviour tests
bun run lint            # markdownlint
bun run lint:shell      # shellcheck --shell=sh
bun run sync:codex      # regenerate Codex artefacts after editing plugin.json
```

CI runs all of the above on every pull request. `sync:codex` output is a pure
function of the source manifests, so the drift check is meaningful.

## Publishing

Releases publish to npm via **Trusted Publishing** (OIDC) — no npm token is
stored in this repository. Publishing runs from
[`.github/workflows/publish.yml`](.github/workflows/publish.yml) on a published
GitHub release, and requires a one-time trusted-publisher configuration on
npmjs.com:

| Field | Value |
|---|---|
| Organization or user | `dpdpguard` |
| Repository | `claude-code-plugin` |
| Workflow filename | `publish.yml` |
| Environment | `npm-publish` |

The workflow verifies that the release tag matches `package.json`, that the
version is not already published, and that validation, tests, and lint pass
before it publishes. Provenance attestation is attached automatically.

## Status

`bin/audit-ci.js` is currently a **placeholder** — it does not execute the rule
catalog, and the GitHub Action built on it should not be treated as a
compliance gate yet. The detection logic today lives in the skills, which run
inside Claude Code. The remote rule registry at `rules.dpdpguard.com` is not
yet wired up.

## License

MIT © DPDPGuard — see [LICENSE](LICENSE).
