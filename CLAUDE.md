# CLAUDE.md

This file provides guidance for Claude Code when working in `@dpdpguard/claude-code-plugin`.

## Repository Structure

This repository follows the **bstack** Claude Code plugin template structure:

```
@dpdpguard/claude-code-plugin/
├── .claude-plugin/
│   └── marketplace.json       # Claude plugin marketplace catalog
├── .agents/
│   └── plugins/
│       └── marketplace.json   # Codex-synchronized catalog (auto-generated)
├── .github/workflows/
│   ├── ci.yml                 # validate · test · lint · commitlint
│   └── publish.yml            # npm Trusted Publishing (OIDC)
├── bin/
│   ├── init.js                # Initializer CLI (`npx init`)
│   └── audit-ci.js            # CI/CD auditor entrypoint (placeholder)
├── scripts/
│   ├── sync-codex.ts          # Generates Codex artefacts (deterministic)
│   └── validate-plugin.ts     # Enforces the rules below
├── test/
│   └── plugin.test.ts         # Validator + hook behaviour tests
├── action.yml                 # GitHub Action entrypoint
├── plugins/
│   └── dpdpguard/
│       ├── .claude-plugin/
│       │   └── plugin.json    # Plugin manifest (Source of Truth)
│       ├── .codex-plugin/
│       │   └── plugin.json    # Codex plugin manifest (auto-generated)
│       ├── README.md
│       ├── hooks/
│       │   ├── hooks.json     # Hook definitions
│       │   └── pii-commit-guard.sh
│       ├── skills/            # 8 compliance skills (+ references/)
│       ├── agents/            # Subagent system prompts
│       └── commands/          # 6 slash commands
```

## Source of Truth

- Claude Code metadata: `.claude-plugin/` directories
- Codex metadata: `.codex-plugin/` directories (auto-generated)
- Run `bun run sync:codex` after editing any `.claude-plugin/plugin.json`

`sync-codex.ts` output must stay a pure function of the source manifests — no
timestamps, no randomness. CI checks for drift by regenerating and diffing, so
any non-deterministic field makes that check impossible to pass.

## Development Rules

1. **Never edit `.codex-plugin/` files directly** — they are generated.
2. **All hooks must be POSIX-compliant shell** — no bashisms. Must pass
   `shellcheck --shell=sh`.
3. **Skills must have YAML frontmatter** — `name`, `description`, `triggers`.
4. **Agents must have YAML frontmatter** — `name`, `description`, `model`,
   `tools` (comma-separated string, not a YAML list).
5. **Commands must have YAML frontmatter** — `name`, `description`, `triggers`.
   Tool restrictions use `allowed-tools` (hyphenated); `allowed_tools` is not a
   recognised key.
6. **Commit messages follow conventional commits** — enforced by commitlint.
7. **`name` must match its location** — a skill's `name` matches its directory,
   a command's or agent's `name` matches its filename. Kebab-case throughout.
8. **The plugin manifest version must match `package.json`.**

Run `bun run validate` to check rules 2–5, 7, and 8 before committing.

## Authoring Guidance

**Skills carry the procedure.** A skill is instructions for doing the work —
workflow, verification steps, output contract, boundaries — not a description
of a feature. Commands and agents delegate to skills rather than restating the
method, so detection logic lives in one place.

**Commands are prompts, not documentation.** The body of a command file is sent
to the model. Write it as instructions addressed to Claude, with
`argument-hint` and `$ARGUMENTS` handling.

**Large reference material goes in `skills/<name>/references/`.** Keep the
SKILL.md body focused on the procedure and link out to catalogs, templates, and
tables.

**Compliance content must not overstate.** This plugin advises on legal
obligations, so:

- Cite specific provisions (`DPDP §6(1)`, `GDPR Art.7(3)`) rather than gesturing
  at a regulation.
- Never state that an organisation "is compliant" — that is a regulator's
  determination.
- Never compute predicted penalty amounts; statutory maxima only, labelled as
  maxima.
- Prefer an explicit `TODO`/`UNKNOWN` marker over plausible filler in any
  compliance artefact.
- Agents draft and report; humans send, file, and approve.
