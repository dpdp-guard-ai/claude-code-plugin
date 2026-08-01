---
name: dpdp-audit
description: Static code analysis for privacy compliance violations across DPDP Act 2023, GDPR, CCPA, and PDPA. Use when auditing a codebase or diff for consent dark patterns, PII leakage, missing retention policies, undisclosed cross-border transfers, or child-data tracking.
triggers:
  - dpdp audit
  - privacy audit
  - compliance scan
  - audit code
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
---

# Multi-Regulation Privacy Compliance Audit

Audit a codebase for violations of the **DPDP Act 2023 (India)**, **GDPR (EU)**,
**CCPA/CPRA (California)**, and **PDPA (Thailand)**.

This skill produces **findings, not edits**. Never modify application source as
part of an audit — emit suggested patches and let the developer apply them.

## Scope resolution

Determine what to scan, in this order:

1. If the user named files or a directory, scan exactly that.
2. If the user said "diff", "PR", or "my changes", scan
   `git diff --merge-base origin/HEAD` (fall back to `git diff HEAD` when there
   is no upstream).
3. Otherwise scan the whole repository.

Read `.dpdpguard.yaml` if present for `regulations`,
`audit.severity_threshold`, and `audit.exclude_paths`. If it is absent, audit
all four regulations at `medium` threshold and exclude `node_modules/`,
`dist/`, `build/`, `vendor/`, `.git/`, and lockfiles. A missing config never
blocks the audit — state the defaults you used in the report.

## Method

Work through `references/rule-catalog.md`. Each rule gives a detection
strategy, the statutory citation, and a default severity.

1. **Inventory the data surface first.** Locate schema definitions
   (`*.prisma`, `*.sql`, `models/`, `schema.ts`), API route handlers, and
   analytics/SDK initialisation. Grep for PII-bearing identifiers before
   reasoning about individual rules:

   ```
   email|phone|mobile|aadhaar|aadhar|pan_number|passport|ssn|dob|date_of_birth
   |address|pincode|zip|latitude|longitude|ip_address|device_id|biometric
   ```

2. **Run the catalog.** For each rule, use Grep to build a candidate set, then
   **Read the surrounding code before recording a finding**. A grep hit is a
   candidate, not a violation.

3. **Verify every finding.** Confirm the file and line still contain the
   pattern and that the code path is reachable in production. Drop anything you
   cannot point at a concrete line for.

4. **Classify severity** with the rubric below, not the catalog default alone —
   defaults assume real production PII. Downgrade for test fixtures, seed data,
   and example files, and say so in the finding.

5. **Write the report** in the structure below.

## Severity rubric

| Severity | Meaning | Examples |
|---|---|---|
| **Critical** | Live exposure of identifiable personal data, or processing with no lawful basis at all | PII in logs shipped to a third party, unencrypted Aadhaar/biometric column, tracking on a known-minor account |
| **High** | Consent or rights machinery missing or defeated | Pre-ticked consent, no withdrawal path, no DSR endpoint, undisclosed cross-border transfer |
| **Medium** | Control exists but is incomplete or unenforced | Retention policy declared with no erasure job, notice missing a required disclosure |
| **Low** | Documentation, hygiene, or defence-in-depth gap | Missing RoPA entry, no data-classification comment on a PII column |

Do not inflate severity to make a report look substantial. Three real Critical
findings are more useful than thirty invented Lows.

## Report structure

Write to `dpdpguard-audit-report.md` in the repo root (or a path the user
gave), and summarise the top findings in chat.

````markdown
# Privacy Compliance Audit — <repo> @ <short-sha>

**Scanned:** <n> files · **Regulations:** DPDP, GDPR, CCPA, PDPA
**Config:** .dpdpguard.yaml (or: defaults — no config found)
**Composite score:** <0-100>

## Summary
| Severity | Count |
|---|---|
| Critical | n |
| High | n |
| Medium | n |
| Low | n |

## Findings

### [CRITICAL] DPDP-A01 — Raw email address written to application log
- **File:** `src/auth/login.ts:42`
- **Statute:** DPDP §8(5); GDPR Art.32(1)(a)
- **Evidence:**
  ```ts
  console.log(`login attempt: ${user.email}`)
  ```
- **Why this violates:** Application logs are retained beyond the processing
  purpose and are readable by operators with no need-to-know, so the identifier
  is processed without a corresponding safeguard.
- **Suggested fix:**
  ```ts
  console.log(`login attempt: ${hashSubject(user.id)}`)
  ```
- **Residual risk if unfixed:** log retention window (typically 30–90 days)
````

## Scoring

Composite score starts at 100 and subtracts per finding: Critical −15, High −8,
Medium −3, Low −1, floored at 0. Show the arithmetic — a score with no visible
derivation is not evidence of anything.

## Penalty exposure

The DPDP Act sets **maximum** penalties in Schedule 1 (up to ₹250 crore for
failure to take reasonable security safeguards, up to ₹200 crore for child-data
obligations). State these as statutory maxima only, and only when the user asks.

Do **not** compute a predicted fine for a specific finding. Penalty
determination under §33 weighs the nature, gravity, duration, mitigation, and
the fiduciary's conduct — none of which a static scan observes. A number that
looks like a quantified liability estimate will be read as one, and this skill
cannot produce a defensible one.

## Boundaries

- This audit is engineering evidence-gathering, **not legal advice**. Put that
  in the report footer.
- Never auto-apply fixes, never `git commit`, never open a PR from this skill.
- Never copy real PII values into the report — cite the location, redact the
  value.
- When you cannot determine whether something is a violation, list it under a
  `## Needs human review` heading rather than guessing.
