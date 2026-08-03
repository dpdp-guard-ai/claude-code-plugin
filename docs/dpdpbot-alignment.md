# Plugin ↔ DPDP Guard platform alignment

A review of this plugin's skills, commands, and agents against the DPDP Guard
platform (`dpdpbot`) as it actually ships, plus the recommendations that came
out of it.

Reviewed against: `openapi/v1.yaml` (`2.4.1`), `openapi/mcp-v1.tools.json`
(`catalogVersion 1.0.0`, 48 tools), `packages/contract` (`@dpdpguard/contract`
`1.2.0`), `docs/adr/0001`–`0007`, `docs/adr/compatibility-matrix.md`, and
`docs/specs/{mobile-server-sdk,agent-operable-platform}.md`.

## Summary

The plugin's **compliance content is sound** — the audit rule catalog, breach
workflow, child-protection thresholds, and the drafting boundaries in
`dpo-assistant` all hold up against the statute and against how the platform
models these obligations.

The **platform-facing content did not**. Before this change the plugin
described a DPDP Guard that does not exist: one npm package, a hosted MCP
endpoint on a shared host, and eight MCP tools, three of which were named
wrongly. The real platform ships **nine packages across five registries**, a
**per-deployment** MCP surface, and a **48-tool catalog** with a proposal-based
write model that changes what an agent can be asked to do.

Everything below is either fixed in this change or listed as a recommendation
with an owner.

## Gaps found, and what was done

### G1 — `@dpdpguard/sdk` does not exist · **fixed**

`dpdp-integration` and `/dpdp-integrate` instructed the model to run
`npm view @dpdpguard/sdk version` and to read types from
`node_modules/@dpdpguard/sdk`. No such package is published.

This is the most damaging kind of error in a skill: it sends the model to
install an unverified name, and a plugin published under the `dpdpguard`
keyword pointing users at an unclaimed npm name is a supply-chain hazard as
much as a broken instruction.

Real packages, per `docs/adr/compatibility-matrix.md`:

| Component | Package | Registry |
|---|---|---|
| Web JS core | `@dpdpguard/js` | npm |
| React Native | `@dpdpguard/react-native` | npm |
| Node server | `@dpdpguard/server` | npm |
| Python server | `dpdpguard-sdk` (`import dpdpguard`) | PyPI |
| JVM server | `ai.dpdpguard:server-sdk` | Maven Central |
| Android consent | `ai.dpdpguard:consent-sdk` | Maven Central |
| iOS consent | `DPDPGuardConsent` | SPM (git tag) |
| Flutter | `dpdpguard_flutter` | pub.dev |
| Wire contract | `@dpdpguard/contract` | npm (Apache-2.0) |

**Fixed:** new `dpdp-sdk-selector` skill with a full component matrix;
`dpdp-integration` and `/dpdp-integrate` corrected and pointed at it.

### G2 — three MCP tool names were wrong · **fixed**

`dpdp-operations`, `/dpdp-score`, and `/dpdp-dsr` named tools the catalog does
not contain:

| Named in plugin | Actually |
|---|---|
| `compliance_score_get` | `posture_get` |
| `dsr_acknowledge_propose` | `dsr_status_propose` (requires a `rationale`) |
| `breach_dpb_notify_propose` | `breach_notification_draft` / `breach_report_propose` |

The failure mode is quiet: the skill correctly refuses to fabricate data when
the server is unreachable, so a wrong tool name reads to the user as "the
backend is down" rather than "the plugin is wrong".

**Fixed:** all three corrected, and the read/proposal tables in
`dpdp-operations` expanded from 8 tools to the real catalog, with the full
listing in `dpdp-mcp-connect/references/tool-catalog.md`.

### G3 — no skill covered connecting to the agent surface at all · **fixed**

`plugin.json` declares `requires.mcp: ["dpdpguard"]` and three
skills/commands assume a working MCP connection, but nothing in the plugin told
anyone how to get one. `bin/init.js` wrote `api_url:
"https://mcp.dpdpguard.com/v1"` — a shared host that is not how the surface
works. `/mcp/v1` is hosted per-deployment as Convex HTTP Actions on the
organisation's own tenant.

Also absent, and each of them changes how work should be planned:

