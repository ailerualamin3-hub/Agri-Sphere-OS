import { Router } from "express";
import { db, cropTreatmentsTable, cropsTable, farmsTable } from "@workspace/db";
import { eq, and, desc, inArray } from "drizzle-orm";

const router = Router();

// GET all treatments for the logged-in farmer
router.get("/", async (req, res) => {
  try {
    const farmerId = req.farmerId!;
    const treatments = await db
      .select()
      .from(cropTreatmentsTable)
      .where(eq(cropTreatmentsTable.farmerId, farmerId))
      .orderBy(desc(cropTreatmentsTable.appliedDate));
    res.json(treatments);
  } catch (err) {
    req.log.error({ err }, "Failed to get treatments");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET treatments for a specific crop
router.get("/crop/:cropId", async (req, res) => {
  try {
    const farmerId = req.farmerId!;
    const cropId = Number(req.params.cropId);
    const treatments = await db
      .select()
      .from(cropTreatmentsTable)
      .where(and(eq(cropTreatmentsTable.cropId, cropId), eq(cropTreatmentsTable.farmerId, farmerId)))
      .orderBy(desc(cropTreatmentsTable.appliedDate));
    res.json(treatments);
  } catch (err) {
    req.log.error({ err }, "Failed to get crop treatments");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST create new treatment
router.post("/", async (req, res) => {
  try {
    const farmerId = req.farmerId!;
    const {
      cropId, treatmentType, productName, dosage,
      applicationMethod, disease, notes, appliedDate, followUpDate, status,
    } = req.body;

    if (!cropId || !treatmentType || !appliedDate) {
      return res.status(400).json({ error: "cropId, treatmentType and appliedDate are required" });
    }

    // Verify the crop belongs to this farmer's farm
    const farms = await db.select({ id: farmsTable.id }).from(farmsTable).where(eq(farmsTable.farmerId, farmerId));
    const farmIds = farms.map((f) => f.id);
    const [crop] = await db.select({ id: cropsTable.id, farmId: cropsTable.farmId }).from(cropsTable).where(eq(cropsTable.id, cropId)).limit(1);

    if (!crop || !farmIds.includes(crop.farmId)) {
      return res.status(403).json({ error: "Crop not found or access denied" });
    }

    const [treatment] = await db
      .insert(cropTreatmentsTable)
      .values({ cropId, farmerId, treatmentType, productName, dosage, applicationMethod, disease, notes, appliedDate, followUpDate: followUpDate || null, status: status || "active" })
      .returning();

    res.status(201).json(treatment);
  } catch (err) {
    req.log.error({ err }, "Failed to create treatment");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH update treatment status / notes
router.patch("/:id", async (req, res) => {
  try {
    const farmerId = req.farmerId!;
    const id = Number(req.params.id);
    const { status, recoveryNotes, followUpDate, notes } = req.body;

    const [updated] = await db
      .update(cropTreatmentsTable)
      .set({
        ...(status !== undefined ? { status } : {}),
        ...(recoveryNotes !== undefined ? { recoveryNotes } : {}),
        ...(followUpDate !== undefined ? { followUpDate } : {}),
        ...(notes !== undefined ? { notes } : {}),
      })
      .where(and(eq(cropTreatmentsTable.id, id), eq(cropTreatmentsTable.farmerId, farmerId)))
      .returning();

    if (!updated) return res.status(404).json({ error: "Treatment not found" });
    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Failed to update treatment");
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE treatment
router.delete("/:id", async (req, res) => {
  try {
    const farmerId = req.farmerId!;
    const id = Number(req.params.id);
    await db.delete(cropTreatmentsTable).where(and(eq(cropTreatmentsTable.id, id), eq(cropTreatmentsTable.farmerId, farmerId)));
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Failed to delete treatment");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
