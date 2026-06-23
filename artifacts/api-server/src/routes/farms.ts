import { Router } from "express";
import { db, farmsTable, cropsTable, livestockTable } from "@workspace/db";
import { eq, inArray, count } from "drizzle-orm";

const router = Router();

function farmToJson(f: typeof farmsTable.$inferSelect) {
  return {
    id: f.id,
    name: f.name,
    sizeHectares: f.sizeHectares,
    state: f.state,
    lga: f.lga,
    lat: f.lat,
    lng: f.lng,
    farmType: f.farmType,
    healthScore: f.healthScore,
    soilType: f.soilType,
    irrigationType: f.irrigationType,
    createdAt: f.createdAt.toISOString(),
  };
}

router.get("/", async (req, res) => {
  try {
    const farms = await db.select().from(farmsTable).where(eq(farmsTable.farmerId, req.farmerId!));
    res.json(farms.map(farmToJson));
  } catch (err) {
    req.log.error({ err }, "Failed to get farms");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { name, sizeHectares, state, lga, lat, lng, farmType, soilType, irrigationType } = req.body;
    const [farm] = await db
      .insert(farmsTable)
      .values({ farmerId: req.farmerId!, name, sizeHectares, state, lga, lat, lng, farmType, soilType, irrigationType })
      .returning();
    res.status(201).json(farmToJson(farm));
  } catch (err) {
    req.log.error({ err }, "Failed to create farm");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/summary", async (req, res) => {
  try {
    const allFarms = await db.select().from(farmsTable).where(eq(farmsTable.farmerId, req.farmerId!));
    const farmIds = allFarms.map((f) => f.id);
    const [cropCount] = farmIds.length > 0
      ? await db.select({ count: count() }).from(cropsTable).where(inArray(cropsTable.farmId, farmIds))
      : [{ count: 0 }];
    const [animalCount] = farmIds.length > 0
      ? await db.select({ count: count() }).from(livestockTable).where(inArray(livestockTable.farmId, farmIds))
      : [{ count: 0 }];

    const totalHectares = allFarms.reduce((s, f) => s + f.sizeHectares, 0);
    const avgHealth = allFarms.length > 0 ? allFarms.reduce((s, f) => s + f.healthScore, 0) / allFarms.length : 0;
    const topFarm = [...allFarms].sort((a, b) => b.healthScore - a.healthScore)[0];

    res.json({
      totalFarms: allFarms.length,
      totalHectares,
      totalCrops: cropCount.count,
      totalAnimals: animalCount.count,
      avgHealthScore: Math.round(avgHealth * 10) / 10,
      topPerformingFarm: topFarm?.name ?? null,
      recentActivity: [],
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get farm summary");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:farmId", async (req, res) => {
  try {
    const [farm] = await db.select().from(farmsTable).where(eq(farmsTable.id, Number(req.params.farmId)));
    if (!farm || farm.farmerId !== req.farmerId!) {
      res.status(404).json({ error: "Farm not found" });
      return;
    }
    res.json(farmToJson(farm));
  } catch (err) {
    req.log.error({ err }, "Failed to get farm");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/:farmId", async (req, res) => {
  try {
    const { name, sizeHectares, soilType, irrigationType } = req.body;
    const [existing] = await db.select({ farmerId: farmsTable.farmerId }).from(farmsTable).where(eq(farmsTable.id, Number(req.params.farmId)));
    if (!existing || existing.farmerId !== req.farmerId!) {
      res.status(404).json({ error: "Farm not found" });
      return;
    }
    const [farm] = await db
      .update(farmsTable)
      .set({ name, sizeHectares, soilType, irrigationType })
      .where(eq(farmsTable.id, Number(req.params.farmId)))
      .returning();
    res.json(farmToJson(farm));
  } catch (err) {
    req.log.error({ err }, "Failed to update farm");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