- **Two credential classes.** A scoped agent key (`dpdpg_agent_…`, org-scoped,
  mandatory expiry) versus a delegated OAuth 2.1 + PKCE grant that inherits one
  named human's role. Interactive Claude Code sessions want the grant.
- **Non-conflation is enforced at the resolver.** A service key
  (`dpdpg_live_…`) cannot authenticate `/mcp/v1`, and an agent key cannot reach
  `/api/v1`. Pasting the wrong one is a class error, not a typo.
- **Twelve scope families**, no `*`, and no scope that commits a write.
- **Capability is a runtime property** of flags × plan tier × scopes × the org's
  own kill switch. `capabilities_list` is the only honest answer to "what can I
  do here"; the catalog alone is not.
- **PII is redacted by default**, with a stable `principalRef` hash for
  correlation. `pii:read` is flag-gated, off by default, and needs DPO approval.
- **Agents read attacker-controllable text.** Grievance bodies and DSR free
  text are third-party authored; summarising one is processing untrusted input.

**Fixed:** new `dpdp-mcp-connect` skill and `/dpdp-connect` command;
`bin/init.js` no longer writes a fictitious host.

### G4 — the proposal model was under-specified · **fixed**

`dpdp-operations` got the most important thing right — never report a proposal
as an executed action — but described it as a plugin-side convention. It is a
platform invariant with teeth, and knowing that changes what you can plan:

- Four risk classes: `read`, `draft`, `proposal`, `blocked`.
- Approval **re-runs the underlying mutation under the approving human's
  identity**, so every existing permission check applies unchanged and the audit
  row attributes to a real person with the agent attached as provenance. A
  proposal cannot launder permission.
- **There is no `proposal_approve` tool and there will not be one.**
- `dsr_denial_propose` and `breach_report_propose` require a *second* reviewer.
- `dsr_status_propose` carries a statutory-clock TTL — a stale proposal expires
  rather than being approvable into a missed deadline.
- Notice **publication** is not an agent action, by design.

**Fixed:** documented in `dpdp-mcp-connect`, with proposal-tracking tools
(`proposal_list` / `_get` / `_withdraw` / `_outcomes_since`) and `deep_link` for
human handback.

### G5 — server-side enforcement was missing entirely · **fixed**

The plugin scaffolded consent capture and gated client-side tags, and stopped
there. The platform's own SDK spec is direct about why that is not enough: *"A
CMP that only captures consent on the client is not a compliance system."*

Nothing in the plugin covered the server side, where most DPDP obligations are
actually met:

- **`ConsentGate` enforcement** before processing — the server-side counterpart
  to on-device gating, and the thing that makes a withdrawal have an effect.
- **Token brokering** via `POST /api/v1/auth/broker-token`. Absent this, teams
  ship the service API key to the client. The endpoint takes the fiduciary's own
  `externalId`; a backend that accepts `externalId` from a request body has an
  impersonation hole.
- **Webhook receipt** — HMAC-SHA256 over the raw body in `X-DPDP-Signature`.
  `consent.withdrawn` is the event with a live obligation attached: a withdrawal
  recorded in DPDP Guard and never applied in the fiduciary's own stack leaves
  DPDP §6(4)–(6) unmet regardless of what the dashboard shows.
- **Audit-trail export**, **DSR orchestration**, **breach ingestion**.

**Fixed:** new `dpdp-server-sdk` skill plus a webhook-handling reference.
`dpdp-integration` now states that a client-only integration is unfinished
whenever the workspace contains a backend.

### G6 — no path for languages without an SDK · **fixed**

`dpdp-integration` listed Go under "supported stacks". There is no Go SDK. The
platform's documented answer is generation from `@dpdpguard/contract`'s
`openapi/v1.yaml` with `openapi-generator`.

The contract also carries two things a hand-rolled client always gets wrong:
the machine-readable **error-code catalog** (branch on `code`, never on the
prose `error` string) and the **audit-hash golden vectors**, which are the
executable definition of the platform's "byte-for-byte identical regardless of
origin" claim.

**Fixed:** new `dpdp-contract-conformance` skill, covering generation, error
catalog, `Idempotency-Key` as server-side dedupe, the vectors as a CI gate, and
`X-DPDP-SDK` / RFC 8594 deprecation-header handling.

### G7 — the embeddable widget was undocumented · **fixed**

