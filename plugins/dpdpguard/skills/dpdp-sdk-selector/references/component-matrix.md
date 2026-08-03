# DPDP Guard component matrix

Every shipped integration surface, the package that provides it, and what it
can do. **Versions in this file are a starting point, not a source of truth** —
confirm against the registry before writing one into a manifest.

## Published packages

| Component | Package / coordinate | Registry | Notes |
|---|---|---|---|
| Web JS core | `@dpdpguard/js` | npm | **Public, unauthenticated `/api/v1` only** — org, notices, banner config, anonymous consent. Not a general client. |
| React Native | `@dpdpguard/react-native` | npm | JS bridge over the native consent engines. |
| Node server | `@dpdpguard/server` | npm | Reference server implementation; the authenticated surface. |
| Python server | `dpdpguard-sdk` (`import dpdpguard`) | PyPI | Mirrors `@dpdpguard/server` in snake_case. **Synchronous** (`httpx.Client`). |
| JVM server | `ai.dpdpguard:server-sdk` | Maven Central | Kotlin/Java. |
| **Convex backend** | `@dpdpguard/convex` | npm | Convex **Component**, not a client. Reactive local caching, `registerRoutes()` webhook mounting, isolated schema, Web Crypto (V8-safe). Peer: `convex ^1.43.0`. |
| Android consent | `ai.dpdpguard:consent-sdk` | Maven Central | Native banner, preference centre, on-device gating. |
| iOS consent | `DPDPGuardConsent` | Swift Package Manager (git tag) | No CocoaPods leg, by design. |
| Flutter | `dpdpguard_flutter` | pub.dev | Platform-channel bridge over the native engines. Check the live pub.dev version — it has lagged the repo tag. |
| Wire contract | `@dpdpguard/contract` | npm (Apache-2.0) | OpenAPI 3.1 spec, error catalog, audit-hash vectors. |
| Embeddable widget | `consent.js` | script tag, served from the DPDP Guard widget host | No package manager involved. |

**There is no `@dpdpguard/sdk`.** Any reference to it is stale.

### `@dpdpguard/js` vs `@dpdpguard/server` — the line that catches people

They are not "browser one" and "server one". The split is **by authentication**:

| | `@dpdpguard/js` | `@dpdpguard/server` |
|---|---|---|
| Surface | public, unauthenticated `/api/v1` | authenticated `/api/v1` |
| Methods | `getOrgBySlug`, `getNoticesForOrg`, `getBannerConfig`, `giveConsentAnonymous`, `canonicalizeDataTypes` | the above plus `brokerToken`, DSR, grievance, nomination, `linkAnonymousConsent` |
| Consent gate | — | `hasConsent(consents, purpose)` |
| Webhook verify | — | `verifyWebhookSignature(...)` |
| Audit hash | — | `computeAuditHash`, `canonicalizeAuditEvent` |

DSR filing, grievances, nominations, and token brokering live in
`@dpdpguard/server` and **cannot** be done from `@dpdpguard/js`. Reaching for
the js package to file a DSR is the predictable wrong turn.

Languages with **no** official SDK — Go, Ruby, PHP, .NET, Rust, Elixir — are
served by generating a client from `@dpdpguard/contract`'s `openapi/v1.yaml`.
See the `dpdp-contract-conformance` skill.

## Capability matrix

Verified against the published packages, not only the spec.

| Capability | Widget | JS | RN | Android | iOS | Flutter | Server SDKs | Convex |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| Fetch published notices (multilingual) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Consent banner + preference centre | ✅ | — | ✅ | ✅ | ✅ | ✅ | — | — |
| Give consent — anonymous | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | — |
| Tracker / script auto-blocking | ✅ | — | — | — | — | — | — | — |
| On-device SDK gating | ✅ | — | ✅ | ✅ | ✅ | ✅ | — | — |
| **Server-side consent gate** | — | — | — | — | — | — | ✅ `hasConsent` | ✅ |
| Offline queue + local proof | — | — | ✅ | ✅ | ✅ | ✅ | n/a | n/a |
| Anonymous → linked consent | ✅ | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| DSR filing + status | — | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Grievance filing | — | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Nomination (successor) | — | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Token brokering** | — | — | — | — | — | — | ✅ | ✅ |
| **Webhook receipt + HMAC verify** | — | — | — | — | — | — | ✅ | ✅ auto-mounted |
| **Audit-hash compute / verify** | — | — | — | — | — | — | ✅ | — |
| Reactive local cache of DSR/grievance/notice | — | — | — | — | — | — | — | ✅ |

The `@dpdpguard/js` column is narrower than it looks in the spec's own feature
matrix: the published package covers the **public, unauthenticated** slice
only. Anything requiring a credential is `@dpdpguard/server`.

Breach workflow, parental/age verification, and audit-trail export appear in
the platform spec's feature matrix but are **not** methods on the published
Node client. Treat them as HTTP endpoints to call directly (or via a generated
client) until an SDK method exists — do not assume a helper is there.

The rows in bold are the ones a client-only integration silently leaves
unimplemented. A consent management platform that captures consent on the
client and never enforces it server-side has recorded a preference, not
operationalised it.

## API surfaces and their credentials

| Surface | Path | Credential | Contract |
|---|---|---|---|
| Consent Manager API | `/cm/v1/consent` | service API key | `openapi/v1.yaml`; free-text error shape (no stable `code`) |
| Mobile / server API | `/api/v1/*` | service API key, brokered principal token, or staff token | `openapi/v1.yaml`; stable `ApiError` catalog |
| Fiduciary staff API | `/api/v1/staff/*` | staff session token (direct login) | same |
| Agent surface | `/mcp/v1` | scoped agent key or delegated grant | `openapi/mcp-v1.tools.json`, own `catalogVersion` axis |

Base URL is per-deployment (`https://{deployment}.convex.site` in the OpenAPI
`servers` block). Read it from the organisation's own dashboard or provisioning
record — do not hardcode a hostname seen in a doc.

Several `/api/v1` routes are **feature-flag gated** and return `404` while the
flag is off, which reads to a client exactly like "route does not exist". When
an endpoint 404s during integration, check the flag before concluding the SDK is
wrong. Known flag-gated routes include the CM API (`dpdp_cm_api_enabled`), the
mobile/server API (`dpdp_mobile_api_enabled`), the three partner read routes
(retention-due, breaches, cross-border transfers), and the whole `/mcp/v1`
surface (`dpdp_mcp_surface_enabled`).

## Versioning axes

Four axes move independently. Confusing them causes upgrade churn:

| Axis | Scheme | Bumps when |
|---|---|---|
| Wire API | major in path, `/api/vN` | breaking wire change |
| Contract artifact | semver on `@dpdpguard/contract` | major = breaking wire/error-catalog change |
| Each SDK | semver per package | own commits, plus a forced major when the contract goes major |
| MCP tool catalog | semver in `catalogVersion` | major = tool removed or parameter narrowed |

SDKs send `X-DPDP-SDK`; the API supports N-1 majors and surfaces deprecations as
RFC 8594 `Deprecation` / `Sunset` / `Link` response headers. An SDK that logs
those headers gives the team warning; one that discards them does not.
