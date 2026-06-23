---
name: Auth & Onboarding Architecture
description: JWT auth flow, onboardingComplete gate, how new users are routed through onboarding before the dashboard
---

## Auth flow
- JWT in localStorage key `frege_auth_token`, 30-day expiry
- All data routes protected via `requireAuth` middleware in `artifacts/api-server/src/routes/index.ts`
- `/auth/*` routes are public; everything else requires Bearer token
- `req.farmerId!` is the pattern used in all protected routes (never hardcoded IDs)

## onboardingComplete gate
- `farmersTable` has `onboardingComplete boolean NOT NULL DEFAULT false`
- Schema pushed to DB; new registrations start with `onboardingComplete = false`
- All auth responses (register, login, /me, phone-verify) include `onboardingComplete` field
- Frontend ProtectedRoute redirects to `/onboarding` if `!farmer.onboardingComplete`
- Splash screen checks: not-authed → /login, authed+not-onboarded → /onboarding, authed+onboarded → /home
- Onboarding page at `/pages/onboarding.tsx`: 2-step wizard (location → farm type/name/size)
- Completion calls PATCH /api/farmer/profile with `{ state, lga, farmingType, onboardingComplete: true }` + POST /api/farms

**Why:** Ensures every user has location and farming type before seeing the dashboard, enabling personalised weather/market data later.

## Crops & livestock filtering
- `cropsTable` and `livestockTable` belong to `farmsTable` (via `farmId`)
- `farmsTable` has `farmerId` → filtering crops by farmer requires joining through farms
- Pattern: `getFarmerFarmIds(farmerId)` → `inArray(cropsTable.farmId, farmIds)`