`src/consent-script.js` → `consent.js` is the zero-build integration path, and
for CMS, Shopify, and WordPress sites it is the *only* practical one. It was
absent from the plugin. It has real surface area: `data-dpdp-org` (or `?id=` on
the script src), `data-dpdp-auto-block`, per-resource
`data-dpdp-category` tagging, Google Consent Mode v2 wiring, and a
`window.DPDPGuard` gating API.

The failure mode worth calling out: **auto-blocking only blocks tagged
resources.** Enabling it without tagging produces a banner that blocks nothing
while implying it blocks everything.

**Fixed:** new `dpdp-consent-widget` skill.

### G8 — flag-gated 404s · **fixed**

Several `/api/v1` routes and the whole of `/mcp/v1` are feature-flag gated and
**return `404` while off** — behaving exactly as if the route does not exist.
During a first integration this reads as "the SDK is wrong" or "the spec is
stale", and teams debug in the wrong direction.

**Fixed:** documented in `dpdp-contract-conformance`, the
`dpdp-mcp-connect` troubleshooting table, and the component matrix.

### G9 — misleading defaults in `bin/init.js` · **fixed**

The generated `.dpdpguard.yaml` listed nine `supported_locales` by default,
contradicting the plugin's own guidance that a switcher must offer only
genuinely translated languages. Defaulted to `["en"]`.

## Open recommendations

Not implemented here — each needs a decision or work outside this repo.

| # | Recommendation | Owner |
|---|---|---|
| ~~R1~~ | ~~**Ship an MCP server entry with the plugin.**~~ **Done** — `plugins/dpdpguard/.mcp.json` registers the server at `${DPDPGUARD_TENANT_URL}/mcp/v1`, using the `${VAR}` expansion Claude Code supports in an HTTP server's `url`. That solves the per-deployment problem without `init.js` writing files. See "OAuth login" below. | plugin |
| R2 | **`bin/audit-ci.js` is a placeholder** while `action.yml` and `package.json` both expose it as `dpdpguard-audit`. A GitHub Action that no-ops is worse than one that does not exist. Either implement it against the `dpdp-audit` rule catalog or remove the binding. | plugin |
| R3 | **Reconcile `.dpdpguard.yaml` with the platform's own config.** The plugin's `organization.id`, `isSignificantDataFiduciary`, and `consent.supported_locales` duplicate state the platform already holds and can serve via `org_profile_get`. Prefer reading from the tenant over asking the user to restate it, and treat the file as local overrides. | plugin + platform |
| R4 | **Telemetry defaults on.** `.dpdpguard.yaml` ships `telemetry.enabled: true`. The skills disclose it at write time, which is the right behaviour, but a privacy-compliance tool defaulting outbound telemetry to on invites the obvious objection in exactly the security review this product is sold into. Recommend defaulting to `false`. | plugin |
| R5 | **The audit skill and `posture_gaps_list` are unconnected.** `/dpdp-audit` computes a local composite score from static findings; the platform computes its own posture score and a unified gap list. Two scores that disagree will be noticed. Recommend the audit report cite the live posture score alongside the static one when MCP is configured, and never present the static one as the organisation's compliance posture. | plugin |
| R6 | **Widen `pii-commit-guard.sh` to DPDP Guard credential prefixes.** The hook should treat `dpdpg_live_` and `dpdpg_agent_` as blocking patterns. The platform chose distinct prefixes precisely so a leaked key is identifiable on sight; the plugin should use that. | plugin |
| R7 | **`/cm/v1/consent` has no stable error `code`.** The `/api/v1` slice has a machine-readable catalog and the older CM slice does not, so a client spanning both cannot branch uniformly. Tracked upstream as a breaking-change follow-up; worth prioritising, since it is the slice a partner integration hits first. | platform |
| R8 | **Publish the MCP tool catalog as a versioned artifact.** `openapi/mcp-v1.tools.json` is the source of truth for names, risk classes, and scopes, but only `/api/v1` ships in `@dpdpguard/contract`. Publishing the catalog the same way would let this plugin pin a `catalogVersion` instead of restating tool names in prose — which is exactly how G2 happened. | platform |
| R13 | **`@dpdpguard/server` 2.0.0 exports `VERSION = "0.1.0"`.** A stale constant. It matters only if something reports it in the `X-DPDP-SDK` header, where it would misidentify the client against `convex/lib/sdkVersioning.ts`'s floors — which are inert today because no SDK sends the header yet, so this is cheap to fix now and confusing later. | sdk-node |
| R14 | **Reconcile `docs/specs/mobile-server-sdk.md` with the shipped SDKs.** The spec still shows a `ConsentGate` class that was never built, and its feature matrix credits client SDKs with capabilities that live only in the server package. The spec is what a new integrator reads first; it is currently the least accurate description of the SDKs. | platform |
| R10 | **The SPA consent screen is the remaining gap in the OAuth flow.** `/mcp/v1/oauth/authorize` validates the request and redirects to `/dashboard/fiduciary/agent-access/authorize`, which does not exist yet. The backend behind it (`describeAuthorizationRequest`, `createAuthorizationCode`) is built and tested; the page that calls them is not. Until it ships, the redirect lands on a 404 and no code is minted. | platform |
| R11 | **Security review is a merge gate for the agent surface, not a follow-up.** ADR-007 D6 names seven hardening controls (rate limit, per-org cap, 24h GC of unauthorized registrations, no secrets over an unauthenticated endpoint, redirect-URI allowlist validation at both registration and authorization, console visibility, spike alerting). The per-org cap and redirect-URI validation are implemented; rate limiting, GC of stale authorization codes, and spike alerting are not. | platform |
| R12 | **`dpdp_mcp_surface_enabled` defaults off and `apiKeys.create` is gated by `dpdp_cm_api_enabled`.** Together these mean no customer can reach the agent surface or mint an agent key today, whatever else is built. Enabling the surface is a product decision that needs to happen for any of this to be reachable. | platform |
| R9 | **Consider a `dpdp-dpia` skill.** The platform models DPIA programs, vendor assessments, cross-border transfer registries, and significant-data-fiduciary readiness. The plugin covers none of it, and SDF obligations are the highest-consequence slice of the Act for the platform's larger customers. | plugin |

