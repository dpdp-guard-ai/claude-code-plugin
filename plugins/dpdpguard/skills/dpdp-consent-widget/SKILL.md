---
name: dpdp-consent-widget
description: Install and configure DPDP Guard's drop-in embeddable consent widget (consent.js) on a website — script placement, org and domain-group identification, tracker auto-blocking via data-dpdp-category, Google Consent Mode v2 wiring, and the window.DPDPGuard gating API. Use for sites that need a compliant banner without a build-step SDK integration.
triggers:
  - dpdpguard widget
  - consent.js
  - cookie banner script
  - auto block trackers
allowed-tools:
  - Read
  - Write
  - Edit
  - Grep
  - Glob
---

# Embeddable Consent Widget

`consent.js` is DPDP Guard's zero-build integration: one script tag renders the
banner and preference centre, records audited consent, and blocks tagged
trackers until a decision is made. It suits marketing sites, CMS-hosted pages,
Shopify/WordPress storefronts, and anything where adding an npm dependency is
not on the table.

Use `@dpdpguard/js` instead when the site is an application with its own build
and needs programmatic consent state in component code.

## Step 1 — Place the script

```html
<script
  src="https://<widget-host>/consent.js"
  data-dpdp-org="<organizationId or domainGroupId>"
  data-dpdp-auto-block="true"
></script>
```

Get the widget host and the identifier from the organisation's own DPDP Guard
dashboard. The script also accepts the identifier as a query parameter
(`consent.js?id=<domainGroupId>`) for embed surfaces that strip unknown
attributes — some tag managers and CMS blocks do.

Placement rules:

- **In `<head>`, as early as possible, and not `async`/`defer`** when
  auto-blocking is on. The blocker works by observing nodes as they are added;
  anything that loads before it runs is not blocked, and a tracker that fires
  once has already processed.
- **One instance per page.** A second copy fights the first over banner state.
- If the identifier is missing the widget warns in the console and the banner
  may not initialise — check the console before concluding the script is broken.

## Step 2 — Tag what should be blocked

Auto-blocking is opt-in per resource. Mark every non-essential script and iframe
with its purpose category:

```html
<script data-dpdp-category="analytics" src="https://…/analytics.js"></script>
<iframe data-dpdp-category="marketing" src="https://…/embed"></iframe>
```

The widget rewrites a tagged element's `src` into `data-dpdp-src` until consent
for that category exists, then restores it. Untagged resources are **not**
blocked — the tag is the whole mechanism.

So the real work of this step is an inventory, not an edit:

1. Grep the site for third-party origins — `googletagmanager|google-analytics|
   gtag|facebook\.net|fbq|hotjar|clarity|segment|mixpanel|amplitude|intercom|
   hubspot|linkedin|twitter|tiktok|doubleclick`.
2. Check server-rendered templates, CMS blocks, and tag-manager containers too,
   not only files in the repo. A tag injected by GTM is invisible to grep.
3. Classify each as essential or not. Essential means strictly necessary to
   deliver the service the user asked for — analytics is not essential, and
   neither is a chat widget the marketing team likes.
4. Tag every non-essential one, and **report any you could not reach** (tags
   living in a third-party tag manager, for instance). An untagged tracker is an
   ungated one, and a report that omits it overstates the coverage.

## Step 3 — Google Consent Mode v2

The widget initialises Consent Mode with all non-essential signals denied and
pushes an update when the user decides. If the site already calls `gtag('consent',
'default', …)` itself, remove that call — two sources of default state race, and
the loser is usually the one that denies.

Verify in the browser: with a fresh profile, `dataLayer` should show the denied
default **before** any GTM container loads, and an update only after a decision.

## Step 4 — Gate your own code

The widget exposes a small global:

```js
if (window.DPDPGuard.hasConsent("analytics")) {
  startAnalytics();
}

window.DPDPGuard.showBanner();   // persistent re-open entry point
window.DPDPGuard.getConsents();  // current decision map
```

`window.dpdp` is a backwards-compatible alias. Prefer `window.DPDPGuard` in new
code.

Guard for the script not having loaded yet (`window.DPDPGuard?.hasConsent(…)`)
rather than assuming it is present — an ad blocker or a CSP rule can prevent it,
and code that throws on a missing global takes the page down with it.

## Step 5 — Withdrawal entry point

The widget injects a persistent privacy trigger that re-opens the preference
centre. **Confirm it is actually visible and reachable on every page**, and that
the site's own footer does not cover or duplicate it.

Under DPDP §6(4)–(6) withdrawal must be as easy as giving consent. A banner with
a prominent accept and a withdrawal path buried three clicks into a settings
page does not meet that, whatever the banner records. If the trigger is hidden
by site CSS, that is a finding to report, not a cosmetic detail.

## Step 6 — Verify in a browser, not by reading the diff

With a fresh profile and devtools open:

- [ ] No non-essential network request fires before a decision — check the
      Network tab from first paint, not after interacting
- [ ] Nothing is pre-selected; non-essential purposes default to off
- [ ] Reject-all is reachable in one click from the first layer, at equal visual
      prominence to accept
- [ ] One toggle per purpose, none bundled
- [ ] Dismissing, scrolling, or continuing to browse records **no** consent
- [ ] After accepting one category, only that category's resources unblock
- [ ] The withdrawal trigger is visible and re-opens the centre
- [ ] After withdrawal, the corresponding resources stop loading on next page
      view

Report the checklist result honestly. A failed row is a finding.

## Boundaries

- Never enable auto-blocking without tagging the resources — it produces a
  banner that blocks nothing while implying it blocks everything.
- Never mark a tracking or marketing resource as essential to avoid gating it.
- Never present the widget as making the site compliant. It implements consent
  capture and tracker gating; notice content, retention, rights handling, and
  server-side enforcement live elsewhere.
- Do not list languages in the switcher that are not genuinely translated.
- Generated or edited notice text is a drafting aid pending legal review, not
  legal advice.
