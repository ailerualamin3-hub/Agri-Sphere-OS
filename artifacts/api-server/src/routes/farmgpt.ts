import { Router } from "express";
import { db, conversationsTable, messagesTable } from "@workspace/db";
import { eq, desc, count } from "drizzle-orm";

const router = Router();

const CURRENT_FARMER_ID = 1;

const farmGptResponses: Record<string, string> = {
  default: "I understand your question. Based on current conditions in your area, I recommend consulting with your local agricultural extension officer for the most accurate guidance tailored to your specific farm. Would you like me to help with anything else?",
  plant: "Based on your location in Kano State and the current season (June), the best crops to plant right now are: 1) Cowpea (varieties like IT90K-277) - excellent for dry conditions, 2) Sorghum - highly adaptable, 3) Late-season maize if rains are reliable. The optimal planting window closes in about 3 weeks. Shall I create a planting schedule for you?",
  leaves: "Yellow leaves can indicate several issues. The most common causes in your region are: 1) Nitrogen deficiency (yellowing from older leaves upward) - apply urea at 50kg/ha, 2) Waterlogging from poor drainage - check root health, 3) Streak virus in maize - remove and destroy affected plants, 4) Iron deficiency in alkaline soils. Can you describe the pattern? Is it starting from the tips, edges, or whole leaf?",
  goat: "For optimal profitability in Kano State, I recommend 10-15 goats per hectare of available grazing land. For a smallholder operation, start with 5-8 does and 1-2 bucks. Red Sokoto (Maradi) goats are best adapted to your climate. Key considerations: water supply (4-5 liters per goat daily), shelter from extreme heat, and quarterly deworming. Would you like a detailed management plan?",
  fertilizer: "For maize in Kano State, the recommended fertilizer schedule is: 1) At planting: NPK 15-15-15 at 200kg/ha or 2 bags per acre, 2) At 4 weeks: Urea (46% N) at 100kg/ha or 1 bag per acre as top dressing, 3) Optional at 8 weeks: Urea at 50kg/ha if plants show nitrogen stress. Apply when soil is moist but not waterlogged. Avoid applying before heavy rain. Total cost estimate: ₦45,000-60,000 per acre.",
};

function getFarmGptResponse(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("plant") || lower.includes("grow") || lower.includes("sow")) return farmGptResponses.plant;
  if (lower.includes("yellow") || lower.includes("leaf") || lower.includes("leave") || lower.includes("disease")) return farmGptResponses.leaves;
  if (lower.includes("goat") || lower.includes("livestock") || lower.includes("animal")) return farmGptResponses.goat;
  if (lower.includes("fertilizer") || lower.includes("maize") || lower.includes("npk")) return farmGptResponses.fertilizer;
  return farmGptResponses.default;
}

router.get("/conversations", async (req, res) => {
  try {
    const convos = await db
      .select()
      .from(conversationsTable)
      .where(eq(conversationsTable.farmerId, CURRENT_FARMER_ID))
      .orderBy(desc(conversationsTable.updatedAt));

    const result = await Promise.all(convos.map(async (c) => {
      const [msgCount] = await db.select({ count: count() }).from(messagesTable).where(eq(messagesTable.conversationId, c.id));
      const [last] = await db.select().from(messagesTable).where(eq(messagesTable.conversationId, c.id)).orderBy(desc(messagesTable.createdAt)).limit(1);
      return {
        id: c.id,
        title: c.title,
        language: c.language,
        messageCount: msgCount.count,
        lastMessageAt: last?.createdAt.toISOString() ?? null,
        createdAt: c.createdAt.toISOString(),
      };
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
    const [convo] = await db.insert(conversationsTable).values({ farmerId: CURRENT_FARMER_ID, title, language }).returning();
    res.status(201).json({
      id: convo.id,
      title: convo.title,
      language: convo.language,
      messageCount: 0,
      lastMessageAt: null,
      createdAt: convo.createdAt.toISOString(),
    });
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
    res.json(msgs.map((m) => ({
      id: m.id,
      conversationId: m.conversationId,
      role: m.role,
      content: m.content,
      createdAt: m.createdAt.toISOString(),
    })));
  } catch (err) {
    req.log.error({ err }, "Failed to get messages");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/conversations/:conversationId/messages", async (req, res) => {
  try {
    const conversationId = Number(req.params.conversationId);
    const { content } = req.body;

    const [userMsg] = await db.insert(messagesTable).values({ conversationId, role: "user", content }).returning();
    const aiContent = getFarmGptResponse(content);
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
