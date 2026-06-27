---
name: Farm Reports & Finance module
description: How the Finance & Reports feature works — tables, routes, public share page
---

## Rule
Three new tables: farmReportsTable, financialRecordsTable, farmDocumentsTable (in lib/db/src/schema/reports.ts).

**Why:** Banks/lenders need a read-only verified view of farmer data without accessing the farmer's account.

**How to apply:**
- `/api/reports` — protected CRUD + POST /generate (creates UUID shareToken, snapshots all farm data into jsonb)
- `/api/finance/records` + `/api/finance/documents` — protected CRUD for income/expense records and documents
- `/api/share/:token` — PUBLIC route (registered BEFORE requireAuth in routes/index.ts); increments viewCount; no auth needed
- Frontend: `/reports` (protected, with Layout) — tabs: Records, Documents, Reports
- Frontend: `/share/:token` — COMPLETELY public, no Layout, no auth wrapper, no wouter ProtectedRoute
- Home page has a Finance & Reports banner card that navigates to /reports

## Share token
- Generated with Node.js `randomUUID()` — stored in farmReportsTable.shareToken (unique)
- Share URL: `${window.location.origin}/share/${report.shareToken}`
- Reports store a full JSON snapshot at generation time (not live) except viewCount which increments on each view

## Important
- `@google/genai` must be installed in `artifacts/api-server` (not just at workspace root) — community-qa.ts imports it directly
