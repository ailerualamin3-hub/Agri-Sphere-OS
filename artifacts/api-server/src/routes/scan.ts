import { Router } from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { db, scanResultsTable } from "@workspace/db";
import { eq, count, desc } from "drizzle-orm";

const router = Router();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

const FREE_SCAN_LIMIT = 5;

const SCAN_PROMPTS: Record<string, string> = {
  crop: `You are an expert Nigerian agricultural pathologist. Analyze this crop/plant image from a Nigerian farm.
Return ONLY a valid JSON object with no markdown, no code blocks, no extra text — just raw JSON starting with { and ending with }:
{"diagnosis":"specific disease or condition name","confidence":85,"severity":"Good","description":"2-3 sentences about what you see and what it means for the farmer","recommendations":["Action 1 with Nigerian context","Action 2","Action 3","Action 4"],"additionalInfo":[{"label":"Affected Area","value":"..."},{"label":"Disease Stage","value":"..."},{"label":"Spread Risk","value":"..."},{"label":"Recovery Chance","value":"..."}]}
severity must be one of: Good, Moderate, High, Critical. Use Nigerian crop varieties. Mention costs in Naira where relevant.`,

  animal: `You are an expert Nigerian veterinarian. Analyze this livestock image from a Nigerian farm.
Return ONLY a valid JSON object with no markdown, no code blocks, no extra text — just raw JSON starting with { and ending with }:
{"diagnosis":"condition or disease name","confidence":80,"severity":"Moderate","description":"2-3 sentences about what you observe and urgency","recommendations":["Action 1","Action 2","Action 3","Action 4"],"additionalInfo":[{"label":"Symptoms Detected","value":"..."},{"label":"Contagion Risk","value":"..."},{"label":"Treatment Window","value":"..."},{"label":"Mortality Risk","value":"..."}]}
severity must be one of: Good, Moderate, High, Critical. Include Nigerian veterinary resources and Naira costs.`,

  soil: `You are an expert Nigerian soil scientist. Analyze this soil image from a Nigerian farm.
Return ONLY a valid JSON object with no markdown, no code blocks, no extra text — just raw JSON starting with { and ending with }:
{"diagnosis":"soil type and fertility condition","confidence":88,"severity":"Good","description":"2-3 sentences about soil health and what it means for crop production","recommendations":["Action 1 with Nigerian context","Action 2","Action 3","Action 4"],"additionalInfo":[{"label":"Soil Type","value":"..."},{"label":"Estimated pH","value":"..."},{"label":"Drainage","value":"..."},{"label":"Best Crops","value":"..."}]}
severity must be one of: Good, Moderate, High, Critical. Reference Nigerian soil zones (Sudan Savanna, Guinea Savanna, rainforest belt).`,
};

function extractJson(text: string): any {
  const cleaned = text
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/gi, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]);
    }
    throw new Error("No valid JSON found in response");
  }
}

router.get("/credits", async (req, res) => {
  try {
    const farmerId = req.farmerId!;
    const [row] = await db
      .select({ used: count() })
      .from(scanResultsTable)
      .where(eq(scanResultsTable.farmerId, farmerId));
    const used = Number(row.used);
    res.json({ used, limit: FREE_SCAN_LIMIT, remaining: Math.max(0, FREE_SCAN_LIMIT - used) });
  } catch (err) {
    req.log.error({ err }, "Failed to get scan credits");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/history", async (req, res) => {
  try {
    const farmerId = req.farmerId!;
    const scans = await db
      .select()
      .from(scanResultsTable)
      .where(eq(scanResultsTable.farmerId, farmerId))
      .orderBy(desc(scanResultsTable.createdAt));
    res.json(scans);
  } catch (err) {
    req.log.error({ err }, "Failed to get scan history");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/analyze", async (req, res) => {
  try {
    const farmerId = req.farmerId!;

    const [row] = await db
      .select({ used: count() })
      .from(scanResultsTable)
      .where(eq(scanResultsTable.farmerId, farmerId));
    const used = Number(row.used);

    if (used >= FREE_SCAN_LIMIT) {
      return res.status(402).json({
        error: "credit_limit_reached",
        message: "You have used all 5 free scans. Upgrade to continue.",
        used,
        limit: FREE_SCAN_LIMIT,
      });
    }

    const { scanType, imageBase64, mimeType } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: "Image is required for analysis" });
    }

    const base64Data = imageBase64.replace(/^data:[^;]+;base64,/, "");
    const imageMimeType = (mimeType || "image/jpeg") as string;
    const prompt = SCAN_PROMPTS[scanType as string] || SCAN_PROMPTS.crop;

    let analysisResult: any;
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const result = await model.generateContent([
        { inlineData: { data: base64Data, mimeType: imageMimeType } },
        { text: prompt },
      ]);
      const rawText = result.response.text().trim();
      req.log.info({ rawText: rawText.slice(0, 200) }, "Gemini raw response");
      analysisResult = extractJson(rawText);
    } catch (geminiErr: any) {
      req.log.error({ geminiErr: geminiErr?.message || String(geminiErr) }, "Gemini vision error");
      return res.status(500).json({
        error: "Analysis failed. Please take a clearer photo in good natural light and try again.",
      });
    }

    const [saved] = await db
      .insert(scanResultsTable)
      .values({
        farmerId,
        scanType: scanType as string,
        diagnosis: String(analysisResult.diagnosis || "Unknown"),
        confidence: Number(analysisResult.confidence) || 0,
        severity: String(analysisResult.severity || "Moderate"),
        description: String(analysisResult.description || ""),
        recommendations: Array.isArray(analysisResult.recommendations) ? analysisResult.recommendations : [],
        rawResult: JSON.stringify(analysisResult),
      })
      .returning();

    res.status(201).json({
      ...analysisResult,
      id: saved.id,
      scanType: saved.scanType,
      createdAt: saved.createdAt.toISOString(),
      creditsRemaining: FREE_SCAN_LIMIT - (used + 1),
      creditsUsed: used + 1,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to analyze scan");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
