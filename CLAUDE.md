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
├── bin/
│   ├── init.js                # Initializer CLI (`npx init`)
│   └── audit-ci.js            # CI/CD auditor entrypoint
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
│       ├── skills/            # 8 compliance skills
│       ├── agents/            # Subagent system prompts
│       └── commands/          # 6 slash commands
```

## Source of Truth

- Claude Code metadata: `.claude-plugin/` directories
- Codex metadata: `.codex-plugin/` directories (auto-generated)
- Run `bun run sync:codex` after editing any `.claude-plugin/plugin.json`

## Development Rules

1. **Never edit `.codex-plugin/` files directly** — they are generated.
2. **All hooks must be POSIX-compliant shell** — no bashisms.
3. **Skills must have YAML frontmatter** — `name`, `description`, `triggers`.
4. **Agents must have YAML frontmatter** — `name`, `description`, `model`, `tools`.
5. **Commands must have YAML frontmatter** — `name`, `description`, `triggers`.
6. **Commit messages follow conventional commits** — enforced by commitlint.
