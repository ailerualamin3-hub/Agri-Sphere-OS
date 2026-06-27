import { Router } from "express";
import { db, farmReportsTable, farmersTable, farmsTable, cropsTable, livestockTable, scanResultsTable, financialRecordsTable, farmDocumentsTable } from "@workspace/db";
import { eq, inArray, desc } from "drizzle-orm";
import { randomUUID } from "crypto";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const farmerId = req.farmerId!;
    const reports = await db
      .select()
      .from(farmReportsTable)
      .where(eq(farmReportsTable.farmerId, farmerId))
      .orderBy(desc(farmReportsTable.createdAt));
    res.json(reports);
  } catch (err) {
    req.log.error({ err }, "Failed to list reports");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/generate", async (req, res) => {
  try {
    const farmerId = req.farmerId!;
    const { title, notes } = req.body;

    const [farmer] = await db.select().from(farmersTable).where(eq(farmersTable.id, farmerId)).limit(1);
    if (!farmer) return res.status(404).json({ error: "Farmer not found" });

    const farms = await db.select().from(farmsTable).where(eq(farmsTable.farmerId, farmerId));
    const farmIds = farms.map(f => f.id);

    const [crops, animals, scans, records, docs] = await Promise.all([
      farmIds.length ? db.select().from(cropsTable).where(inArray(cropsTable.farmId, farmIds)) : Promise.resolve([]),
      farmIds.length ? db.select().from(livestockTable).where(inArray(livestockTable.farmId, farmIds)) : Promise.resolve([]),
      db.select().from(scanResultsTable).where(eq(scanResultsTable.farmerId, farmerId)).orderBy(desc(scanResultsTable.createdAt)).limit(10),
      db.select().from(financialRecordsTable).where(eq(financialRecordsTable.farmerId, farmerId)).orderBy(desc(financialRecordsTable.recordDate)),
      db.select().from(farmDocumentsTable).where(eq(farmDocumentsTable.farmerId, farmerId)),
    ]);

    const totalIncomeNgn = records.filter(r => r.type === "income").reduce((s, r) => s + r.amountNgn, 0);
    const totalExpenseNgn = records.filter(r => r.type === "expense").reduce((s, r) => s + r.amountNgn, 0);

    const snapshot = {
      generatedAt: new Date().toISOString(),
      farmer: {
        id: farmer.id,
        name: farmer.name,
        state: farmer.state,
        lga: farmer.lga,
        farmingType: farmer.farmingType,
        verificationStatus: farmer.verificationStatus,
        neuroScore: farmer.neuroScore,
        memberSince: farmer.createdAt,
      },
      farms: farms.map(f => ({
        id: f.id,
        name: f.name,
        sizeHa: f.sizeHa,
        location: f.location,
        soilType: f.soilType,
        irrigationType: f.irrigationType,
      })),
      crops: crops.map(c => ({
        cropType: c.cropType,
        variety: c.variety,
        sizeHa: c.sizeHa,
        healthScore: c.healthScore,
        growthStage: c.growthStage,
        plantingDate: c.plantingDate,
        expectedHarvestDate: c.expectedHarvestDate,
        lastYieldKg: c.lastYieldKg,
      })),
      livestock: animals.map(a => ({
        animalType: a.animalType,
        breed: a.breed,
        count: a.count,
        healthStatus: a.healthStatus,
        productionPurpose: a.productionPurpose,
      })),
      financialSummary: {
        totalIncomeNgn,
        totalExpenseNgn,
        netNgn: totalIncomeNgn - totalExpenseNgn,
        recordCount: records.length,
        records: records.slice(0, 50).map(r => ({
          type: r.type,
          category: r.category,
          description: r.description,
          amountNgn: r.amountNgn,
          recordDate: r.recordDate,
        })),
      },
      documents: docs.map(d => ({
        title: d.title,
        docType: d.docType,
        notes: d.notes,
        createdAt: d.createdAt,
      })),
      recentDiagnoses: scans.map(s => ({
        scanType: s.scanType,
        diagnosis: s.diagnosis,
        confidence: s.confidence,
        severity: s.severity,
        description: s.description,
        createdAt: s.createdAt,
      })),
    };

    const shareToken = randomUUID();
    const [report] = await db.insert(farmReportsTable).values({
      farmerId,
      title: title || `Farm Report – ${new Date().toLocaleDateString("en-NG")}`,
      shareToken,
      snapshot,
      notes: notes ?? null,
      isPublic: true,
    }).returning();

    res.status(201).json(report);
  } catch (err) {
    req.log.error({ err }, "Failed to generate report");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const farmerId = req.farmerId!;
    const id = Number(req.params.id);
    const [report] = await db.select().from(farmReportsTable)
      .where(eq(farmReportsTable.id, id)).limit(1);
    if (!report || report.farmerId !== farmerId) return res.status(404).json({ error: "Report not found" });
    res.json(report);
  } catch (err) {
    req.log.error({ err }, "Failed to get report");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const farmerId = req.farmerId!;
    const id = Number(req.params.id);
    const { title, notes, isPublic } = req.body;
    const [existing] = await db.select({ farmerId: farmReportsTable.farmerId }).from(farmReportsTable).where(eq(farmReportsTable.id, id)).limit(1);
    if (!existing || existing.farmerId !== farmerId) return res.status(404).json({ error: "Report not found" });
    const [updated] = await db.update(farmReportsTable).set({
      ...(title !== undefined && { title }),
      ...(notes !== undefined && { notes }),
      ...(isPublic !== undefined && { isPublic }),
      updatedAt: new Date(),
    }).where(eq(farmReportsTable.id, id)).returning();
    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Failed to update report");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const farmerId = req.farmerId!;
    const id = Number(req.params.id);
    const [existing] = await db.select({ farmerId: farmReportsTable.farmerId }).from(farmReportsTable).where(eq(farmReportsTable.id, id)).limit(1);
    if (!existing || existing.farmerId !== farmerId) return res.status(404).json({ error: "Report not found" });
    await db.delete(farmReportsTable).where(eq(farmReportsTable.id, id));
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Failed to delete report");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
