# Privacy Notice Disclosure Checklist

Required contents of a notice under DPDP Act §5 and Rule 3, cross-referenced to
GDPR Art.13–14 and CCPA §1798.100. Use this to generate a notice and to audit
an existing one.

## DPDP Act — mandatory

| # | Disclosure | Source |
|---|---|---|
| 1 | Identity of the Data Fiduciary (legal name, not brand name) | §5(1), Rule 3 |
| 2 | The personal data being collected, itemised | §5(1) |
| 3 | The specified purpose for each category | §5(1) |
| 4 | How to exercise rights under §11–14 | §5(1)(b) |
| 5 | How to withdraw consent — as easy as giving it | §6(4), §5(1)(b) |
| 6 | How to make a complaint to the Data Protection Board | §5(1)(c) |
| 7 | Contact details of the DPO or the person answering questions | §5(1), §8(9) |
| 8 | Grievance redressal mechanism and its timeline | §8(10), §13 |
| 9 | Notice availability in Eighth Schedule languages | §5(3) |

The notice must be "clear and plain language" and **standalone** — §5(2) does
not permit it to be buried inside the terms of service.

## Additional for GDPR

| # | Disclosure | Source |
|---|---|---|
| 10 | Legal basis for each purpose | Art.13(1)(c) |
| 11 | Legitimate interests pursued, where that is the basis | Art.13(1)(d) |
| 12 | Recipients or categories of recipients | Art.13(1)(e) |
| 13 | Third-country transfers and the safeguard relied on | Art.13(1)(f) |
| 14 | Retention period, or the criteria for determining it | Art.13(2)(a) |
| 15 | Right to lodge a complaint with a supervisory authority | Art.13(2)(d) |
| 16 | Whether provision is statutory/contractual and the consequence of refusal | Art.13(2)(e) |
| 17 | Existence of automated decision-making, with meaningful logic | Art.13(2)(f) |

## Additional for CCPA/CPRA

| # | Disclosure | Source |
|---|---|---|
| 18 | Categories of personal information collected in the last 12 months | §1798.130(a)(5) |
| 19 | Categories sold or shared, and to whom | §1798.115 |
| 20 | "Do Not Sell or Share My Personal Information" link | §1798.135 |
| 21 | Right to limit use of sensitive personal information | §1798.121 |
| 22 | Non-discrimination for exercising rights | §1798.125 |

## Additional for PDPA (Thailand)

| # | Disclosure | Source |
|---|---|---|
| 23 | Retention period, or expected period where none is fixed | §23(2) |
| 24 | Categories of persons to whom data may be disclosed | §23(4) |
| 25 | Controller contact and, where applicable, the DPO | §23(5) |

## Versioning

Every notice needs a version identifier that the consent record references.
Without it you cannot prove *what* a subject agreed to.

```jsonc
{
  "version": "2026-08-01",
  "effectiveFrom": "2026-08-01T00:00:00Z",
  "supersedes": "2026-02-14",
  "changeSummary": "Added analytics processor; clarified 3-year retention."
}
```

Keep superseded versions retrievable. When a material change occurs, fresh
consent is required for the new purpose — a changed notice does not
retroactively cover processing the subject never agreed to.

## Common defects

- Notice bundled into the terms of service (violates §5(2))
- Retention stated as "as long as necessary" with no criteria (fails Art.13(2)(a))
- Grievance channel listed with no response timeline (fails §8(10))
- Language switcher offering languages that fall back to English
- Notice version not recorded in the consent record
- "We may share with partners" — categories of recipients are required, not
  a gesture at their existence
