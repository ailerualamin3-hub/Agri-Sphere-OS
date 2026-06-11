import { Router } from "express";
import { db, livestockTable } from "@workspace/db";
import { eq, count } from "drizzle-orm";

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

router.get("/", async (req, res) => {
  try {
    const animals = await db.select().from(livestockTable);
    res.json(animals.map(animalToJson));
  } catch (err) {
    req.log.error({ err }, "Failed to get livestock");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { farmId, species, breed, count: animalCount, avgWeightKg, lastVaccinationDate, nextVaccinationDate, notes } = req.body;
    const [animal] = await db.insert(livestockTable).values({ farmId, species, breed, count: animalCount, avgWeightKg, lastVaccinationDate, nextVaccinationDate, notes }).returning();
    res.status(201).json(animalToJson(animal));
  } catch (err) {
    req.log.error({ err }, "Failed to create animal");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/summary", async (req, res) => {
  try {
    const allAnimals = await db.select().from(livestockTable);
    const totalAnimals = allAnimals.reduce((s, a) => s + a.count, 0);
    const uniqueSpecies = new Set(allAnimals.map((a) => a.species)).size;
    const avgHealth = allAnimals.length > 0 ? allAnimals.reduce((s, a) => s + a.healthScore, 0) / allAnimals.length : 0;
    const today = new Date();
    const soon = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    const dueSoon = allAnimals.filter((a) => {
      if (!a.nextVaccinationDate) return false;
      const d = new Date(a.nextVaccinationDate);
      return d >= today && d <= soon;
    }).length;
    res.json({
      totalAnimals,
      totalSpecies: uniqueSpecies,
      avgHealthScore: Math.round(avgHealth * 10) / 10,
      vaccinationsDueSoon: dueSoon,
      recentRecords: [
        "Goat herd dewormed on June 8",
        "New Fulani cattle added to Farm 2",
        "Weight check completed: avg 28kg",
        "PPR vaccine administered to 15 goats",
      ],
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get livestock summary");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:animalId", async (req, res) => {
  try {
    const [animal] = await db.select().from(livestockTable).where(eq(livestockTable.id, Number(req.params.animalId)));
    if (!animal) return res.status(404).json({ error: "Animal not found" });
    res.json(animalToJson(animal));
  } catch (err) {
    req.log.error({ err }, "Failed to get animal");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/:animalId", async (req, res) => {
  try {
    const { count: animalCount, healthStatus, healthScore, avgWeightKg, lastVaccinationDate, nextVaccinationDate, notes } = req.body;
    const [animal] = await db.update(livestockTable).set({ count: animalCount, healthStatus, healthScore, avgWeightKg, lastVaccinationDate, nextVaccinationDate, notes }).where(eq(livestockTable.id, Number(req.params.animalId))).returning();
    if (!animal) return res.status(404).json({ error: "Animal not found" });
    res.json(animalToJson(animal));
  } catch (err) {
    req.log.error({ err }, "Failed to update animal");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:animalId", async (req, res) => {
  try {
    await db.delete(livestockTable).where(eq(livestockTable.id, Number(req.params.animalId)));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete animal");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
