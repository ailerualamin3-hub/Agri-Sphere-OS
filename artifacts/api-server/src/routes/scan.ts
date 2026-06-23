import { Router } from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { db, scanResultsTable } from "@workspace/db";
import { eq, count, desc } from "drizzle-orm";

const router = Router();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

const FREE_SCAN_LIMIT = 5;

const SCAN_PROMPTS: Record<string, string> = {
  crop: `You are an expert Nigerian agricultural pathologist. Analyze this crop/plant image from a Nigerian farm.
Respond with ONLY a valid JSON object (no markdown, no code blocks) with exactly these fields:
{
  "diagnosis": "specific disease or condition name",
  "confidence": 85,
  "severity": "Good",
  "description": "2-3 sentence description of what you see and what it means for the farmer",
  "recommendations": ["Specific action 1 with Nigerian context", "Action 2", "Action 3", "Action 4"],
  "additionalInfo": [
    {"label": "Affected Area", "value": "..."},
    {"label": "Disease Stage", "value": "..."},
    {"label": "Spread Risk", "value": "..."},
    {"label": "Recovery Chance", "value": "..."}
  ]
}
Severity must be one of: Good, Moderate, High, Critical.
Use Nigerian crop varieties, mention costs in Naira (₦) where relevant. Return ONLY the JSON.`,

  animal: `You are an expert Nigerian veterinarian. Analyze this livestock image from a Nigerian farm.
Respond with ONLY a valid JSON object (no markdown, no code blocks) with exactly these fields:
{
  "diagnosis": "condition or disease name",
  "confidence": 80,
  "severity": "Moderate",
  "description": "2-3 sentence description of what you observe and recommended urgency",
  "recommendations": ["Specific action 1", "Action 2", "Action 3", "Action 4"],
  "additionalInfo": [
    {"label": "Symptoms Detected", "value": "..."},
    {"label": "Contagion Risk", "value": "..."},
    {"label": "Treatment Window", "value": "..."},
    {"label": "Mortality Risk", "value": "..."}
  ]
}
Severity must be one of: Good, Moderate, High, Critical.
Include Nigerian veterinary resources and costs in Naira where relevant. Return ONLY the JSON.`,

  soil: `You are an expert Nigerian soil scientist. Analyze this soil image from a Nigerian farm.
Respond with ONLY a valid JSON object (no markdown, no code blocks) with exactly these fields:
{
  "diagnosis": "soil type and fertility condition",
  "confidence": 88,
  "severity": "Good",
  "description": "2-3 sentence description of soil health and what it means for crop production",
  "recommendations": ["Specific action 1 with Nigerian context", "Action 2", "Action 3", "Action 4"],
  "additionalInfo": [
    {"label": "Soil Type", "value": "..."},
    {"label": "Estimated pH", "value": "..."},
    {"label": "Drainage", "value": "..."},
    {"label": "Best Crops", "value": "..."}
  ]
}
Severity must be one of: Good, Moderate, High, Critical.
Reference Nigerian soil zones (Sudan Savanna, Guinea Savanna, rainforest belt). Return ONLY the JSON.`,
};

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
    const imageMimeType = mimeType || "image/jpeg";
    const prompt = SCAN_PROMPTS[scanType] || SCAN_PROMPTS.crop;

    let analysisResult: any;
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const result = await model.generateContent([
        { inlineData: { data: base64Data, mimeType: imageMimeType } },
        { text: prompt },
      ]);
      const rawText = result.response.text().trim();
      const cleaned = rawText
        .replace(/^```json\s*/m, "")
        .replace(/^```\s*/m, "")
        .replace(/\s*```$/m, "")
        .trim();
      analysisResult = JSON.parse(cleaned);
    } catch (geminiErr) {
      req.log.error({ geminiErr }, "Gemini vision error");
      return res.status(500).json({ error: "Analysis failed. Please retake the photo in better lighting and try again." });
    }

    const [saved] = await db
      .insert(scanResultsTable)
      .values({
        farmerId,
        scanType,
        diagnosis: analysisResult.diagnosis || "Unknown",
        confidence: analysisResult.confidence || 0,
        severity: analysisResult.severity || "Moderate",
        description: analysisResult.description || "",
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