## Verification pass against the published packages

The component matrix and the server-SDK skill were originally written from
`docs/specs/mobile-server-sdk.md` and `docs/adr/compatibility-matrix.md` — the
platform's own documentation. A later pass checked them against the **published
packages** (`npm pack` on `@dpdpguard/server` 2.0.0, `@dpdpguard/js` 2.0.0,
`@dpdpguard/convex` 0.2.2, plus the SDK repo READMEs). The spec and the shipped
code disagree in four places, and the shipped code wins.

**G10 — the consent gate is not what the spec describes.** The spec shows:

```ts
const gate = new ConsentGate({ apiKey });
if (!(await gate.isGranted({ userId, purpose: "Marketing" }))) return;
```

No `ConsentGate` class exists. The published export is a **pure predicate with
no network call**:

```ts
hasConsent(consents: ConsentRecord[], purpose: string): boolean
// ConsentRecord = { purpose: string; withdrawnAt?: number | null }
```

This is an architectural difference, not a naming one. There is no server-side
consent lookup on the client at all, so the fiduciary holds the consent state
and **webhooks are the mechanism that keeps it current**. The skill had treated
webhook handling as a later, separable step; it is load-bearing. Fixed, and the
"fail closed on timeout" advice — which assumed a network call — reframed
around stale state instead.

**G11 — `@dpdpguard/js` is the public, unauthenticated slice only.** The matrix
credited it with DSR filing, grievances, nominations, and parental verification.
The published package covers `getOrgBySlug`, `getNoticesForOrg`,
`getBannerConfig`, `giveConsentAnonymous`, `canonicalizeDataTypes`. Everything
requiring a credential is `@dpdpguard/server`. The split is by *authentication*,
not by browser-vs-server, which is the natural wrong assumption.

**G12 — `@dpdpguard/convex` was missing entirely.** A published Convex
Component (0.2.2) that is the correct choice for a Convex backend: it syncs DSR,
grievance, and notice state into component tables for live subscriptions,
mounts webhook verification via `registerRoutes(http)`, keeps its schema
isolated from the host app, and uses Web Crypto rather than Node's `crypto` so
it runs in the V8 runtime. Its methods take the Convex `ctx` and key on the
fiduciary's own `externalId` rather than a brokered token the caller manages.

