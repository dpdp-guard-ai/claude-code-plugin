---
name: dpdp-server-sdk
description: Wire a backend service to DPDP Guard's server SDKs — service API key handling, server-side consent enforcement before processing, short-lived principal token brokering for mobile and web clients, HMAC webhook verification, DSR and breach orchestration, and audit-trail export. Use for Node, Python, or JVM backends, or any server that must prove consent before it processes.
triggers:
  - dpdpguard server sdk
  - consent enforcement backend
  - broker principal token
  - dpdpguard webhook
allowed-tools:
  - Read
  - Write
  - Edit
  - Grep
  - Glob
  - Bash
---

# Server-Side DPDP Guard Integration

The server SDK is where most DPDP obligations are actually met. A client-side
consent banner records a preference; only the backend can **refuse to process**
when that preference says no, mint scoped credentials, react to a withdrawal,
and produce the audit trail a Data Protection Board request would ask for.

Run `dpdp-sdk-selector` first if the target service has not been identified.

## Packages

| Runtime | Package | Import |
|---|---|---|
| Node / TypeScript | `@dpdpguard/server` | npm |
| Python | `dpdpguard-sdk` | `import dpdpguard` |
| JVM (Kotlin / Java) | `ai.dpdpguard:server-sdk` | Maven Central |

Anything else — Go, Ruby, PHP, .NET, Rust — has no official server SDK. Do not
hand-write a client; use `dpdp-contract-conformance` to generate one from
`@dpdpguard/contract`.

**Verify the version against the registry before writing it into a manifest**
(`npm view @dpdpguard/server version`, `pip index versions dpdpguard-sdk`, the
Maven Central artifact page). Never write a remembered version string.

**Read the installed package's own types before calling anything.** The Node
and Python SDKs are hand-maintained against the contract, and the method names
below are the shape to expect, not a guarantee for the version the project
resolves. Scaffolding that calls methods which do not exist is worse than no
scaffolding: it typechecks in review and fails in production.

## Step 1 — Credentials

The server SDK authenticates with a **service API key** (`Authorization: Bearer
dpdpg_live_…`), org-scoped, never a data principal credential.

- `.env.example` gets `DPDPGUARD_API_KEY=` with a placeholder. Always.
- `.env` gets a real value only if the user supplies one, and only after you
  have confirmed `.env` is gitignored.
- **Check the prefix on every variable you add.** `NEXT_PUBLIC_`, `VITE_`,
  `EXPO_PUBLIC_`, `REACT_APP_` all ship the value to the client. A service key
  behind one of those is an org-wide credential published to every visitor.
- Only a hash of the key is stored server-side and the raw key is shown once at
  creation. If the user has lost it, the path is to mint a new one and revoke
  the old, not to recover it.

## Step 2 — Consent enforcement before processing

This is the highest-value ten lines in the whole integration and the step teams
skip. Find every place the service processes personal data for a
consent-dependent purpose — marketing sends, analytics ingestion, profiling,
enrichment, model training — and gate it.

```ts
import { ConsentGate } from "@dpdpguard/server";

const gate = new ConsentGate({ apiKey: process.env.DPDPGUARD_API_KEY! });

if (!(await gate.isGranted({ userId, purpose: "Marketing" }))) {
  return; // do not send
}
```

Rules for the gate:

- **Fail closed.** If the gate call errors or times out, do not process. A
  gate that treats "unknown" as "granted" is worse than no gate, because it
  produces an audit trail that says consent was checked.
- **Gate at the point of processing, not at the point of collection.** A flag
  read once at signup and cached forever misses every subsequent withdrawal.
- **Purpose strings must match the purposes published in the notice.** A gate
  keyed on `"marketing"` when the notice publishes `"Marketing communications"`
  silently never matches. Read the org's notice; do not invent purpose names.
- Grep for the processing that already happens — `sendgrid|mailchimp|segment|
  posthog|mixpanel|amplitude|braze|clevertap|webengage|openai|anthropic` — and
  report every call site you did **not** gate. An unreported ungated path is
  the defect this step exists to remove.

## Step 3 — Token brokering

Mobile and web clients must never hold the service API key. The backend mints a
short-lived principal token from the fiduciary's own stable user id:

```
POST /api/v1/auth/broker-token
Authorization: Bearer <service API key>
{ "externalId": "<the fiduciary's own org-scoped user id>" }
→ 201 { "accessToken": "...", "expiresAt": 1735689600, "tokenType": "Bearer" }
```

