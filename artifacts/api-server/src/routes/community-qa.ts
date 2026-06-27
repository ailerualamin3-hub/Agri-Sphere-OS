import { Router } from "express";
import { db, farmersTable, communityQuestionsTable, communityAnswersTable } from "@workspace/db";
import { eq, desc, sql } from "drizzle-orm";
import { GoogleGenAI } from "@google/genai";

const router = Router();
const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

router.get("/", async (req, res) => {
  try {
    const { category } = req.query;
    let query = db.select().from(communityQuestionsTable).orderBy(desc(communityQuestionsTable.createdAt)).$dynamic();
    if (category && category !== "all") {
      const { where } = await import("drizzle-orm");
      query = query.where(eq(communityQuestionsTable.category, category as string));
    }
    const questions = await query.limit(50);
    res.json(questions);
  } catch (err) {
    req.log.error({ err }, "Failed to list questions");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", async (req, res) => {
  try {
    const farmerId = req.farmerId!;
    const { category, title, body } = req.body;
    if (!category || !title || !body) return res.status(400).json({ error: "category, title and body are required" });

    const [farmer] = await db.select({ name: farmersTable.name, state: farmersTable.state })
      .from(farmersTable).where(eq(farmersTable.id, farmerId)).limit(1);
    if (!farmer) return res.status(404).json({ error: "Farmer not found" });

    const [question] = await db.insert(communityQuestionsTable).values({
      farmerId,
      farmerName: farmer.name,
      farmerState: farmer.state ?? null,
      category,
      title,
      body,
    }).returning();

    res.status(201).json(question);
  } catch (err) {
    req.log.error({ err }, "Failed to create question");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [question] = await db.select().from(communityQuestionsTable)
      .where(eq(communityQuestionsTable.id, id)).limit(1);
    if (!question) return res.status(404).json({ error: "Question not found" });

    await db.update(communityQuestionsTable)
      .set({ viewCount: (question.viewCount ?? 0) + 1 })
      .where(eq(communityQuestionsTable.id, id));

    const answers = await db.select().from(communityAnswersTable)
      .where(eq(communityAnswersTable.questionId, id))
      .orderBy(desc(communityAnswersTable.isAccepted), desc(communityAnswersTable.helpfulCount), communityAnswersTable.createdAt);

    res.json({ ...question, answers });
  } catch (err) {
    req.log.error({ err }, "Failed to get question");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/:id/answers", async (req, res) => {
  try {
    const farmerId = req.farmerId!;
    const questionId = Number(req.params.id);
    const { body } = req.body;
    if (!body) return res.status(400).json({ error: "body is required" });

    const [question] = await db.select({ id: communityQuestionsTable.id, answerCount: communityQuestionsTable.answerCount })
      .from(communityQuestionsTable).where(eq(communityQuestionsTable.id, questionId)).limit(1);
    if (!question) return res.status(404).json({ error: "Question not found" });

    const [farmer] = await db.select({ name: farmersTable.name }).from(farmersTable)
      .where(eq(farmersTable.id, farmerId)).limit(1);

    const [answer] = await db.insert(communityAnswersTable).values({
      questionId,
      farmerId,
      farmerName: farmer?.name ?? "Farmer",
      isAi: false,
      body,
    }).returning();

    await db.update(communityQuestionsTable)
      .set({ answerCount: (question.answerCount ?? 0) + 1 })
      .where(eq(communityQuestionsTable.id, questionId));

    res.status(201).json(answer);
  } catch (err) {
    req.log.error({ err }, "Failed to post answer");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/:id/ai-answer", async (req, res) => {
  try {
    const questionId = Number(req.params.id);
    const [question] = await db.select().from(communityQuestionsTable)
      .where(eq(communityQuestionsTable.id, questionId)).limit(1);
    if (!question) return res.status(404).json({ error: "Question not found" });

    const existingAiAnswer = await db.select({ id: communityAnswersTable.id }).from(communityAnswersTable)
      .where(eq(communityAnswersTable.questionId, questionId))
      .limit(1);
    const aiExists = existingAiAnswer.some((a: any) => a.isAi);

    const prompt = `You are FREGE AI, an expert agricultural advisor for Nigerian and West African smallholder farmers.
A farmer from ${question.farmerState ?? "Nigeria"} has posted this question in the category "${question.category}":

Title: ${question.title}
Details: ${question.body}

Provide a clear, practical, and locally-relevant answer. Use simple language suitable for a smallholder farmer. Include:
1. Direct answer to their question
2. Practical steps they can take
3. Any local resources or contacts (extension services, state ADP, etc.) if relevant
4. Any safety warnings if relevant

Keep your response friendly, concise, and actionable. Respond in 150–250 words.`;

    const response = await genai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });

    const aiText = response.candidates?.[0]?.content?.parts?.[0]?.text ?? "I was unable to generate an answer. Please try again.";

    const [answer] = await db.insert(communityAnswersTable).values({
      questionId,
      farmerId: null,
      farmerName: "FREGE AI Expert",
      isAi: true,
      body: aiText,
    }).returning();

    if (!aiExists) {
      await db.update(communityQuestionsTable)
        .set({ answerCount: sql`${communityQuestionsTable.answerCount} + 1` })
        .where(eq(communityQuestionsTable.id, questionId));
    }

    res.status(201).json(answer);
  } catch (err) {
    req.log.error({ err }, "Failed to get AI answer");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/answers/:answerId/helpful", async (req, res) => {
  try {
    const answerId = Number(req.params.answerId);
    const [answer] = await db.select({ helpfulCount: communityAnswersTable.helpfulCount })
      .from(communityAnswersTable).where(eq(communityAnswersTable.id, answerId)).limit(1);
    if (!answer) return res.status(404).json({ error: "Answer not found" });
    const [updated] = await db.update(communityAnswersTable)
      .set({ helpfulCount: (answer.helpfulCount ?? 0) + 1 })
      .where(eq(communityAnswersTable.id, answerId))
      .returning();
    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Failed to mark helpful");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/:id/resolve", async (req, res) => {
  try {
    const farmerId = req.farmerId!;
    const id = Number(req.params.id);
    const [question] = await db.select({ farmerId: communityQuestionsTable.farmerId })
      .from(communityQuestionsTable).where(eq(communityQuestionsTable.id, id)).limit(1);
    if (!question || question.farmerId !== farmerId) return res.status(404).json({ error: "Question not found" });
    const [updated] = await db.update(communityQuestionsTable)
      .set({ isResolved: true })
      .where(eq(communityQuestionsTable.id, id))
      .returning();
    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Failed to resolve question");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
