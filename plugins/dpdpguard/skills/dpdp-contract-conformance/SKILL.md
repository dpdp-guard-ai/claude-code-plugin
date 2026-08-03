---
name: dpdp-contract-conformance
description: Integrate DPDP Guard from a language with no official SDK by generating a typed client from the published @dpdpguard/contract OpenAPI spec, and keep any client correct over time — error-catalog handling, audit-hash conformance vectors, idempotency keys, and N-1 API version and deprecation-header handling. Use for Go, Ruby, PHP, .NET, Rust, or when validating an existing hand-rolled client.
triggers:
  - dpdpguard contract
  - generate dpdpguard client
  - dpdpguard openapi
  - audit hash vectors
allowed-tools:
  - Read
  - Write
  - Edit
  - Grep
  - Glob
  - Bash
---

# Contract-Based Integration

`@dpdpguard/contract` is the published, versioned wire contract: the OpenAPI 3.1
spec for `/api/v1`, a machine-readable error-code catalog, and the audit-hash
canonicalization algorithm with golden conformance vectors. It is Apache-2.0 and
installable from npm even in projects that are not JavaScript — you are using it
as a data dependency, not a runtime one.

Use this skill when the target language has **no official server SDK** (Go,
Ruby, PHP, .NET, Rust, Elixir), or when auditing a client someone already
hand-wrote.

## Step 1 — Do not hand-write the client

A hand-written client drifts. The whole point of the contract package is that an
upgrade becomes a versioned dependency bump instead of a manual diff.

```bash
npm install --no-save @dpdpguard/contract

npx @openapitools/openapi-generator-cli generate \
  -i node_modules/@dpdpguard/contract/openapi/v1.yaml \
  -g go \
  -o ./internal/dpdpguard \
  --additional-properties packageName=dpdpguard
```

Swap `-g go` for any other generator target. Commit the generated code (so
builds are reproducible without a Node toolchain) and record the exact contract
version it came from in a comment or a small `CONTRACT_VERSION` constant —
otherwise nobody can tell later what shape the code was generated against.

**Pin an exact version or a caret range, never `latest`.** A major bump can
change generated types; regeneration should be a deliberate act.

If an official SDK *does* exist for the language, use it instead. Generation is
the fallback, not the default — the official SDKs are hand-maintained against
this same spec and carry the enforcement helpers (consent gate, token broker,
webhook verification) that a generated client does not.

## Step 2 — Handle the error catalog

`conformance/error-catalog.json` is the stable, machine-readable enum of `code`
values returned by `/api/v1`. Branch on `code`, never on the human-readable
`error` string — the string is not a contract and changes without a version bump.

Two caveats worth stating in the handover:

- The older `/cm/v1/consent` slice still returns a free-text-only error shape
  with no `code`. Code written against it cannot branch on a stable identifier;
  treat that as a known limitation rather than parsing prose.
- The catalog gained eleven codes specific to the `/mcp/v1` agent surface
  (`SCOPE_INSUFFICIENT`, `APPROVAL_REQUIRED`, `PROPOSAL_EXPIRED`,
  `SECOND_REVIEWER_REQUIRED`, and others). No `/api/v1` endpoint returns them —
  a generated `/api/v1` client that exhaustively matches every catalog code will
  carry dead branches. Harmless, but do not read their presence as evidence the
  API can emit them.

Map the domain errors the SDKs already carry — `MINOR_TRACKING_BLOCKED`,
`NOTICE_NOT_PUBLISHED`, `ALREADY_CONSENTED`, `NOT_ASSOCIATED_WITH_ORG`,
`INVALID_STATUS_TRANSITION` — to something a caller can act on. In particular,
`MINOR_TRACKING_BLOCKED` is a `403` that means the platform refused a
tracking/marketing purpose for a verified minor. That is DPDP §9(3) working as
intended, not a bug to retry around.

## Step 3 — Feature-flag 404s are not missing endpoints

Several `/api/v1` routes are flag-gated per platform and **behave as if the
route does not exist** while their flag is off — a `404`, not a `403`. A
generated client will report "not found" and a developer will conclude the spec
is wrong.

When an endpoint 404s during integration, check whether its flag is enabled for
the deployment before changing any code. Say this in the handover; it is the
single most confusing failure mode for a first integration.

## Step 4 — Idempotency

Consent writes are legal events. The `Idempotency-Key` header is server-side
dedupe on a stored key, not just client retry-safety: a replayed write returns
the original audit anchor rather than creating a second record.

- Send a stable key derived from the event, not a fresh UUID per attempt — a new
  key on retry defeats the entire mechanism and double-writes consent.
- Grievance filing accepts an optional `Idempotency-Key` too. Some official SDKs
  do not yet expose a way to pass it; if the project needs it there, check
  before assuming the method signature supports it.
- Anything with an offline queue **must** use it. A network flap on a queued
  write is exactly the double-write case this prevents.

## Step 5 — Verify against the golden vectors

**If an official SDK covers your language, do not reimplement this.**
`@dpdpguard/server` exports `computeAuditHash(input, secret)` and
`canonicalizeAuditEvent(input)`; the Python SDK exports `compute_audit_hash`
and `canonicalize_audit_event`. Use them. The vectors below are for verifying
an implementation you were forced to write, not for re-testing a shipped one.

If your integration computes or verifies audit hashes itself, run
`conformance/audit-hash-vectors.json` against your implementation before
trusting it. The vectors are golden input → output pairs for the HMAC-SHA256
canonicalization described in `conformance/audit-hash-spec.md`.

This matters more than it looks: the platform's value proposition is that a
consent record is byte-for-byte identical regardless of which client originated
it. An implementation that passes ad-hoc tests but fails a vector produces
records that will not compare against the rest of the estate, and the failure
surfaces years later during an evidence request.

Wire the vectors into CI as a required gate, not a one-time check.

## Step 6 — Version and deprecation handling

Four axes move independently — the wire API (`/api/vN`), the contract artifact's
semver, each SDK's own semver, and the MCP catalog version. Do not assume a
contract major implies a wire major; the contract has gone major for a
validation tightening that left the URL version untouched.

Build these two behaviours into any client:

- **Send `X-DPDP-SDK`** identifying the client and version. The API supports N-1
  majors and uses this for minimum-version floors.
- **Log RFC 8594 `Deprecation`, `Sunset`, and `Link` response headers** rather
  than discarding them. They are the only advance warning of a sunset, and a
  client that drops them gives the team none.

## Handover report

- Generator, target language, output path, and the **exact contract version**
  the code was generated from.
- Which endpoints the client actually exercises, and which of those are
  flag-gated.
- Error handling: does it branch on `code`, and which codes are handled versus
  falling through to a generic error.
- Idempotency: which writes send a key, and whether the key is stable across
  retries.
- Audit-hash vectors: run or not run, and the result.
- What a generated client does **not** give you compared to an official SDK —
  no consent gate, no token broker, no webhook verification. Those remain to be
  written by hand, and each is a place to get security wrong.

## Boundaries

- Never hand-write a client when generation is available.
- Never branch on error prose.
- Never pin `latest`.
- Never claim conformance without running the vectors.
- A conforming client is an engineering property. It is not a statement that the
  organisation meets its obligations under the DPDP Act.
