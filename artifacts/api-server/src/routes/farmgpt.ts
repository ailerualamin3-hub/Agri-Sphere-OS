import { Router } from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { db, conversationsTable, messagesTable, scanResultsTable } from "@workspace/db";
import { eq, desc, count } from "drizzle-orm";

const router = Router();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

const SYSTEM_PROMPT = `You are FarmGPT, an expert agricultural assistant built specifically for Nigerian and West African smallholder farmers. You have deep knowledge of:

- Crops grown in Nigeria and West Africa: maize, rice, cassava, yam, sorghum, millet, cowpea, groundnut, tomato, pepper, okra, plantain, cocoa, palm oil, and more
- Nigerian soil types, climate zones (Guinea Savanna, Sudan Savanna, Sahel, rainforest belt), and rainfall patterns
- Local fertilizer types, application rates, and costs in Naira (₦)
- Common pests and diseases affecting Nigerian crops (armyworm, stem borer, cassava mosaic, maize streak virus, etc.)
- Livestock management: goats, cattle, poultry, fish farming in Nigeria
- Nigerian market prices, commodity trading, and agricultural value chains
- Irrigation, water management, and climate-smart farming techniques
- Nigerian government agricultural programs (ADP, APPEALS, NIRSAL, CBN Agric loans)
- Local extension services, cooperatives, and agribusinesses

Guidelines:
- Keep responses practical, actionable, and relevant to smallholder farmers with limited resources
- Use local crop and variety names when relevant (e.g., "Ife Brown" cowpea, "FARO 44" rice)
- Quote prices and costs in Nigerian Naira (₦)
- Reference Nigerian states, local government areas, or regions when giving location-specific advice
- Be concise but thorough — farmers need clear, step-by-step guidance
- When asked in Hausa, Yoruba, Igbo, or Fulfulde, respond in that language with agricultural terms that farmers understand
- Always end with a practical next step or follow-up question to help the farmer further`;

const LANGUAGE_SYSTEM_ADDENDUM: Record<string, string> = {
  Hausa: "\n\nIMPORTANT: The farmer is asking in Hausa. Respond primarily in Hausa using simple, clear language that rural farmers understand. You may include key technical terms in English where necessary.",
  Yoruba: "\n\nIMPORTANT: The farmer is asking in Yoruba. Respond primarily in Yoruba using simple, clear language that rural farmers understand. You may include key technical terms in English where necessary.",
  Igbo: "\n\nIMPORTANT: The farmer is asking in Igbo. Respond primarily in Igbo using simple, clear language that rural farmers understand. You may include key technical terms in English where necessary.",
  Fulfulde: "\n\nIMPORTANT: The farmer is asking in Fulfulde. Respond primarily in Fulfulde using simple, clear language that rural farmers understand. You may include key technical terms in English where necessary.",
  English: "",
};

async function buildSystemPromptWithHistory(farmerId: number, language: string): Promise<string> {
  const languageAddendum = LANGUAGE_SYSTEM_ADDENDUM[language] ?? "";
  try {
    const recentScans = await db
      .select()
      .from(scanResultsTable)
      .where(eq(scanResultsTable.farmerId, farmerId))
      .orderBy(desc(scanResultsTable.createdAt))
      .limit(5);

    if (recentScans.length === 0) return SYSTEM_PROMPT + languageAddendum;

    const scanSummary = recentScans.map((s) =>
      `- ${new Date(s.createdAt).toLocaleDateString()}: ${s.scanType} scan — ${s.diagnosis} (${s.severity} severity, ${s.confidence}% confidence). Recommendations: ${s.recommendations.slice(0, 2).join("; ")}`
    ).join("\n");

    return SYSTEM_PROMPT + `\n\nFARM HISTORY CONTEXT (recent scans from this farmer's farm — use this to give personalized advice):\n${scanSummary}` + languageAddendum;
  } catch {
    return SYSTEM_PROMPT + languageAddendum;
  }
}

async function ensureDefaultConversation(farmerId: number, language: string): Promise<number> {
  const existing = await db
    .select()
    .from(conversationsTable)
    .where(eq(conversationsTable.farmerId, farmerId))
    .limit(1);
  if (existing.length > 0) return existing[0].id;
  const [convo] = await db
    .insert(conversationsTable)
    .values({ farmerId, title: "General Farming", language })
    .returning();
  return convo.id;
}