Implementation requirements:

- Expose **your own** authenticated endpoint (e.g. `POST /dpdp/token`) that
  brokers on behalf of the already-logged-in user. Never accept `externalId`
  from the client body — derive it from the session. Accepting it from the
  request is an impersonation hole: any user can mint a token for any other.
- No refresh token is issued. The client re-brokers through your backend when
  the token expires; do not build a refresh flow that does not exist.
- The brokered token proves the caller obtained it from your backend. It is not
  an independent identity check by DPDP Guard. Whatever identity assurance you
  applied at login is the assurance backing every DSR, grievance, and nomination
  filed with that token — state this in the handover, because it is the
  fiduciary's obligation under the rights-request provisions, not the
  platform's.

## Step 4 — Webhooks

DPDP Guard signs outbound webhook payloads with HMAC-SHA256 over the raw body
and sends the hex digest in `X-DPDP-Signature`.

```ts
import { createHmac, timingSafeEqual } from "node:crypto";

// The raw body — verify BEFORE any JSON parsing middleware touches it.
const expected = createHmac("sha256", process.env.DPDPGUARD_WEBHOOK_SECRET!)
  .update(rawBody)
  .digest("hex");

const ok =
  signature.length === expected.length &&
  timingSafeEqual(Buffer.from(signature), Buffer.from(expected));

if (!ok) return res.status(401).end();
```

- **Verify against the raw body.** A framework that parses and re-serialises
  JSON before your handler sees it will produce a different byte sequence and
  every signature will fail. In Express, mount `express.raw()` on the webhook
  route specifically.
- **Compare in constant time.** `===` on a signature leaks the digest.
- **Respond fast, process async.** A slow endpoint back-pressures delivery.
- **Be idempotent.** Retries are expected; a duplicate `consent.withdrawn`
  must not double-apply.

The event you must handle, if you handle only one, is **consent withdrawal**:
on receipt, stop the processing that consent authorised. A withdrawal recorded
in DPDP Guard and ignored by the fiduciary's own systems is the exact gap the
webhook exists to close, and it is squarely the fiduciary's obligation under
DPDP §6(4)–(6). See `references/webhook-handling.md` for the event families and
a handler skeleton.

## Step 5 — DSR, breach, and audit export

- **DSR orchestration.** Rights requests arrive with statutory deadlines. The
  server SDK lets the backend fetch the queue and drive fulfilment across the
  fiduciary's own systems — which is where erasure actually has to happen.
  Model the DPDP-specific automation the platform already carries: deemed
  erasure after the prescribed period of inactivity for the specified classes of
  fiduciary, the pre-erasure notification window, and processing-log retention.
  Do not invent these periods — read them from the org's configured retention
  policies and mark anything you cannot source as `TODO(dpo):`.
- **Breach helpers.** The SDK can open a breach record programmatically. It
  does not file with the Board and it does not notify data principals — those
  stay human sends. Under DPDP §8(6) every personal data breach is reportable;
  see the `dpdp-breach-response` skill for the workflow.
- **Audit export.** Pull the immutable consent audit trail for the fiduciary's
  own retention and DPO reporting. Store it where your own retention policy can
  reach it; the export is evidence, so treat write access to it accordingly.

## Step 6 — Verify

Run the project's own build, typecheck, lint, and test scripts. Report the
actual output. If the build breaks, fix it before handing over — do not report
success on an unbuilt integration.

Add at least one test that asserts the gate **denies** when consent is absent.
A test suite that only covers the granted path does not test the gate.

## Handover report

- Files created and modified.
- Environment variables added, each flagged public or server-only.
- Every consent-dependent processing call site found, and which ones are now
  gated. **List the ungated ones explicitly** — that list is the remaining risk.
- Webhook endpoint path, which events it handles, and whether signature
  verification was tested against a real signed payload or only unit-mocked.
- Build/typecheck/lint/test result — real output, not a claim.

## Boundaries

- Never commit a real API key or webhook secret.
- Never place a service key behind a client-exposed variable prefix.
- Never accept `externalId` from a client request body.
- Never invent SDK method signatures — read the installed package's types.
- Never let the consent gate fail open.
- This wiring helps meet specific obligations. It does not make an organisation
  compliant, and nothing here is legal advice.
