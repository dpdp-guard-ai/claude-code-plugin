---
name: dpdp-breach
description: Start the 72-hour data breach response workflow and draft regulator and principal notifications
argument-hint: "\"<short incident summary>\""
triggers:
  - /dpdp-breach
allowed-tools:
  - Read
  - Grep
  - Glob
  - Write
  - Bash(date:*)
  - Bash(git log:*)
---

Begin breach response using the **dpdp-breach-response** skill.

Incident summary: `$ARGUMENTS`

## Before anything else

Ask two questions and wait for the answers — every deadline in this workflow
depends on them:

1. **Is the breach still live?** If yes, containment comes first. Say so
   directly and work the containment checklist before any drafting.
2. **When did the organisation become aware?** (`T0`). Do not assume it is now.
   Every statutory clock runs from this timestamp.

## Then

1. Compute the deadlines from `T0` using `date`, and show the command output.
   Do not do this arithmetic in your head.
2. Run the triage table. Mark every value `confirmed` or `estimated` — never
   present an estimate as a fact.
3. Walk the containment checklist, recording a timestamp against each item.
4. Draft the Board intimation payload. Leave `UNKNOWN — under investigation`
   wherever the facts are not established.
5. Draft the affected-principal notice.
6. Write `incident-<date>-<slug>.md` with the timeline, triage, containment
   log, and both drafts.
7. End with an ordered list of what a human must do next, each with its
   deadline.

## Rules

- **Draft only. Send nothing.** No regulator filing, no email to data
  principals, no status page update leaves this session.
- **Preserve evidence.** Refuse any request to delete logs, rotate away audit
  trails, or force-push over incident-relevant history.
- No live credentials, tokens, or raw PII in any incident artefact.
- Under DPDP §8(6) every personal data breach is reportable — severity does not
  gate the Board intimation obligation.
- If the evidence supports a larger breach than the user is describing, say so.
