---
name: Auth System Architecture
description: JWT-based auth system added to FREGE AI — how it works and key decisions
---

# Auth System

**Stack:** bcryptjs (password hashing) + jsonwebtoken (30-day JWT) + localStorage

**Token storage key:** `frege_auth_token` in localStorage

**Auth context:** `artifacts/frege-ai/src/contexts/auth.tsx` — wraps the whole app, calls `setAuthTokenGetter()` so all generated API hooks include the Bearer token automatically.

**Backend routes:** `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/forgot-password`, `POST /api/auth/reset-password`, `POST /api/auth/logout`

**JWT secret:** `process.env.JWT_SECRET || 'frege-ai-dev-secret-change-in-prod'`

**Why:** App previously used hardcoded `CURRENT_FARMER_ID = 1`. Auth gate is at frontend (ProtectedRoute) — backend data routes still use farmer ID 1 for now (data isolation is a future step).

**Forgot password:** Generates a 6-digit numeric token, stores it in `farmers.resetToken` + `farmers.resetTokenExpiry` (1hr). Returns the code directly in the response (no email service). Token shown on-screen for the user.

**Schema additions to farmersTable:** `passwordHash`, `resetToken`, `resetTokenExpiry`, email made `.unique()`

**DB state:** All tables created via `push-force` on 2026-06-23.
