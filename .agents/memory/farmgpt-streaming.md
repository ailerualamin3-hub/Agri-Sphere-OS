---
name: FarmGPT Streaming
description: SSE streaming for FarmGPT responses and farm history context injection.
---

# FarmGPT Streaming

## Model
- Use **gemini-2.5-flash** for all Gemini calls (both FarmGPT and scan routes).
- gemini-1.5-flash is deprecated/404. gemini-2.0-flash also unavailable. Only 2.5-flash works.
- GEMINI_API_KEY must be set as a secret (not env var).

**Why:** gemini-1.5-flash was removed from Google's API. Confirmed gemini-2.5-flash works as of June 2026.

## Streaming endpoint
- POST /api/farmgpt/conversations/:id/messages/stream
- SSE events: {type:"user_message"}, {type:"chunk", text}, {type:"done", message}, {type:"error"}
- Frontend reads with fetch + ReadableStream, parses `data: {...}\n\n` lines

## Farm history context
- buildSystemPromptWithHistory() fetches last 5 scan results for the farmer
- Injects them into Gemini system prompt so FarmGPT gives personalized advice
- If no scans, uses base SYSTEM_PROMPT only

## Frontend streaming state (farmgpt.tsx)
- isStreaming + streamingText state
- Animated blinking cursor while streaming
- abortRef for cleanup on unmount
- Removes dependency on useSendFarmGptMessage generated hook

**Why:** Real-time streaming is much better UX than waiting 10+ seconds for full response. History context makes FarmGPT aware of the farmer's actual farm problems.
