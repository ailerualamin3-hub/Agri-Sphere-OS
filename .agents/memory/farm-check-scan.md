---
name: Farm Check & AI Scan System
description: Gemini vision scan endpoint, 5-scan credit limit, history, and section naming conventions.
---

# Farm Check & AI Scan System

## Route: /api/scan (artifacts/api-server/src/routes/scan.ts)
- GET /credits → {used, limit, remaining} — counts scanResultsTable rows for farmerId
- GET /history → all scan results ordered by createdAt desc
- POST /analyze → Gemini vision analysis with credit check

## Credit limit
- FREE_SCAN_LIMIT = 5 (hardcoded in scan.ts)
- Returns HTTP 402 with `error: "credit_limit_reached"` when exceeded
- Frontend shows paywall card (Paywall component in diagnose.tsx)

## Gemini vision pattern
- Model: gemini-2.5-flash with inlineData (base64)
- Strip `data:...;base64,` prefix before sending
- Response is JSON — strip markdown code fences before JSON.parse
- Prompts in SCAN_PROMPTS map (crop/animal/soil)

## Section naming (farmer-friendly)
- Nav label: "Farm Check" (was "Diagnose")
- Page title: "Farm Check"
- Scan types: "Crop Check", "Animal Check", "Soil Check"
- DB table: scanResultsTable in lib/db/src/schema/opportunities.ts

**Why:** User requested simpler names for low-literacy Nigerian farmers.
