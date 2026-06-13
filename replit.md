# FREGE AI – Africa's Agricultural Operating System

Africa's AI-powered Agricultural Operating System for smallholder farmers. Mobile-first PWA with AI diagnostics, government opportunity discovery, seasonal planning, farm health tracking, market prices, and community.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/frege-ai run dev` — run the web frontend (port 21988)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)
- Frontend: React + Vite, Wouter router, React Query, Shadcn UI, Recharts, Framer Motion, Tailwind CSS

## Where things live

- `lib/db/src/schema/` — DB schema (Drizzle). Source of truth for all tables.
- `lib/api-spec/openapi.yaml` — OpenAPI spec. Source of truth for all API contracts.
- `lib/api-client-react/src/generated/` — Generated React Query hooks + Zod schemas (do not edit manually).
- `artifacts/api-server/src/routes/` — Express route handlers.
- `artifacts/frege-ai/src/pages/` — All page components (home, diagnose, opportunities, farm, profile, etc.)
- `artifacts/frege-ai/src/components/` — Shared UI components.
- `scripts/src/` — Utility/seed scripts.

## Architecture decisions

- **Contract-first API**: OpenAPI spec → Orval codegen → typed React Query hooks. Always update `openapi.yaml` first, then run codegen.
- **No auth yet**: All routes use hardcoded `CURRENT_FARMER_ID = 1`. Auth can be layered on later.
- **Anti-demo rule**: No fake data in lists. Use proper API-driven empty states when data is absent.
- **5-tab bottom nav**: Home, Diagnose, FREGE AI, Farm, Profile — fixed; do not add more tabs.
- **useGetEmergencyContacts** takes `(params?, options?)` — pass `undefined` as first arg if no params, options second.

## Product

- **Home**: Weather, Farm Health (overall + crop/livestock/soil rings), Quick Diagnose, FREGE AI CTA, AI Insights, Govt Opportunities, Market Prices, Nearby Services, Community feed.
- **Diagnose**: AI crop/animal/soil diagnosis with photo upload. Scan History tab with API-driven list.
- **FREGE AI (FarmGPT)**: Conversational AI assistant for farming questions.
- **Farm**: Overview, Crops, Livestock, Climate, Season Plan tabs. Season Planner generates AI-powered planting calendars by crop/state/farm size.
- **Profile**: NeuroScore™, Farm Passport, Score Breakdown radar chart, Achievements (10 badges), Financial Readiness (loan/insurance/credit/NGO scores).
- **Opportunities**: Government & NGO grants, subsidies, training, equipment programmes with filter pills and detail view.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- After any schema change: run `pnpm --filter @workspace/db run push`, then `pnpm --filter @workspace/api-spec run codegen`, then restart API server workflow.
- `pnpm run typecheck` is the canonical check — trust it over the LSP/editor.
- Do not run `pnpm dev` at the workspace root — use workflow restart instead.
- Orval-generated mutations for endpoints with path params use the param name (e.g. `conversationId`), not `id`.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
