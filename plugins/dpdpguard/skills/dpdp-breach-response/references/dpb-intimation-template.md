# Data Protection Board Intimation — Draft Template

Working template for intimating the Data Protection Board of India of a
personal data breach under DPDP Act §8(6).

> **Verify the prescribed form before filing.** The DPDP Rules prescribe the
> form and manner of intimation, and the Board's submission portal is
> authoritative over this template. Use this to assemble the facts, then
> transcribe into the official form.

## Structure

```jsonc
{
  "filing": {
    "type": "initial",                    // initial | detailed | update | final
    "submittedAt": null,                  // set by the human who files
    "awarenessTimestamp": "2026-08-01T09:14:00+05:30",
    "hoursSinceAwareness": 6
  },

  "fiduciary": {
    "legalName": "",                      // registered legal name
    "cin": "",                            // corporate identity number
    "registeredAddress": "",
    "isSignificantDataFiduciary": false,
    "dpo": { "name": "", "email": "", "phone": "" },
    "filedBy": { "name": "", "designation": "", "email": "" }
  },

  "breach": {
    "natureOfBreach": "",                 // confidentiality | integrity | availability
    "description": "",                    // plain-language account of what happened
    "vector": "",                         // credential compromise | misconfiguration | insider | vendor | device loss | other
    "firstExposureAt": "",                // "UNKNOWN — under investigation" if unknown
    "discoveredAt": "",
    "containedAt": "",                    // null if still live
    "isOngoing": false,
    "rootCause": "UNKNOWN — under investigation"
  },

  "affectedData": {
    "categories": [],                     // e.g. ["name","email","phone","aadhaar_number"]
    "containsSensitiveData": false,
    "containsChildrenData": false,        // triggers §9 considerations
    "principalCount": { "value": 0, "basis": "estimated" },   // estimated | confirmed
    "recordCount":    { "value": 0, "basis": "estimated" },
    "jurisdictions": ["IN"]               // drives which other regimes apply
  },

  "riskAssessment": {
    "likelyConsequences": "",             // identity theft, financial fraud, distress...
    "mitigatingFactors": ""               // encryption at rest, short window, no exfiltration evidence
  },

  "mitigation": {
    "measuresTaken": [],                  // each with an ISO timestamp
    "measuresPlanned": [],
    "preventiveMeasures": ""              // what stops recurrence
  },

  "principalNotification": {
    "status": "in_progress",              // not_started | in_progress | completed
    "method": [],                         // ["email","sms","in_app"]
    "startedAt": "",
    "completedAt": null,
    "principalsReached": 0
  },

  "crossBorder": {
    "otherRegulatorsNotified": [],        // e.g. [{"regulator":"CNIL","jurisdiction":"FR","at":"..."}]
    "gdprArticle33Applicable": false
  }
}
```

## Field rules

**`basis` on every count.** Estimated and confirmed numbers carry different
weight. Never mark a figure `confirmed` until it comes from a completed query
against the affected store, and record which query.

**`UNKNOWN — under investigation` is an acceptable value.** It is materially
better than a plausible guess. An initial filing is expected to have gaps; a
filing later shown to contain invented specifics is a separate problem.

**Timestamps are ISO 8601 with offset.** Use `+05:30` for IST. A naive
timestamp in a filing that establishes a 72-hour deadline is a real hazard.

**`rootCause` stays UNKNOWN until forensics concludes.** Do not write a
hypothesis into a regulatory filing.

## Filing sequence

1. **Initial** — file as soon as the basic facts are established. Do not hold
   it back waiting for completeness.
2. **Detailed** — the fuller particulars within 72 hours of awareness, or
   within the extended period the Board permits on request.
3. **Update** — whenever a material fact changes: revised counts, newly
   identified categories, containment achieved.
4. **Final** — root cause confirmed, remediation complete, notification closed.

If the count grows materially between filings, say so explicitly in the update
and give the revised basis. A silently corrected number reads as concealment.

## Pre-submission checks

- [ ] `awarenessTimestamp` matches the incident record and every other artefact
- [ ] Every count carries a `basis`
- [ ] No live credentials, tokens, or raw PII anywhere in the payload
- [ ] No individual data principal is named in the Board filing
- [ ] Counsel has reviewed
- [ ] A named human has approved submission
- [ ] The filing is transcribed into the Board's prescribed form
