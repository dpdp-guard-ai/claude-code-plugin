---
name: dpdp-audit
description: Run a multi-regulation privacy compliance audit on the local codebase
argument-hint: "[path|diff] [--regulation dpdp|gdpr|ccpa|pdpa|all] [--threshold critical|high|medium|low]"
triggers:
  - /dpdp-audit
allowed-tools:
  - Read
  - Grep
  - Glob
  - Write
  - Bash(git diff:*)
  - Bash(git log:*)
  - Bash(git rev-parse:*)
---

Run a privacy compliance audit using the **dpdp-audit** skill. Follow that
skill's method and rule catalog rather than improvising a scan.

Arguments: `$ARGUMENTS`

## Parse the arguments

- A path or glob → audit exactly that.
- `diff`, `pr`, or `changes` → audit only the working diff
  (`git diff --merge-base origin/HEAD`, falling back to `git diff HEAD`).
- `--regulation <name>` → restrict to that regulation. Default: every
  regulation listed in `.dpdpguard.yaml`, or all four if there is no config.
- `--threshold <level>` → suppress findings below this severity in the summary.
  Still record them in the report file. Default: `medium`.
- No arguments → audit the whole repository.

## Steps

1. Read `.dpdpguard.yaml` if it exists. State which config or defaults you used.
2. Resolve scope and report the file count before scanning. If the scope
   exceeds ~500 files, say so and suggest narrowing to the diff.
3. Work the rule catalog. Read the surrounding code before recording any
   finding — a grep hit is a candidate, not a violation.
4. Write `dpdpguard-audit-report.md` and print a summary table plus the
   Critical and High findings in chat.

## Rules

- **Report only. Never edit application source, never commit.** Suggested
  patches go in the report as fenced blocks.
- Never include real PII values in the report — cite the location, redact the
  value.
- Put anything you could not conclusively classify under `## Needs human
  review` rather than guessing.
- Close by stating that this is engineering evidence, not legal advice.
