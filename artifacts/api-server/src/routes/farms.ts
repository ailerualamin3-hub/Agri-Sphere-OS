import { Router } from "express";
import { db, farmsTable, cropsTable, livestockTable } from "@workspace/db";
import { eq, avg, count } from "drizzle-orm";

const router = Router();

const CURRENT_FARMER_ID = 1;

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
    const farms = await db.select().from(farmsTable).where(eq(farmsTable.farmerId, CURRENT_FARMER_ID));
    res.json(farms.map(farmToJson));
  } catch (err) {
    req.log.error({ err }, "Failed to get farms");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { name, sizeHectares, state, lga, lat, lng, farmType, soilType, irrigationType } = req.body;
    const [farm] = await db.insert(farmsTable).values({ farmerId: CURRENT_FARMER_ID, name, sizeHectares, state, lga, lat, lng, farmType, soilType, irrigationType }).returning();
    res.status(201).json(farmToJson(farm));
  } catch (err) {
    req.log.error({ err }, "Failed to create farm");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/summary", async (req, res) => {
  try {
    const [farmCount] = await db.select({ count: count() }).from(farmsTable).where(eq(farmsTable.farmerId, CURRENT_FARMER_ID));
    const allFarms = await db.select().from(farmsTable).where(eq(farmsTable.farmerId, CURRENT_FARMER_ID));
    const totalHectares = allFarms.reduce((s, f) => s + f.sizeHectares, 0);
    const avgHealth = allFarms.length > 0 ? allFarms.reduce((s, f) => s + f.healthScore, 0) / allFarms.length : 0;
    const topFarm = allFarms.sort((a, b) => b.healthScore - a.healthScore)[0];
    res.json({
      totalFarms: farmCount.count,
      totalHectares,
      avgHealthScore: Math.round(avgHealth * 10) / 10,
      topPerformingFarm: topFarm?.name ?? null,
      recentActivity: [
        "Maize crop entered flowering stage on Farm 1",
        "Goat vaccination completed on Farm 2",
        "New soil scan completed for north field",
        "Market listing created: 500kg rice",
      ],
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get farm summary");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:farmId", async (req, res) => {
  try {
    const [farm] = await db.select().from(farmsTable).where(eq(farmsTable.id, Number(req.params.farmId)));
    if (!farm) return res.status(404).json({ error: "Farm not found" });
    res.json(farmToJson(farm));
  } catch (err) {
    req.log.error({ err }, "Failed to get farm");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/:farmId", async (req, res) => {
  try {
    const { name, sizeHectares, soilType, irrigationType } = req.body;
    const [farm] = await db.update(farmsTable).set({ name, sizeHectares, soilType, irrigationType }).where(eq(farmsTable.id, Number(req.params.farmId))).returning();
    if (!farm) return res.status(404).json({ error: "Farm not found" });
    res.json(farmToJson(farm));
  } catch (err) {
    req.log.error({ err }, "Failed to update farm");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
