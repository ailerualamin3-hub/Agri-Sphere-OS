import { Router } from "express";
import { db, cropsTable, livestockTable, farmsTable } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";

const router = Router();

router.get("/summary", async (req, res) => {
  try {
    const farmerId = req.farmerId!;
    const farms = await db.select().from(farmsTable).where(eq(farmsTable.farmerId, farmerId));
    const farmIds = farms.map((f) => f.id);

    const crops = farmIds.length > 0
      ? await db.select({ healthScore: cropsTable.healthScore }).from(cropsTable).where(inArray(cropsTable.farmId, farmIds))
      : [];
    const animals = farmIds.length > 0
      ? await db.select({ healthScore: livestockTable.healthScore }).from(livestockTable).where(inArray(livestockTable.farmId, farmIds))
      : [];

    const cropHealthScore = crops.length > 0
      ? Math.round(crops.reduce((s, c) => s + (c.healthScore ?? 80), 0) / crops.length)
      : null;
    const livestockHealthScore = animals.length > 0
      ? Math.round(animals.reduce((s, a) => s + (a.healthScore ?? 80), 0) / animals.length)
      : null;
    const avgFarmHealth = farms.length > 0
      ? Math.round(farms.reduce((s, f) => s + f.healthScore, 0) / farms.length)
      : 0;

    res.json({
      weather: null,
      farmHealth: {
        overallScore: avgFarmHealth,
        cropHealthScore,
        livestockHealthScore,
        soilHealthScore: farms.length > 0 ? Math.round(farms.reduce((s, f) => s + f.healthScore, 0) / farms.length * 0.9) : null,
        cropHealthStatus: cropHealthScore !== null ? (cropHealthScore >= 75 ? "good" : cropHealthScore >= 50 ? "fair" : "poor") : null,
        livestockHealthStatus: livestockHealthScore !== null ? (livestockHealthScore >= 75 ? "good" : livestockHealthScore >= 50 ? "fair" : "poor") : null,
        activeFarms: farms.length,
        activeCrops: crops.length,
        activeAnimals: animals.length,
      },
      aiInsights: [],
      climateRisks: null,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get dashboard summary");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/ai-insights", async (_req, res) => {
  res.json([]);
});

router.get("/emergency-contacts", async (_req, res) => {
  res.json([]);
});

export default router;