router.get("/conversations", async (req, res) => {
  try {
    const farmerId = req.farmerId!;
    const convos = await db
      .select()
      .from(conversationsTable)
      .where(eq(conversationsTable.farmerId, farmerId))
      .orderBy(desc(conversationsTable.updatedAt));

    if (convos.length === 0) {
      const id = await ensureDefaultConversation(farmerId, "English");
      const [fresh] = await db.select().from(conversationsTable).where(eq(conversationsTable.id, id));
      return res.json([{ id: fresh.id, title: fresh.title, language: fresh.language, messageCount: 0, lastMessageAt: null, createdAt: fresh.createdAt.toISOString() }]);
    }

    const result = await Promise.all(convos.map(async (c) => {
      const [msgCount] = await db.select({ count: count() }).from(messagesTable).where(eq(messagesTable.conversationId, c.id));
      const [last] = await db.select().from(messagesTable).where(eq(messagesTable.conversationId, c.id)).orderBy(desc(messagesTable.createdAt)).limit(1);
      return { id: c.id, title: c.title, language: c.language, messageCount: msgCount.count, lastMessageAt: last?.createdAt.toISOString() ?? null, createdAt: c.createdAt.toISOString() };
    }));

    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Failed to get conversations");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/conversations", async (req, res) => {
  try {
    const { title, language } = req.body;
    const [convo] = await db.insert(conversationsTable).values({ farmerId: req.farmerId!, title: title || "New Conversation", language: language || "English" }).returning();
    res.status(201).json({ id: convo.id, title: convo.title, language: convo.language, messageCount: 0, lastMessageAt: null, createdAt: convo.createdAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Failed to create conversation");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/conversations/:conversationId/messages", async (req, res) => {
  try {
    const conversationId = Number(req.params.conversationId);
    const msgs = await db
      .select()
      .from(messagesTable)
      .where(eq(messagesTable.conversationId, conversationId))
      .orderBy(messagesTable.createdAt);
    res.json(msgs.map((m) => ({ id: m.id, conversationId: m.conversationId, role: m.role, content: m.content, createdAt: m.createdAt.toISOString() })));
  } catch (err) {
    req.log.error({ err }, "Failed to get messages");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/conversations/:conversationId/messages", async (req, res) => {
  try {
    const conversationId = Number(req.params.conversationId);
    const { content, language } = req.body;
    const farmerId = req.farmerId!;

    const [userMsg] = await db.insert(messagesTable).values({ conversationId, role: "user", content }).returning();

    const historyRows = await db
      .select()
      .from(messagesTable)
      .where(eq(messagesTable.conversationId, conversationId))
      .orderBy(messagesTable.createdAt);

    const history = historyRows
      .filter((m) => m.id !== userMsg.id)
      .map((m) => ({ role: m.role, content: m.content }));

    const systemPrompt = await buildSystemPromptWithHistory(farmerId, language || "English");

    let aiContent: string;
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash", systemInstruction: systemPrompt });
      const chatHistory = history.slice(-10).map((msg) => ({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content }],
      }));
      const chat = model.startChat({ history: chatHistory });
      const result = await chat.sendMessage(content);
      aiContent = result.response.text();
    } catch (geminiErr) {
      req.log.error({ geminiErr }, "Gemini API error");
      aiContent = "I'm sorry, I'm having trouble connecting right now. Please try again in a moment.";
    }

    const [aiMsg] = await db.insert(messagesTable).values({ conversationId, role: "assistant", content: aiContent }).returning();
    await db.update(conversationsTable).set({ updatedAt: new Date() }).where(eq(conversationsTable.id, conversationId));

    if (history.length === 0) {
      const words = content.split(" ").slice(0, 6).join(" ");
      const shortTitle = words.length > 40 ? words.slice(0, 40) + "…" : words;
      await db.update(conversationsTable).set({ title: shortTitle }).where(eq(conversationsTable.id, conversationId));
    }

    res.status(201).json({
      userMessage: { id: userMsg.id, conversationId: userMsg.conversationId, role: userMsg.role, content: userMsg.content, createdAt: userMsg.createdAt.toISOString() },
      assistantMessage: { id: aiMsg.id, conversationId: aiMsg.conversationId, role: aiMsg.role, content: aiMsg.content, createdAt: aiMsg.createdAt.toISOString() },
    });
  } catch (err) {
    req.log.error({ err }, "Failed to send message");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/conversations/:conversationId/messages/stream", async (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  const sendEvent = (data: object) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  try {
    const conversationId = Number(req.params.conversationId);
    const { content, language } = req.body;
    const farmerId = req.farmerId!;

    const [userMsg] = await db.insert(messagesTable).values({ conversationId, role: "user", content }).returning();
    sendEvent({ type: "user_message", message: { id: userMsg.id, role: "user", content, conversationId, createdAt: userMsg.createdAt.toISOString() } });

    const historyRows = await db
      .select()
      .from(messagesTable)
      .where(eq(messagesTable.conversationId, conversationId))
      .orderBy(messagesTable.createdAt);

    const history = historyRows
      .filter((m) => m.id !== userMsg.id)
      .map((m) => ({ role: m.role, content: m.content }));

    const systemPrompt = await buildSystemPromptWithHistory(farmerId, language || "English");

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash", systemInstruction: systemPrompt });
    const chatHistory = history.slice(-10).map((msg) => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }],
    }));

    const chat = model.startChat({ history: chatHistory });
    const streamResult = await chat.sendMessageStream(content);

    let fullText = "";
    for await (const chunk of streamResult.stream) {
      const chunkText = chunk.text();
      if (chunkText) {
        fullText += chunkText;
        sendEvent({ type: "chunk", text: chunkText });
      }
    }

    const [aiMsg] = await db.insert(messagesTable).values({ conversationId, role: "assistant", content: fullText }).returning();
    await db.update(conversationsTable).set({ updatedAt: new Date() }).where(eq(conversationsTable.id, conversationId));

    if (history.length === 0) {
      const words = content.split(" ").slice(0, 6).join(" ");
      const shortTitle = words.length > 40 ? words.slice(0, 40) + "…" : words;
      await db.update(conversationsTable).set({ title: shortTitle }).where(eq(conversationsTable.id, conversationId));
    }

    sendEvent({ type: "done", message: { id: aiMsg.id, role: "assistant", content: fullText, conversationId, createdAt: aiMsg.createdAt.toISOString() } });
  } catch (err) {
    sendEvent({ type: "error", message: "Connection error. Please try again." });
  } finally {
    res.end();
  }
});

export default router;