**G13 — the SDK ships a webhook verifier; the skill told people to hand-roll
one.** `verifyWebhookSignature(secret, rawBody, signatureHeader)` in Node,
`verify_webhook_signature` in Python, automatic in the Convex component. The
hand-rolled `node:crypto` version is now documented only as the no-SDK
fallback — hand-writing a constant-time comparison when one ships is how
timing bugs get introduced.

Also corrected: `baseUrl` is a **required** client option (the skill mentioned
only `apiKey`), the Python SDK is **synchronous** (`httpx.Client`, not async),
DSR types are the closed set `summary | processors | correction | erasure`, and
`ApiErrorCode` is a 10-value union worth branching on exhaustively.

One upstream nit found in passing, logged as R13: `@dpdpguard/server` 2.0.0
exports `VERSION = "0.1.0"`. Harmless unless something reports it in the
`X-DPDP-SDK` header, where it would misidentify the client against the
minimum-version floors in `convex/lib/sdkVersioning.ts`.

## OAuth login for the agent surface

A follow-up review of ADR-007 D2's delegated-grant half found it **specified and
partly scaffolded, but not connectable**. Three independent reasons, all
verified in `dpdpbot` rather than taken from the ADR:

- `convex/lib/agentAuth.ts` accepted only `dpdpg_agent_` keys. `actorKind:
  "delegated"` was declared in the return type and never produced; the
  `agentSessions` table was never queried.
- No OAuth routes were mounted. `convex/http.ts` carried `/mcp/v1` (POST, GET,
  OPTIONS) and nothing else — no discovery documents, no `/authorize`, no
  `/token`, no `/oauth/register`. `mcpOAuth.dcrHandler` existed but was
  referenced nowhere.
- Nothing ever inserted an `agentGrants` row. The platform's own marketing copy
  had already audited this and declined to claim the capability publicly.

This mattered directly: `dpdp-mcp-connect` recommended the delegated grant as
the preferred path for interactive sessions, which was pointing users at a flow
that could not complete.

**Both halves are now built.**

On the platform (`dpdpbot`): a `agentAuthCodes` table, the twelve-family scope
vocabulary with ADR-007 D2's role intersection (`convex/lib/agentScopes.ts`),
PKCE verification (`convex/lib/pkce.ts`, checked against RFC 7636 Appendix B's
canonical vector), the authorization-code and refresh grants with rotation, RFC
9728 and RFC 8414 discovery documents, RFC 7009 revocation, and the
`WWW-Authenticate` header on 401 that makes client-side discovery work at all.
`resolveAgentCredential` now resolves delegated sessions, re-intersecting scopes
against the profile's **current** role on every request so a role change takes
effect immediately rather than at refresh time.

On the plugin: `.mcp.json`, plus a rewritten connection section in
`dpdp-mcp-connect`.

Two things are worth stating plainly about the platform work:

- **Claude Code implements the client half.** It flags a server on 401,
  discovers the authorization server from `WWW-Authenticate`, self-registers via
  DCR, runs the flow, and refreshes tokens. No OAuth client code was written or
  needed.
- **It has not been exercised against a live tenant.** The flow is covered by
  unit and `convex-test` integration tests, including replay, PKCE failure,
  refresh rotation, role downgrade, cross-org client rejection, and the kill
  switch. A real browser round-trip against a deployed tenant has not been run,
  and ADR-007 D6 puts this behind seven named hardening controls with
  security-review sign-off as a merge gate. Neither the review nor the
  SPA consent screen is done — see R10 and R11.

## What the plugin gets right, and should keep

Worth recording so a later refactor does not undo it:

- **Every state change is a draft or a proposal**, in the plugin and on the
  platform, independently arrived at. They agree, and they should stay agreed.
- **No predicted penalty amounts** — statutory maxima only, labelled as maxima.
  Penalty determination weighs factors a static scan does not observe.
- **Never asserting that an organisation "is compliant."** That is a regulator's
  determination against the statute.
- **`TODO(dpo):` over plausible filler** in any compliance artefact. Plausible
  filler in a RoPA is worse than a visible gap: the gap gets fixed, the filler
  gets relied on.
- **Refusing to destroy evidence** during incident response, including
  history-rewriting requests.
- **Never fabricating posture data** when the backend is unreachable.
