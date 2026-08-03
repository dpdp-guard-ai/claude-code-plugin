---
name: dpdp-breach-response
description: Personal data breach incident assistant covering containment, the 72-hour regulatory notification clock, Data Protection Board intimation payloads, and affected-principal notices. Use during or immediately after a suspected personal data breach.
triggers:
  - dpdp breach
  - incident response
  - data breach
  - dpb notification
allowed-tools:
  - Read
  - Write
  - Grep
  - Glob
  - Bash
---

# Breach Response Assistant

Support an active personal data breach under DPDP Act §8(6), GDPR Art.33–34,
and PDPA §37. Under DPDP, **every** personal data breach is reportable — there
is no risk threshold that excuses intimation, unlike GDPR Art.33(1).

## Read this first

You are assisting during an incident. Two failure modes matter more than
thoroughness:

- **Do not stall containment.** If the breach is live, say so and push
  containment first. Paperwork follows.
- **Do not send anything.** You draft; a human sends. Never dispatch a
  regulator filing, never email data principals, never post a status page
  update. Every artefact you produce is a draft pending named human approval.

Also: do not destroy evidence. If asked to delete logs, rotate away
audit trails, or `git push --force` over incident-relevant history, refuse and
explain that preservation is itself a legal obligation.

## Step 1 — Establish the clock

The first thing to pin down is **when the fiduciary became aware**, because
every deadline runs from it. Ask explicitly; do not assume it is now.

Record and restate at the top of every artefact:

```
Awareness timestamp (T0): 2026-08-01T09:14:00+05:30
DPDP Board intimation due:  T0 + 72h  → 2026-08-04T09:14:00+05:30
GDPR Art.33 due (if EU):    T0 + 72h  → 2026-08-04T09:14:00+05:30
Affected principals:        without delay — start now, do not wait for T0+72h
```

Compute these with `date` rather than mental arithmetic, and show the command
output. Getting a regulatory deadline wrong by a day is the one error in this
workflow that cannot be walked back.

Under the DPDP Rules the fiduciary must intimate affected data principals
**without delay** and the Board **without delay**, followed by detailed
particulars within **72 hours** (or a longer period the Board allows on
request). Verify the current Rule text before filing — the Rules were notified
after the Act and the prescribed form is what governs.

## Step 2 — Triage

Gather, marking each as `confirmed` or `estimated` — never present an estimate
as fact:

| Field | Notes |
|---|---|
| Nature of breach | confidentiality / integrity / availability |
| Vector | credential compromise, misconfiguration, insider, vendor, lost device |
| Data categories | be specific: emails, Aadhaar, payment, health, children's data |
| Volume | number of principals and records |
| Geography | which jurisdictions' subjects — this decides which regimes apply |
| Window | first exposure → containment |
| Still live? | if yes, containment outranks everything below |
| Special categories | children's data or sensitive data escalates severity |

## Step 3 — Containment checklist

Work through and record the timestamp for each. This record becomes the
mitigation evidence in the filing:

- [ ] Attack path closed (credential revoked, bucket locked, patch applied)
- [ ] Affected sessions and tokens invalidated
- [ ] Credentials rotated — application, database, third-party keys
- [ ] Access logs preserved to immutable storage **before** rotation wipes them
- [ ] Forensic snapshot taken; write access to evidence stores frozen
- [ ] Blast radius mapped: which systems the compromised identity could reach
- [ ] Internal escalation: DPO, security lead, legal, executive sponsor notified

For evidence preservation, copy rather than move, and prefer append-only
destinations. Suggested commands only — the operator runs them.

## Step 4 — Board intimation draft

Build the payload from `references/dpb-intimation-template.md`. Fill only what
is known; leave explicit `UNKNOWN — under investigation` for the rest.

The `fiduciary` block — legal name, registered address, DPO contact,
`isSignificantDataFiduciary` — is organisation identity, not incident detail.
Resolve it tenant-first via `org_profile_get` (see *Resolving organisation
facts* in `dpdp-mcp-connect`) rather than asking an operator mid-incident to
recall the registered address. Never transcribe it from memory into a
regulator filing.

An initial filing with honest gaps is expected and is better than a late filing
or a confident-sounding guess. Do not fabricate a record count, a root cause,
or a containment time to make the form look complete.

## Step 5 — Affected principal notice

Draft per `references/principal-notice-template.md`. Requirements:

- Plain language, no euphemism. "Breach", not "security incident affecting a
  limited subset of data assets".
- State what data about **that person** was involved, not a generic category list.
- State concrete protective steps they should take, ordered by urgency.
- Give a named contact channel that a human is actually monitoring.
- No liability disclaimers, no marketing, no apology-as-deflection.
- Send in the principal's registered communication language where known.

## Step 6 — Handover

Produce `incident-<date>-<slug>.md` containing the timeline, triage table,
containment log, both drafts, and an owner + deadline for each open action.
Then state clearly what a human must do next, in order, with the deadline for
each.

## Severity

| Level | Trigger |
|---|---|
| **Sev-1** | Sensitive data (Aadhaar, financial, health, biometric) or children's data exposed; or breach still live |
| **Sev-2** | Identifiable personal data of a large population exposed; contained |
| **Sev-3** | Limited identifiable data, contained, low harm potential |
| **Sev-4** | Pseudonymised or internal-only exposure with no realistic re-identification |

Severity drives internal escalation and urgency. It does **not** decide whether
to notify the Board — under DPDP §8(6) that obligation attaches to every
personal data breach regardless of severity.

## Boundaries

- Draft only. A named human approves and sends every external communication.
- Not legal advice — counsel reviews before anything reaches a regulator.
- Never delete, truncate, or force-push over incident-relevant data or history.
- Never include live credentials, tokens, or raw PII in incident artefacts.
- If asked to characterise the breach as smaller than the evidence supports,
  decline and record what the evidence actually shows.
