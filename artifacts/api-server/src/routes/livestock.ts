import { Router } from "express";
import { db, livestockTable, farmsTable } from "@workspace/db";
import { eq, inArray, count } from "drizzle-orm";

const router = Router();

function animalToJson(a: typeof livestockTable.$inferSelect) {
  return {
    id: a.id,
    farmId: a.farmId,
    species: a.species,
    breed: a.breed,
    count: a.count,
    healthStatus: a.healthStatus,
    healthScore: a.healthScore,
    avgWeightKg: a.avgWeightKg,
    lastVaccinationDate: a.lastVaccinationDate,
    nextVaccinationDate: a.nextVaccinationDate,
    notes: a.notes,
    createdAt: a.createdAt.toISOString(),
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
    const animals = await db.select().from(livestockTable).where(inArray(livestockTable.farmId, farmIds));
    res.json(animals.map(animalToJson));
  } catch (err) {
    req.log.error({ err }, "Failed to get livestock");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", async (req, res) => {
  try {
    const farmIds = await getFarmerFarmIds(req.farmerId!);
    const { farmId, species, breed, count: animalCount, avgWeightKg, lastVaccinationDate, nextVaccinationDate, notes } = req.body;
    if (!farmIds.includes(Number(farmId))) {
      res.status(403).json({ error: "Farm not found or not owned by you" });
      return;
    }
    const [animal] = await db
      .insert(livestockTable)
      .values({ farmId, species, breed, count: animalCount, avgWeightKg, lastVaccinationDate, nextVaccinationDate, notes })
      .returning();
    res.status(201).json(animalToJson(animal));
  } catch (err) {
    req.log.error({ err }, "Failed to create animal");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/summary", async (req, res) => {
  try {
    const farmIds = await getFarmerFarmIds(req.farmerId!);
    if (farmIds.length === 0) {
      return res.json({ totalAnimals: 0, bySpecies: [], healthyCount: 0, sickCount: 0 });
    }
    const animals = await db.select().from(livestockTable).where(inArray(livestockTable.farmId, farmIds));
    const bySpecies = animals.reduce<Record<string, number>>((acc, a) => {
      acc[a.species] = (acc[a.species] ?? 0) + a.count;
      return acc;
    }, {});
    res.json({
      totalAnimals: animals.reduce((s, a) => s + a.count, 0),
      bySpecies: Object.entries(bySpecies).map(([species, count]) => ({ species, count })),
      healthyCount: animals.filter((a) => a.healthStatus === "healthy").reduce((s, a) => s + a.count, 0),
      sickCount: animals.filter((a) => a.healthStatus !== "healthy").reduce((s, a) => s + a.count, 0),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get livestock summary");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:animalId", async (req, res) => {
  try {
    const farmIds = await getFarmerFarmIds(req.farmerId!);
    const [animal] = await db.select().from(livestockTable).where(eq(livestockTable.id, Number(req.params.animalId)));
    if (!animal || !farmIds.includes(animal.farmId)) return res.status(404).json({ error: "Animal not found" });
    res.json(animalToJson(animal));
  } catch (err) {
    req.log.error({ err }, "Failed to get animal");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/:animalId", async (req, res) => {
  try {
    const farmIds = await getFarmerFarmIds(req.farmerId!);
    const [existing] = await db.select({ farmId: livestockTable.farmId }).from(livestockTable).where(eq(livestockTable.id, Number(req.params.animalId)));
    if (!existing || !farmIds.includes(existing.farmId)) return res.status(404).json({ error: "Animal not found" });
    const { count: animalCount, healthStatus, healthScore, avgWeightKg, lastVaccinationDate, nextVaccinationDate, notes } = req.body;
    const [animal] = await db
      .update(livestockTable)
      .set({ count: animalCount, healthStatus, healthScore, avgWeightKg, lastVaccinationDate, nextVaccinationDate, notes })
      .where(eq(livestockTable.id, Number(req.params.animalId)))
      .returning();
    res.json(animalToJson(animal));
  } catch (err) {
    req.log.error({ err }, "Failed to update animal");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:animalId", async (req, res) => {
  try {
    const farmIds = await getFarmerFarmIds(req.farmerId!);
    const [existing] = await db.select({ farmId: livestockTable.farmId }).from(livestockTable).where(eq(livestockTable.id, Number(req.params.animalId)));
    if (!existing || !farmIds.includes(existing.farmId)) return res.status(404).json({ error: "Animal not found" });
    await db.delete(livestockTable).where(eq(livestockTable.id, Number(req.params.animalId)));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete animal");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
