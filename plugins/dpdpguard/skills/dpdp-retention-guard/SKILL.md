---
name: dpdp-retention-guard
description: Data retention policy design and deemed-erasure scheduling under DPDP §8(7) and GDPR Art.5(1)(e). Use when auditing schemas for missing retention bindings, building purge jobs, or implementing inactivity-based deletion.
triggers:
  - dpdp retention
  - data deletion schedule
  - deemed erasure
  - retention policy
allowed-tools:
  - Read
  - Write
  - Edit
  - Grep
  - Glob
  - Bash
---

# Retention & Deemed Erasure

Design retention policies and build the jobs that enforce them.

## The obligation

**DPDP §8(7)** requires erasure once the specified purpose is no longer being
served and retention is not required by law — whichever is earlier. Consent
withdrawal also triggers it.

**The DPDP Rules prescribe an inactivity-based erasure period** for specified
classes of data fiduciaries (e-commerce, online gaming, social media
intermediaries above prescribed user thresholds), with advance notice to the
data principal before erasure.

Two things to get right here:

- **Verify the current prescribed period and the class thresholds** against the
  Rules as notified before you hardcode a number. The commonly-cited figure is
  three years of inactivity with 48 hours' advance notice, but the class
  definitions and thresholds are what determine whether it binds a given
  fiduciary at all. Ask the user which class they fall in rather than assuming.
- **The inactivity rule is a ceiling, not a licence.** §8(7) still requires
  erasure when the purpose ends, which is usually much sooner than any
  inactivity clock. A team that implements only the inactivity job has not
  satisfied §8(7).

**GDPR Art.5(1)(e)** requires the same in principle: no longer than necessary
for the purpose.

## Workflow

1. **Inventory PII-bearing stores.** Read schema files (`*.prisma`, `*.sql`,
   migrations, `models/`), plus object storage, logs, caches, search indexes,
   and warehouse tables. Anything holding subject data needs a policy.

2. **Bind each store to a purpose.** Retention is derived from purpose, never
   chosen for convenience. For each table ask: what purpose does this serve, and
   when does that purpose end? If nobody can answer, that is the finding —
   record it rather than inventing a period.

3. **Classify by clock** (below).

4. **Check for legal-retention overrides.** Tax, KYC/AML, employment, and
   sectoral rules mandate minimum retention that overrides erasure. These must
   be encoded as exceptions with a cited basis, not left as tribal knowledge.

5. **Generate the policy table and the jobs.**

6. **Report unbound stores** — every PII store with no policy is a finding.

## The two-clock pattern

Functional data and audit logs have different lawful bases and must not share a
retention schedule.

**Data clock** — records serving the processing purpose. Erased when the
purpose ends. Governed by §8(7).

**Log clock** — audit trails, consent records, security logs. Retained for the
period required to demonstrate compliance, then erased. These are evidence: a
consent record deleted with the user account destroys the proof that consent
was ever obtained, which is the fiduciary's burden under §6(1).

The practical consequence: **do not cascade-delete audit and consent records
when erasing a subject's functional data.** Pseudonymise the subject reference
in the log and retain the log for its own period. Deleting the evidence of
lawful processing to satisfy an erasure request converts one compliance
position into two failures.

## Policy declaration

Keep retention declarative and reviewable rather than scattered across cron
scripts:

```yaml
retention:
  - store: users
    purpose: "account provision"
    clock: data
    trigger: account_closure
    period: P30D                        # grace window before hard delete
    legalHold: null

  - store: orders
    purpose: "order fulfilment and statutory records"
    clock: data
    trigger: order_completion
    period: P8Y
    legalHold: "Income-tax Act record retention"   # cite the actual basis

  - store: consent_records
    purpose: "demonstrating lawful basis"
    clock: log
    trigger: consent_superseded
    period: P8Y
    note: "Never cascade-deleted with the subject account"

  - store: application_logs
    purpose: "security monitoring"
    clock: log
    trigger: write
    period: P90D
```

Use ISO 8601 durations. Every entry needs a `purpose` — an entry without one is
a period someone picked, not a policy.

## Deemed erasure job

If the inactivity rule applies to the fiduciary's class:

1. **Define inactivity precisely.** Last authenticated session, or last
   purposeful interaction? An automated background sync is not user activity,
   and counting it means the clock never starts. Write the definition down.
2. **Scan** for subjects past the threshold.
3. **Notify in advance** through the registered contact, stating what will be
   erased and how to prevent it (log in). Send early enough to be actionable —
   a notice to an inbox nobody reads 48 hours before deletion is compliance
   theatre if you have a longer window available.
4. **Re-check at execution time.** A subject who logged in after the notice
   must be excluded. Race conditions here delete active users' data.
5. **Execute** through the same erasure path as a DSR erasure — primary,
   replicas, derived stores, processors.
6. **Log the erasure** against the log clock, with the subject reference
   pseudonymised.

Build the job **idempotent and resumable**, with a dry-run mode that reports
what it would delete. Ship dry-run first and have a human read the output before
enabling execution. An unbounded delete job against production PII is the most
destructive thing in this plugin's surface area.

## Safety requirements for generated jobs

- Dry-run mode is mandatory and is the default.
- Hard cap on rows per run, with the cap explicit and alarming when hit.
- Batch with checkpoints so a partial failure does not lose position.
- Erasure emits an audit record before the delete commits.
- Never `TRUNCATE` and never delete without a `WHERE` bound on the retention
  predicate.
- Legal-hold check evaluated per record at execution time, not just at scan.

## Verification checklist

- [ ] Every PII store appears in the policy table
- [ ] Every entry states a purpose, not just a period
- [ ] Data and log clocks are separated
- [ ] Consent and audit records are not cascade-deleted with the subject
- [ ] Legal-retention exceptions cite a specific statutory basis
- [ ] Prescribed inactivity period and class threshold verified against the Rules
- [ ] Advance notice sent before inactivity erasure
- [ ] Activity re-checked at execution time
- [ ] Job is idempotent, batched, capped, and dry-run by default
- [ ] Erasure reaches derived stores and processors
- [ ] Backups handled explicitly, with the limitation documented

## Boundaries

- Never enable a destructive purge job without the user reviewing dry-run
  output first.
- Never invent a retention period. If the purpose does not determine one and no
  legal basis fixes one, report it as an open decision for the DPO.
- Never delete consent or audit evidence to satisfy an erasure request.
