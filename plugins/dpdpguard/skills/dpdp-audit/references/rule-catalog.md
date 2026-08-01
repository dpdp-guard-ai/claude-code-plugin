# Audit Rule Catalog

Detection rules used by the `dpdp-audit` skill. Every rule lists a grep-able
signal, the confirmation step, the statutory hook, and a default severity.

**A grep hit is a candidate, never a finding.** Always perform the confirmation
step before recording anything.

Rule IDs are stable — cite them in reports so findings can be tracked across
runs.

---

## A. PII leakage (`DPDP-A*`)

### DPDP-A01 — Personal data in application logs

- **Signal:** `(console\.(log|info|warn|error)|logger\.\w+|print\(|fmt\.Print|System\.out)` on the same line as `email|phone|aadhaar|pan|passport|ssn|dob|address|token|otp`
- **Confirm:** the logged value is a real subject identifier, not a literal or a
  redacted/hashed wrapper.
- **Statute:** DPDP §8(5); GDPR Art.32(1)(a)
- **Default:** Critical

### DPDP-A02 — Personal data in URL query parameters

- **Signal:** `[?&](email|phone|mobile|aadhaar|token|otp|user_email)=` in route
  definitions, `fetch`/`axios` calls, or redirect builders
- **Confirm:** the parameter carries a subject identifier on a GET request.
  Query strings land in server access logs, browser history, and `Referer`
  headers.
- **Statute:** DPDP §8(5); GDPR Art.5(1)(f)
- **Default:** High

### DPDP-A03 — Unencrypted sensitive column

- **Signal:** in `*.prisma`/`*.sql`/migration files, a column named
  `aadhaar|aadhar|pan|passport|biometric|health|card_number|cvv|account_number`
  with no encryption wrapper, no `@encrypted` annotation, and no vault reference
- **Confirm:** read the model and the write path — encryption may be applied in
  the application layer.
- **Statute:** DPDP §8(5); GDPR Art.32(1)(a); PDPA §37
- **Default:** Critical

### DPDP-A04 — Personal data sent to a third-party service

- **Signal:** `Sentry.captureException`, `datadog`, `logrocket`, `fullstory`,
  `mixpanel.track`, `analytics.identify` receiving an object that includes PII
  fields
- **Confirm:** trace the payload. Look for a `beforeSend`/scrubber hook — its
  presence usually clears the finding.
- **Statute:** DPDP §8(1) (fiduciary remains liable for processor conduct); GDPR Art.28
- **Default:** High

### DPDP-A05 — Hardcoded credential or API key

- **Signal:** `(api[_-]?key|secret|password|token)\s*[:=]\s*["'][A-Za-z0-9_\-]{16,}`
- **Confirm:** not a placeholder (`xxx`, `changeme`, `<your-key>`) and not in a
  `.example` file.
- **Statute:** DPDP §8(5); GDPR Art.32
- **Default:** Critical

---

## B. Consent (`DPDP-B*`)

### DPDP-B01 — Pre-ticked consent control

- **Signal:** `type="checkbox"` with `checked` / `defaultChecked` / `:checked="true"`
  within a consent, marketing, newsletter, or terms component
- **Confirm:** the control gates a processing purpose rather than a UI
  preference. Consent must be an affirmative act.
- **Statute:** DPDP §6(1); GDPR Art.4(11) and Recital 32
- **Default:** High

### DPDP-B02 — Bundled consent

- **Signal:** one consent control whose label joins purposes with
  `and|&|,` — e.g. "I agree to the terms and to receive marketing"
- **Confirm:** two or more distinct purposes ride on a single control. Consent
  must be specific to each purpose.
- **Statute:** DPDP §6(1); GDPR Art.7(2)
- **Default:** High

### DPDP-B03 — Asymmetric accept/reject prominence (dark pattern)

- **Signal:** in a consent banner, an accept control with `primary|cta|btn-lg`
  styling next to a reject control styled `link|text-xs|ghost|muted`, or no
  reject control at all
- **Confirm:** compare the rendered emphasis of both controls. Rejecting must be
  as easy as accepting.
- **Statute:** DPDP §6(4); GDPR Art.7(3)
- **Default:** High

### DPDP-B04 — No consent withdrawal mechanism

- **Signal:** consent is recorded (a `consent` table, `setConsent`, cookie
  write) but no route/handler matches `withdraw|revoke|opt.?out|preferences`
- **Confirm:** search the whole repo — withdrawal may live in a settings page.
- **Statute:** DPDP §6(4)–(6); GDPR Art.7(3); CCPA §1798.120
- **Default:** High

### DPDP-B05 — Tracking fires before consent

- **Signal:** analytics/pixel initialisation (`gtag(`, `fbq(`, `hj(`,
  `<script src=...googletagmanager`) at module top level or in a root layout,
  with no consent check guarding it
- **Confirm:** no `if (consent...)`, no consent-mode default, no lazy-load gate
  on the path to execution.
- **Statute:** DPDP §6(1); GDPR Art.6(1)(a) + ePrivacy Art.5(3)
- **Default:** High

---

## C. Retention and erasure (`DPDP-C*`)

### DPDP-C01 — PII table with no retention binding

