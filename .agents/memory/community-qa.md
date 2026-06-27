---
name: Community Q&A Hub
description: Q&A system with farmer questions, farmer/AI answers, helpful votes
---

## Rule
Two new tables: communityQuestionsTable, communityAnswersTable (in lib/db/src/schema/community-qa.ts).

**Why:** Farmers need a structured Q&A (not just open posts) where AI and other farmers can answer specific farming questions.

**How to apply:**
- GET /api/community-qa?category=pest — list questions (optional category filter)
- POST /api/community-qa — ask a question (requires title, body, category)
- GET /api/community-qa/:id — question detail + answers array; increments viewCount
- POST /api/community-qa/:id/answers — post a farmer answer
- POST /api/community-qa/:id/ai-answer — triggers Gemini 2.0-flash, stores answer with isAi=true and farmerName="FREGE AI Expert"
- PATCH /api/community-qa/answers/:answerId/helpful — increment helpfulCount

## Frontend (community.tsx)
- Tab "qa" added alongside feed/groups/help
- selectedQuestion state drives either list view or detail view
- "Ask FREGE AI Expert" button appears at top of question detail
- Answers sorted by: isAccepted desc, helpfulCount desc, createdAt asc
- AI answers shown with Bot icon + blue left border + "AI Expert" badge

## Categories
pest, weather, market, animal, finance, general
