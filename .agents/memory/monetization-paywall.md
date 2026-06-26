---
name: Monetization & paywall pattern
description: How isPro is determined, FarmGPT message limits, and payment flow via Paystack
---

## Rule
`isPro = (farmer.credits ?? 0) > 0` — no separate subscription table, credits field in farmersTable is the gate.

**Why:** Avoiding schema migrations; credits field already existed and is integer.

**How to apply:** Any route that needs to check pro access does: `const [farmer] = await db.select({ credits: farmersTable.credits }).from(farmersTable).where(eq(farmersTable.id, req.farmerId!)).limit(1); const isPro = (farmer?.credits ?? 0) > 0;`

## FarmGPT message limit
- Free limit: 5 user-role messages counted across ALL conversations for that farmer
- GET /api/farmgpt/usage returns `{ isPro, used, limit: 5, remaining }`
- Both POST and stream endpoints check limit before inserting user message
- Stream endpoint sends `{ type: "error", error: "message_limit_reached" }` SSE event
- Frontend detects this event and shows paywall card, disables input

## Payment flow
- Plans: monthly (₦1,500), quarterly (₦3,500), yearly (₦10,000)
- Backend at /api/payment/initialize → Paystack transaction init
- Backend at /api/payment/verify → verifies reference, sets credits=1000 to grant Pro
- Payment channels: card, bank, ussd, bank_transfer (OPay uses USSD in Nigeria)
- PAYSTACK_SECRET_KEY needed as env secret (not yet set)
- PAYSTACK_PUBLIC_KEY needed in frontend (currently uses initialize endpoint, auth URL redirect)
- Route: /payment (frontend) → Payment.tsx (no Layout wrapper — full screen)

## Opportunities paywall
- Backend adds `locked: !isPro` to each opportunity response
- Frontend shows grayed "Upgrade to Pro" button for locked items
- Upgrade banner shows at top of list if any locked items exist