- **Signal:** a model holding PII with no `deletedAt`, `expiresAt`, `ttl`,
  `retentionPolicy`, or documented purge job
- **Confirm:** grep for a scheduled job referencing the table before flagging.
- **Statute:** DPDP §8(7); GDPR Art.5(1)(e)
- **Default:** Medium

### DPDP-C02 — Erasure implemented as soft delete only

- **Signal:** a deletion endpoint that sets `deleted = true` / `deletedAt` with
  no downstream hard-delete or anonymisation job
- **Confirm:** search for a job that eventually purges soft-deleted rows.
- **Statute:** DPDP §12(3); GDPR Art.17
- **Default:** Medium

### DPDP-C03 — Erasure does not reach backups or derived stores

- **Signal:** a delete path that touches the primary database only, while the
  repo also configures a search index, cache, warehouse, or export pipeline
  (Elasticsearch, Algolia, Redis, BigQuery, S3 exports)
- **Confirm:** no corresponding delete/reindex call in the same path.
- **Statute:** DPDP §12(3); GDPR Art.17(1)
- **Default:** Medium

---

## D. Children's data (`DPDP-D*`)

### DPDP-D01 — No age verification before processing

- **Signal:** a signup/registration flow with no `age|dob|date_of_birth|birthYear`
  capture and no age-assurance provider call
- **Confirm:** the service is consumer-facing and in scope for §9.
- **Statute:** DPDP §9(1); GDPR Art.8
- **Default:** High

### DPDP-D02 — Behavioural tracking or targeted ads on minor accounts

- **Signal:** analytics/ad calls on a code path where `isMinor`, `age < 18`, or
  a child account type is in scope, with no suppression branch
- **Confirm:** trace whether the tracking call is reachable for a minor.
- **Statute:** DPDP §9(3) (absolute prohibition — no consent cures it)
- **Default:** Critical

### DPDP-D03 — Parental consent collected but not verifiable

- **Signal:** a parental-consent flow that accepts a self-asserted checkbox or
  an unverified email address as proof
- **Confirm:** no token/OTP/DigiLocker/payment-based verification step exists.
- **Statute:** DPDP §9(1) ("verifiable consent"); GDPR Art.8(2)
- **Default:** High

---

## E. Rights and transparency (`DPDP-E*`)

### DPDP-E01 — No data subject rights endpoint

- **Signal:** no route matching `dsr|data-request|privacy/rights|export|download-my-data`
- **Confirm:** rights may be handled by a support inbox — check the privacy
  notice before flagging.
- **Statute:** DPDP §11–13; GDPR Art.15–22; CCPA §1798.100–105
- **Default:** High

### DPDP-E02 — No grievance officer / DPO contact published

- **Signal:** no `grievance|dpo@|privacy@|data-protection-officer` string in
  the notice, footer, or contact page
- **Statute:** DPDP §8(9) and §13; GDPR Art.13(1)(b)
- **Default:** Medium

### DPDP-E03 — Privacy notice missing required disclosures

- **Signal:** a privacy notice route/file lacking any of: fiduciary identity,
  purposes, rights, withdrawal method, grievance channel, Board complaint route
- **Statute:** DPDP §5(1)–(2) and Rule 3
- **Default:** Medium

### DPDP-E04 — Undisclosed cross-border transfer

- **Signal:** a data store, queue, or third-party SDK configured to a non-Indian
  region (`us-east-1`, `eu-west-*`, `.eu`, `.us` endpoints) with no
  corresponding transfer disclosure in the notice
- **Confirm:** read the notice for a transfer section.
- **Statute:** DPDP §16; GDPR Art.44–49; PDPA §28
- **Default:** High

### DPDP-E05 — No CCPA "Do Not Sell or Share" link

- **Signal:** the repo integrates ad-tech (Meta Pixel, Google Ads, TikTok
  pixel) and serves US traffic, but no `do-not-sell|opt-out-of-sale` route
  exists
- **Statute:** CCPA §1798.135
- **Default:** Medium

---

## F. Security safeguards (`DPDP-F*`)

### DPDP-F01 — Personal data over plaintext transport

- **Signal:** `http://` URLs in non-localhost API clients, or TLS verification
  disabled (`rejectUnauthorized: false`, `verify=False`, `InsecureSkipVerify`)
- **Statute:** DPDP §8(5); GDPR Art.32(1)
- **Default:** Critical

### DPDP-F02 — Weak or reversible password storage

- **Signal:** `md5|sha1|base64` applied to a password, or a password column
  written without `bcrypt|argon2|scrypt|pbkdf2`
- **Statute:** DPDP §8(5); GDPR Art.32(1)(a)
- **Default:** Critical

### DPDP-F03 — No audit log for personal data access

- **Signal:** admin/support routes reading subject records with no audit-trail
  write
- **Confirm:** check for middleware that logs access globally.
- **Statute:** DPDP §8(5); DPDP Rules (reasonable security safeguards)
- **Default:** Medium

---

## Extending this catalog

Add rules under the correct letter prefix and give each a stable ID. Every rule
needs all four parts — signal, confirmation step, statute, default severity.
A rule without a confirmation step produces false positives and will make the
whole report untrustworthy.
