---
name: dpdp-breach-response
description: Data breach incident assistant with 72-hour regulatory notification checklist and DPBI payload generator
triggers:
  - dpdp breach
  - incident response
  - data breach
  - dpb notification
---

# DPDPGuard Incident Breach Response Assistant

Step-by-step assistant for managing personal data breach incidents under DPDP Act §8(6) (72-hour DPBI reporting rule) and GDPR Art.33.

## Capabilities

- **Severity Assessment Calculator**: Evaluates record count, sensitivity level, and potential principal harm.
- **72-Hour Countdown Checklist**: Interactive milestone tracker from containment to regulatory notification.
- **DPBI Reporting Payload Draft**: Standardized reporting JSON payload for the Data Protection Board of India.
- **Affected User Notifications**: Multi-channel user notification templates (Email, SMS, In-App).
- **Proposal Creation**: Creates `breach_dpb_notify_propose` proposal requiring DPO approval before dispatch.
