---
name: Community groups location pattern
description: How location-based community groups work without a state field in farmerGroupsTable
---

## Rule
`farmerGroupsTable` has no `state` column. Community.tsx handles location on the frontend using hardcoded `LOCAL_GROUPS_BY_STATE` map keyed by farmer's state string.

**Why:** Schema change avoided; farmer state is available from `useAuth()` → `AuthFarmer.state`.

**How to apply:** Community.tsx reads `farmer.state` from auth context, looks up `LOCAL_GROUPS_BY_STATE[farmerState] ?? LOCAL_GROUPS_BY_STATE.default`, then appends DB groups on top. Keys defined for: Kano, Lagos, Oyo, and `default`.

## Tabs
- Feed: posts from community_posts table (all farmers, not filtered by location)
- Groups: location-based from LOCAL_GROUPS_BY_STATE + DB groups
- Help: "Ask for Help" tab — farmer picks topic category, types problem, posts as community post with topic prefix
