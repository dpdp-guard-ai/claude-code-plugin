# DPDP Guard webhook handling

## Transport

- **Signature:** HMAC-SHA256 over the raw request body, hex-encoded, sent in the
  `X-DPDP-Signature` header. The secret is the one stored against the webhook
  endpoint registration.
- **Subscription model:** an endpoint registers with an explicit list of event
  types. It receives only those. Registering with an empty list is rejected.
- **Delivery:** dispatched from the platform's scheduler with retry and backoff,
  so a slow consumer cannot back-pressure the consent write path. Expect
  redelivery; design for it.

## Event families

Confirm the exact event-type strings against the organisation's webhook
configuration screen before hardcoding them — the set grows, and a handler
keyed on a string that is never dispatched fails silently.

| Family | Typical trigger | What the fiduciary must do |
|---|---|---|
| `consent.given` | A principal grants consent for one or more purposes | Unblock the processing that purpose authorises |
| `consent.withdrawn` | A principal withdraws consent | **Stop the processing that consent authorised**, and stop it everywhere — queues, caches, downstream processors |
| DSR status change | A rights request is filed, progressed, or closed | Drive fulfilment in the fiduciary's own systems; the statutory clock is running |
| Breach events | A breach record is opened or updated | Trigger the internal incident process; the notification obligations are human-executed |

`consent.withdrawn` is the one that carries a live statutory obligation on the
receiving side. Under DPDP §6(4)–(6) a principal may withdraw at any time, the
ease of withdrawal must match the ease of giving, and the fiduciary must cease
processing within a reasonable time. A withdrawal that lands in DPDP Guard and
is never applied in the fiduciary's own stack leaves the obligation unmet no
matter what the dashboard shows.

## Handler skeleton (Express)

```ts
import express from "express";
import { createHmac, timingSafeEqual } from "node:crypto";

const app = express();

// Raw body on THIS route only — a global express.json() would re-serialise
// and every signature check would fail.
app.post(
  "/webhooks/dpdpguard",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const signature = String(req.header("X-DPDP-Signature") ?? "");
    const expected = createHmac("sha256", process.env.DPDPGUARD_WEBHOOK_SECRET!)
      .update(req.body)
      .digest("hex");

    const sigBuf = Buffer.from(signature, "utf8");
    const expBuf = Buffer.from(expected, "utf8");
    if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
      return res.status(401).end();
    }

    const event = JSON.parse(req.body.toString("utf8"));

    // Acknowledge first; do the work off the request path.
    res.status(202).end();
    await enqueue(event);
  },
);
```

`enqueue` must be idempotent on the event's own identifier. Redelivery is
normal, not exceptional.

## Applying a withdrawal

A correct withdrawal handler reaches every system that holds the data, not just
the primary database:

- [ ] Mark the purpose withdrawn in the fiduciary's own user record
- [ ] Drain or filter in-flight jobs already queued for that principal
- [ ] Invalidate caches and materialised views keyed on consent state
- [ ] Propagate to processors — ESP, analytics, ad platforms, CRM — via each
      one's own suppression or deletion API
- [ ] Record what was propagated and when; that record is the evidence that the
      obligation was met
- [ ] Where a processor cannot be reached synchronously, queue with retry and
      **alert on exhaustion** — a silently dropped propagation is an unmet
      obligation nobody knows about

Anything you cannot verify reached a downstream system belongs in the handover
as an open gap, not as done.

## Testing

- Unit-test the signature check with a **real** HMAC over a fixed body, plus a
  tampered-body case and a wrong-secret case.
- Test that a duplicate delivery of the same event applies once.
- Test that a `consent.withdrawn` for a purpose actually flips the gate that
  `dpdp-server-sdk` Step 2 installed. That end-to-end assertion is the one that
  proves the two halves are connected.
