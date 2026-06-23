import { Router } from "express";
import { db, cropsTable, farmsTable } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";

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

async function getFarmerFarmIds(farmerId: number): Promise<number[]> {
  const farms = await db.select({ id: farmsTable.id }).from(farmsTable).where(eq(farmsTable.farmerId, farmerId));
  return farms.map((f) => f.id);
}

router.get("/", async (req, res) => {
  try {
    const farmIds = await getFarmerFarmIds(req.farmerId!);
    if (farmIds.length === 0) return res.json([]);
    const crops = await db.select().from(cropsTable).where(inArray(cropsTable.farmId, farmIds));
    res.json(crops.map(cropToJson));
  } catch (err) {
    req.log.error({ err }, "Failed to get crops");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", async (req, res) => {
  try {
    const farmIds = await getFarmerFarmIds(req.farmerId!);
    const { farmId, name, variety, stage, plantingDate, expectedHarvestDate, plotSizeHectares, expectedYieldKg, fertilizerSchedule, notes } = req.body;
    if (!farmIds.includes(Number(farmId))) {
      res.status(403).json({ error: "Farm not found or not owned by you" });
      return;
    }
    const [crop] = await db
      .insert(cropsTable)
      .values({ farmId, name, variety, stage, plantingDate, expectedHarvestDate, plotSizeHectares, expectedYieldKg, fertilizerSchedule, notes })
      .returning();
    res.status(201).json(cropToJson(crop));
  } catch (err) {
    req.log.error({ err }, "Failed to create crop");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:cropId", async (req, res) => {
  try {
    const farmIds = await getFarmerFarmIds(req.farmerId!);
    const [crop] = await db.select().from(cropsTable).where(eq(cropsTable.id, Number(req.params.cropId)));
    if (!crop || !farmIds.includes(crop.farmId)) return res.status(404).json({ error: "Crop not found" });
    res.json(cropToJson(crop));
  } catch (err) {
    req.log.error({ err }, "Failed to get crop");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/:cropId", async (req, res) => {
  try {
    const farmIds = await getFarmerFarmIds(req.farmerId!);
    const [existing] = await db.select().from(cropsTable).where(eq(cropsTable.id, Number(req.params.cropId)));
    if (!existing || !farmIds.includes(existing.farmId)) return res.status(404).json({ error: "Crop not found" });
    const { stage, healthStatus, healthScore, actualYieldKg, notes } = req.body;
    const [crop] = await db
      .update(cropsTable)
      .set({ stage, healthStatus, healthScore, actualYieldKg, notes })
      .where(eq(cropsTable.id, Number(req.params.cropId)))
      .returning();
    res.json(cropToJson(crop));
  } catch (err) {
    req.log.error({ err }, "Failed to update crop");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:cropId", async (req, res) => {
  try {
    const farmIds = await getFarmerFarmIds(req.farmerId!);
    const [existing] = await db.select({ farmId: cropsTable.farmId }).from(cropsTable).where(eq(cropsTable.id, Number(req.params.cropId)));
    if (!existing || !farmIds.includes(existing.farmId)) return res.status(404).json({ error: "Crop not found" });
    await db.delete(cropsTable).where(eq(cropsTable.id, Number(req.params.cropId)));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete crop");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
