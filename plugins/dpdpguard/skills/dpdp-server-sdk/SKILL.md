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
| **Convex** | `@dpdpguard/convex` | npm — see below |

**If the backend is a Convex app, use `@dpdpguard/convex` instead.** It is a
Convex Component, not a plain client: it syncs DSR requests, grievances, and
notices into component-owned tables so the app gets live subscriptions instead
of refetch loops, mounts webhook signature verification for you, keeps its
schema invisible to the host app, and verifies signatures with Web Crypto so it
runs in the V8 runtime without Node's `crypto`. Jump to "Convex apps" below.

Anything else — Go, Ruby, PHP, .NET, Rust — has no official server SDK. Do not
hand-write a client; use `dpdp-contract-conformance` to generate one from
`@dpdpguard/contract`.

**Verify the version against the registry before writing it into a manifest**
(`npm view @dpdpguard/server version`, `pip index versions dpdpguard-sdk`, the
Maven Central artifact page). Never write a remembered version string.

**Read the installed package's own types before calling anything.** The
signatures below were read off the published packages, but they move.
Scaffolding that calls methods which do not exist is worse than no scaffolding:
it typechecks in review and fails in production.

### The Node surface, as published

```ts
import {
  DpdpGuardClient,        // class — typed client over /api/v1
  hasConsent,             // (consents: ConsentRecord[], purpose: string) => boolean
  verifyWebhookSignature, // (secret, rawBody, signatureHeader) => boolean
  computeAuditHash,       // (input: AuditHashInput, secret: string) => string
  canonicalizeAuditEvent, // (input: AuditHashInput) => string
  DpdpGuardApiError,      // thrown on every non-2xx, carries `.code`
  ERROR_CATALOG,
} from "@dpdpguard/server";
```

`new DpdpGuardClient({ baseUrl, apiKey?, accessToken?, fetchImpl? })` —
**`baseUrl` is required**; it is the tenant's own deployment origin. Methods:
`getOrganization`, `getNotices`, `getNotice`, `getBannerConfig`, `brokerToken`,
`setAccessToken`, `linkAnonymousConsent`, `listDsrRequests`, `createDsrRequest`,
`listGrievances`, `createGrievance`, `getNomination`, `upsertNomination`,
`revokeNomination`.

The Python SDK mirrors this in snake_case (`DpdpGuardClient`, `has_consent`,
`verify_webhook_signature`, `compute_audit_hash`), is **synchronous** (built on
`httpx.Client`, not async), and raises `DpdpGuardApiError` with `.code` and
`.status`.

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

This is the highest-value part of the integration and the step teams skip. Find
every place the service processes personal data for a consent-dependent purpose
— marketing sends, analytics ingestion, profiling, enrichment, model training —
and gate it.

**Understand what the gate actually is before you design around it.**
`hasConsent` is a **pure predicate over consent records you already hold**. It
makes no network call and there is no server-side "is this user consented?"
lookup on the client:

```ts
import { hasConsent, type ConsentRecord } from "@dpdpguard/server";

// ConsentRecord = { purpose: string; withdrawnAt?: number | null }
if (!hasConsent(consents, "Marketing")) {
  return; // do not send
}
```

That shape has a consequence worth stating plainly, because it decides the
architecture: **the fiduciary holds the consent state, and webhooks are how it
stays current.** The SDK does not poll DPDP Guard per send. So Step 4 is not
optional garnish — it is the mechanism that keeps the array `hasConsent` reads
from going stale. An integration with a gate and no webhook consumer gates on
whatever it knew at signup.

Rules for the gate:

- **Fail closed.** If consent state is missing, unloaded, or stale beyond your
  tolerance, do not process. A gate that treats "unknown" as "granted" is worse
  than no gate, because it produces an audit trail saying consent was checked.
- **Gate at the point of processing, not at the point of collection.** State
  read once at signup and cached forever misses every subsequent withdrawal.
- **Purpose strings must match the purposes published in the notice.**
  `hasConsent` compares the purpose string exactly, so a gate keyed on
  `"marketing"` when the notice publishes `"Marketing communications"` silently
  never matches — and fails *closed*, so the symptom is campaigns quietly not
  sending rather than an error. Read the org's notices via
  `client.getNotices(orgId)`; do not invent purpose names.
- **Treat `withdrawnAt` as authoritative.** A record with a `withdrawnAt`
  timestamp is not consent, regardless of what else the row says.
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

**Use the SDK's verifier rather than hand-rolling HMAC.** It ships one, and a
hand-written comparison is where constant-time bugs live:

```ts
import { verifyWebhookSignature } from "@dpdpguard/server";

// (secret, rawBody, signatureHeader) => boolean
const ok = verifyWebhookSignature(
  process.env.DPDPGUARD_WEBHOOK_SECRET!,
  rawBody,
  req.headers["x-dpdp-signature"],
);

if (!ok) return res.status(401).end();
```

Python: `verify_webhook_signature(secret, raw_body, signature_header)`. Convex:
`registerRoutes(http)` wires verification for you — see "Convex apps" below.
Only hand-roll when the language has no SDK; `references/webhook-handling.md`
carries that fallback.

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

## Convex apps

`@dpdpguard/convex` is a Convex Component, so it is wired as one — not
instantiated as a client:

```ts
// convex/convex.config.ts
import { defineApp } from "convex/server";
import dpdpguard from "@dpdpguard/convex/convex.config";

const app = defineApp();
app.use(dpdpguard);
export default app;
```

```ts
// convex/http.ts — mounts the webhook route with signature verification
import { httpRouter } from "convex/server";
import { registerRoutes } from "@dpdpguard/convex/http";

const http = httpRouter();
registerRoutes(http);
export default http;
```

Then `new DpdpGuard(components.dpdpguard)`, whose methods take the Convex `ctx`
as their first argument and are split by context — queries read
(`getNotices`, `getBannerConfig`, `listDsrRequests`, `listGrievances`,
`getNomination`), actions write (`brokerToken`, `linkAnonymousConsent`,
`createDsrRequest`, `createGrievance`, `upsertNomination`, `revokeNomination`).
Call `configure(ctx, { baseUrl, apiKey, orgId })` once from a mutation before
anything else.

Two differences from the plain server SDK that change how you build:

- Methods are keyed on the fiduciary's own **`externalId`**, not a brokered
  token you manage — the component brokers internally.
- DSR, grievance, and notice state syncs into component tables, so the frontend
  subscribes to it live. Do not rebuild a polling refetch layer on top.

Requires `convex ^1.43.0` as a peer dependency.

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
