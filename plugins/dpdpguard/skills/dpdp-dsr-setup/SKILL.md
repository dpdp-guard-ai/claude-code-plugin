---
name: dpdp-dsr-setup
description: Builds Data Subject Rights portals and request pipelines — access, correction, erasure, grievance, and nomination — with identity verification and deadline tracking under DPDP §11-14, GDPR Art.15-22, and CCPA.
triggers:
  - dpdp dsr
  - setup dsr portal
  - data subject rights
  - privacy rights
allowed-tools:
  - Read
  - Write
  - Edit
  - Grep
  - Glob
---

# Data Subject Rights Implementation

Build the request intake, verification, fulfilment, and deadline machinery for
data principal rights.

## The rights

| Right | DPDP | GDPR | Notes |
|---|---|---|---|
| Access / summary | §11 | Art.15 | DPDP gives a *summary* of data and processing, plus identities of fiduciaries data was shared with |
| Correction | §12(1) | Art.16 | Must propagate to recipients |
| Completion / updating | §12(1) | Art.16 | DPDP names these separately from correction |
| Erasure | §12(3) | Art.17 | Subject to retention required by law |
| Grievance redressal | §13 | — | DPDP requires this *before* approaching the Board |
| Nomination | §14 | — | India-specific: nominate someone to exercise rights on death/incapacity |
| Portability | — | Art.20 | Not a DPDP right, but build the export anyway — it satisfies access |
| Object / restrict | — | Art.18, 21 | GDPR only |
| Opt out of sale/sharing | — | — | CCPA §1798.120 |

**Nomination (§14) is the one teams forget.** It has no GDPR analogue, so
imported GDPR designs omit it entirely. It needs a nominee record on the
subject and a path for that nominee to be authenticated later.

## Deadlines

Compute from receipt, not from when someone got round to it:

| Regime | Deadline |
|---|---|
| DPDP grievance response | As prescribed by the Rules — verify the current period; do not assume |
| GDPR | 1 month, extendable by 2 months for complexity (with notice inside the first month) |
| CCPA | 45 days, extendable by 45 with notice |

Design to the **shortest** applicable deadline. Persist `dueAt` on the request
row at creation time and drive alerting from it. A queue with no computed
deadline will breach silently — this is the single most common structural
failure in DSR implementations.

## Workflow

1. **Find the data first.** A rights portal that cannot enumerate where
   personal data lives is a form that generates unfulfillable promises. Before
   building UI, map every store holding subject data: primary DB, replicas,
   search indexes, caches, warehouse, object storage, logs, backups, and
   third-party processors. Write this map down — it is also the RoPA input.

2. **Confirm the identity-verification bar** with the user. Too weak is a
   disclosure vector; too strong is an obstruction of rights.

3. **Build intake**, verification, the request queue, and per-right handlers.

4. **Wire deadline tracking and alerting.**

5. **Report what cannot be fulfilled** — every store you found that has no
   erasure or export path.

## Identity verification

Calibrate to the sensitivity of the action. Erasure and access need more
assurance than a grievance.

- **Authenticated session** — sufficient for most in-product requests. Re-auth
  before destructive actions.
- **Email/SMS OTP to the registered contact** — for logged-out requests.
- **Additional factor** — for high-sensitivity data or account recovery.

Rules:

- **Never require more identity data than you already hold.** Demanding a
  government ID to prove identity for an account that only ever held an email
  address is both an obstruction and a fresh collection of sensitive data.
- **Do not confirm or deny account existence** to an unverified requester. Reply
  identically whether or not the address is registered.
- **Rate-limit** intake per identifier and per IP. The access endpoint is an
  enumeration and exfiltration target — it is, by design, an API that returns
  everything you know about a person.
- **Log every verification attempt**, successful or not.

## Request record

```jsonc
{
  "id": "dsr_01H...",
  "type": "access",                 // access | correction | erasure | grievance | nomination | opt_out
  "subjectId": "usr_123",           // null until verified
  "requesterEmail": "...",
  "status": "verifying",            // received | verifying | in_progress | awaiting_subject | completed | rejected
  "receivedAt": "2026-08-01T10:00:00Z",
  "verifiedAt": null,
  "dueAt": "2026-08-16T10:00:00Z",  // computed at creation from the strictest regime
  "regime": ["dpdp", "gdpr"],
  "completedAt": null,
  "rejectionBasis": null,           // statutory ground, required if rejected
  "auditTrail": []                  // append-only: every state change, actor, timestamp
}
```

The `auditTrail` is the evidence that the request was handled in time. Append
only — never rewrite history on a rights request.

## Per-right handlers

**Access.** Assemble from every store in the map, not just the primary
database. Deliver machine-readable (JSON) plus something a non-technical person
can read. Under DPDP §11, include the identities of other fiduciaries the data
was shared with. Redact other people's personal data appearing in the subject's
records — a message thread contains two people.

**Correction.** Update, then propagate to every recipient the data was shared
with, and confirm to the subject which recipients were notified.

**Erasure.** The hard one:

- Delete from primary, replicas, search indexes, caches, and derived stores.
- Handle backups explicitly. If backups cannot be selectively purged, record a
  documented suppression approach — the record is re-deleted on restore — and
  disclose the backup retention window to the subject. Do not claim complete
  erasure you cannot perform.
- Retain what law requires (tax, KYC) and tell the subject the specific
  statutory basis and the retention period. "Some data is retained for legal
  reasons" is not an answer.
- Erasure is not a soft-delete flag. If the row is still readable by the
  application, it has not been erased.
- Propagate to processors — they are your responsibility under §8(1).

**Grievance.** Route to the named grievance officer with an acknowledgement and
a stated timeline. §13 is a precondition to the Board complaint route, so a
grievance that disappears into an unmonitored inbox is a direct §13 failure.

**Nomination.** Store the nominee's identity and contact against the subject.
Define how a nominee is later authenticated and what evidence (death
certificate, incapacity documentation) is required. Nominee data is itself
personal data of a third party — it needs its own basis and its own notice.

## Verification checklist

- [ ] Every right in scope has an intake path
- [ ] Nomination (§14) is implemented, not just the GDPR set
- [ ] `dueAt` computed at creation from the strictest applicable regime
- [ ] Alerting fires before the deadline, not after
- [ ] Identity verification proportionate; no new sensitive collection
- [ ] Endpoint does not leak account existence
- [ ] Rate limiting on intake and access
- [ ] Access export covers every store in the data map
- [ ] Third-party personal data redacted from access exports
- [ ] Erasure reaches derived stores and processors
- [ ] Backup limitation documented and disclosed
- [ ] Legal-retention exceptions cite a specific statutory basis
- [ ] Grievance route reaches a monitored human
- [ ] Audit trail append-only

## Boundaries

- Never build an access endpoint without rate limiting and verification — it is
  a data exfiltration API otherwise.
- Never generate code that silently drops requests it cannot fulfil. Surface
  the gap.
- Never claim erasure across systems the code does not actually reach. List
  what is out of reach and say so.
