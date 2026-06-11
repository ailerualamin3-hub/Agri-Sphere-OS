import { Router } from "express";
import { db, cropsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

function cropToJson(c: typeof cropsTable.$inferSelect) {
  return {
    id: c.id,
    farmId: c.farmId,
    name: c.name,
    variety: c.variety,
    stage: c.stage,
    plantingDate: c.plantingDate,
    expectedHarvestDate: c.expectedHarvestDate,
    healthStatus: c.healthStatus,
    healthScore: c.healthScore,
    plotSizeHectares: c.plotSizeHectares,
    expectedYieldKg: c.expectedYieldKg,
    actualYieldKg: c.actualYieldKg,
    fertilizerSchedule: c.fertilizerSchedule,
    notes: c.notes,
    createdAt: c.createdAt.toISOString(),
  };
}

router.get("/", async (req, res) => {
  try {
    const crops = await db.select().from(cropsTable);
    res.json(crops.map(cropToJson));
  } catch (err) {
    req.log.error({ err }, "Failed to get crops");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { farmId, name, variety, stage, plantingDate, expectedHarvestDate, plotSizeHectares, expectedYieldKg, fertilizerSchedule, notes } = req.body;
    const [crop] = await db.insert(cropsTable).values({ farmId, name, variety, stage, plantingDate, expectedHarvestDate, plotSizeHectares, expectedYieldKg, fertilizerSchedule, notes }).returning();
    res.status(201).json(cropToJson(crop));
  } catch (err) {
    req.log.error({ err }, "Failed to create crop");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:cropId", async (req, res) => {
  try {
    const [crop] = await db.select().from(cropsTable).where(eq(cropsTable.id, Number(req.params.cropId)));
    if (!crop) return res.status(404).json({ error: "Crop not found" });
    res.json(cropToJson(crop));
  } catch (err) {
    req.log.error({ err }, "Failed to get crop");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/:cropId", async (req, res) => {
  try {
    const { stage, healthStatus, healthScore, actualYieldKg, notes } = req.body;
    const [crop] = await db.update(cropsTable).set({ stage, healthStatus, healthScore, actualYieldKg, notes }).where(eq(cropsTable.id, Number(req.params.cropId))).returning();
    if (!crop) return res.status(404).json({ error: "Crop not found" });
    res.json(cropToJson(crop));
  } catch (err) {
    req.log.error({ err }, "Failed to update crop");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:cropId", async (req, res) => {
  try {
    await db.delete(cropsTable).where(eq(cropsTable.id, Number(req.params.cropId)));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete crop");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
