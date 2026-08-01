# DPDP Guard component matrix

Every shipped integration surface, the package that provides it, and what it
can do. **Versions in this file are a starting point, not a source of truth** —
confirm against the registry before writing one into a manifest.

## Published packages

| Component | Package / coordinate | Registry | Notes |
|---|---|---|---|
| Web JS core | `@dpdpguard/js` | npm | Typed client generated against the contract. |
| React Native | `@dpdpguard/react-native` | npm | JS bridge over the native consent engines. |
| Node server | `@dpdpguard/server` | npm | Reference server implementation. |
| Python server | `dpdpguard-sdk` (`import dpdpguard`) | PyPI | Mirrors `@dpdpguard/server` method for method. |
| JVM server | `ai.dpdpguard:server-sdk` | Maven Central | Kotlin/Java. |
| Android consent | `ai.dpdpguard:consent-sdk` | Maven Central | Native banner, preference centre, on-device gating. |
| iOS consent | `DPDPGuardConsent` | Swift Package Manager (git tag) | No CocoaPods leg, by design. |
| Flutter | `dpdpguard_flutter` | pub.dev | Check the live pub.dev version — it has lagged the repo tag. |
| Wire contract | `@dpdpguard/contract` | npm (Apache-2.0) | OpenAPI 3.1 spec, error catalog, audit-hash vectors. |
| Embeddable widget | `consent.js` | script tag, served from the DPDP Guard widget host | No package manager involved. |

**There is no `@dpdpguard/sdk`.** Any reference to it is stale.

Languages with **no** official SDK — Go, Ruby, PHP, .NET, Rust, Elixir — are
served by generating a client from `@dpdpguard/contract`'s `openapi/v1.yaml`.
See the `dpdp-contract-conformance` skill.

## Capability matrix

| Capability | Widget | JS | RN | Android | iOS | Flutter | Server SDKs |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| Fetch published notices (multilingual) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Consent banner + preference centre | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| Give / withdraw consent (audited) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ (on behalf, brokered) |
| Tracker / script auto-blocking | ✅ | partial | — | — | — | — | — |
| On-device SDK gating (`isGranted`) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| **Server-side consent enforcement** | — | — | — | — | — | — | ✅ |
| Offline queue + local proof | — | — | ✅ | ✅ | ✅ | ✅ | n/a |
| Anonymous → linked consent | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| DSR filing + status | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ (orchestrate) |
| Grievance filing | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Nomination (successor) | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Parental / age verification | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ (initiate) |
| **Token brokering** | — | — | — | — | — | — | ✅ |
| **Webhook receipt + HMAC verify** | — | — | — | — | — | — | ✅ |
| **Audit-trail export** | — | — | — | — | — | — | ✅ |
| Breach workflow (principal / Board / 72h) | — | — | — | — | — | — | ✅ |

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
