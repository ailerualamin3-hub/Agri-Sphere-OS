import { Router } from "express";
import { db, conversationsTable, messagesTable } from "@workspace/db";
import { eq, desc, count } from "drizzle-orm";

const router = Router();

const LANGUAGE_GREETINGS: Record<string, string> = {
  Hausa: "To, na fahimci tambayarka.",
  Yoruba: "Mo gbọ ibeere rẹ.",
  Igbo: "Anụgo m ajụjụ gị.",
  Fulfulde: "Mi faami miijo maa.",
  English: "",
};

const LANGUAGE_CLOSINGS: Record<string, string> = {
  Hausa: "\n\nKuna da ƙarin tambaya?",
  Yoruba: "\n\nNi ibeere miiran bi?",
  Igbo: "\n\nI nwere ajụjụ ọzọ?",
  Fulfulde: "\n\nA ndi ko faamngo?",
  English: "\n\nDo you have any other questions?",
};

const responses: Record<string, string> = {
  plant: "Based on the current season and West African farming conditions, the best crops to plant right now are: 1) Cowpea (IT90K-277 variety) – excellent for dry conditions and high protein value, 2) Sorghum – highly adaptable to rain variability, 3) Late-season maize if rains are reliable in your area. The optimal planting window closes in about 3 weeks. Shall I create a planting schedule for you?",
  leaves: "Yellow leaves can indicate several issues. The most common causes are: 1) Nitrogen deficiency (yellowing starts from older/lower leaves upward) – apply urea at 50kg/ha, 2) Waterlogging from poor drainage – check root health, 3) Streak virus in maize – remove and destroy affected plants, 4) Iron deficiency in alkaline soils – use chelated iron foliar spray. Can you describe the pattern? Is it starting from the tips, edges, or the whole leaf?",
  goat: "For optimal profitability, I recommend 10–15 goats per hectare of available grazing land. For smallholder operations, start with 5–8 does and 1–2 bucks. Red Sokoto (Maradi) goats are best adapted to West African climates. Key care: water supply of 4–5 liters per goat daily, shade shelter from extreme heat, and quarterly deworming with Albendazole. Would you like a detailed management plan?",
  fertilizer: "For maize, the recommended fertilizer schedule is: 1) At planting: NPK 15-15-15 at 200kg/ha (2 bags/acre), 2) At 4 weeks after planting: Urea (46% N) at 100kg/ha (1 bag/acre) as top dressing, 3) Optional at 8 weeks: Urea at 50kg/ha if plants show nitrogen stress. Always apply when soil is moist but not waterlogged. Avoid applying before heavy rain. Estimated total cost: ₦45,000–₦60,000 per acre.",
  market: "Current commodity prices in Nigerian markets: Maize is trading at ₦420–480/kg with a rising trend driven by dry-season demand. Rice (local) sits at ₦650–720/kg. Tomatoes are volatile at ₦180–350/kg depending on the season. Cowpea remains stable at ₦520/kg. My recommendation: if you have surplus maize, now is an ideal selling window. For livestock, goat prices typically rise 15–20% approaching festive seasons.",
  soil: "For healthy soil in West Africa, focus on: 1) Organic matter – apply farmyard manure at 5–10 tonnes/ha annually, 2) pH balance – most crops thrive at pH 6.0–7.0; use lime to correct acidic soils, 3) Cover cropping with legumes (groundnut, cowpea) to fix nitrogen, 4) Minimum tillage to preserve soil structure and moisture. A simple soil test costs ₦2,000–5,000 at your local agricultural office and is highly recommended.",
  water: "Irrigation tips for smallholder farming: 1) Drip irrigation saves 40–60% water vs. flood irrigation, 2) Water in the early morning or evening to minimize evaporation, 3) Mulching retains soil moisture and can reduce irrigation needs by 25–30%, 4) For rainfed farming, construct ridges along contours to retain runoff. Signs of water stress: wilting in the afternoon, blue-green leaf color, and leaf rolling.",
  disease: "Common crop diseases in West Africa and their management: 1) Maize streak virus – plant resistant varieties, control leafhoppers, 2) Rice blast – use certified seeds, avoid excess nitrogen, apply Tricyclazole fungicide, 3) Tomato blight – space plants for airflow, apply copper-based fungicide weekly during wet season, 4) Cassava mosaic – plant disease-free cuttings, rogue infected plants early. Early detection and resistant varieties are your best defense.",
  default: "I understand your farming question. Based on current West African agricultural conditions, I recommend: 1) Always consult your local agricultural extension office for region-specific advice, 2) Keep records of planting dates, inputs used, and yields for better planning, 3) Join a farmer cooperative for better input prices and market access. Could you give me more details about your specific situation? I can provide more targeted advice for your crop type, soil, and location.",
};

function getResponse(message: string, language: string): string {
  const lower = message.toLowerCase();
  let base: string;
  if (lower.includes("plant") || lower.includes("grow") || lower.includes("sow") || lower.includes("seed")) base = responses.plant;
  else if (lower.includes("yellow") || lower.includes("leaf") || lower.includes("leave") || lower.includes("disease") || lower.includes("sick")) base = responses.disease;
  else if (lower.includes("goat") || lower.includes("cattle") || lower.includes("livestock") || lower.includes("animal") || lower.includes("poultry")) base = responses.goat;
  else if (lower.includes("fertilizer") || lower.includes("maize") || lower.includes("npk") || lower.includes("urea")) base = responses.fertilizer;
  else if (lower.includes("market") || lower.includes("price") || lower.includes("sell") || lower.includes("buy") || lower.includes("trade")) base = responses.market;
  else if (lower.includes("soil") || lower.includes("compost") || lower.includes("manure") || lower.includes("ph")) base = responses.soil;
  else if (lower.includes("water") || lower.includes("irrigat") || lower.includes("rain") || lower.includes("drought")) base = responses.water;
  else base = responses.default;

  const greeting = LANGUAGE_GREETINGS[language] ?? "";
  const closing = LANGUAGE_CLOSINGS[language] ?? LANGUAGE_CLOSINGS.English;
  return greeting ? `${greeting}\n\n${base}${closing}` : `${base}${closing}`;
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
    const [userMsg] = await db.insert(messagesTable).values({ conversationId, role: "user", content }).returning();
    const aiContent = getResponse(content, language || "English");
    const [aiMsg] = await db.insert(messagesTable).values({ conversationId, role: "assistant", content: aiContent }).returning();
    await db.update(conversationsTable).set({ updatedAt: new Date() }).where(eq(conversationsTable.id, conversationId));
    res.status(201).json({
      userMessage: { id: userMsg.id, conversationId: userMsg.conversationId, role: userMsg.role, content: userMsg.content, createdAt: userMsg.createdAt.toISOString() },
      assistantMessage: { id: aiMsg.id, conversationId: aiMsg.conversationId, role: aiMsg.role, content: aiMsg.content, createdAt: aiMsg.createdAt.toISOString() },
    });
  } catch (err) {
    req.log.error({ err }, "Failed to send message");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
