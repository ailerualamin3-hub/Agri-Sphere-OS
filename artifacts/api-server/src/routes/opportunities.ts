import { Router } from "express";
import { db, farmersTable, governmentOpportunitiesTable, scanResultsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const [farmer] = await db.select({ credits: farmersTable.credits }).from(farmersTable).where(eq(farmersTable.id, req.farmerId!)).limit(1);
    const isPro = (farmer?.credits ?? 0) > 0;

    const opportunities = await db
      .select()
      .from(governmentOpportunitiesTable)
      .where(eq(governmentOpportunitiesTable.isActive, true))
      .orderBy(desc(governmentOpportunitiesTable.isFeatured), desc(governmentOpportunitiesTable.createdAt));

    res.json(opportunities.map((o: any) => ({ ...o, locked: !isPro })));
  } catch (err) {
    req.log.error({ err }, "Failed to get opportunities");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [opportunity] = await db
      .select()
      .from(governmentOpportunitiesTable)
      .where(eq(governmentOpportunitiesTable.id, id));
    if (!opportunity) return res.status(404).json({ error: "Opportunity not found" });
    await db
      .update(governmentOpportunitiesTable)
      .set({ viewCount: opportunity.viewCount + 1 })
      .where(eq(governmentOpportunitiesTable.id, id));
    return res.json(opportunity);
  } catch (err) {
    req.log.error({ err }, "Failed to get opportunity");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/scans/history", async (req, res) => {
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

router.post("/scans", async (req, res) => {
  try {
    const farmerId = req.farmerId!;
    const { scanType, imageUrl, diagnosis, confidence, severity, description, recommendations } = req.body;
    const [result] = await db
      .insert(scanResultsTable)
      .values({
        farmerId,
        scanType,
        imageUrl: imageUrl ?? null,
        diagnosis,
        confidence,
        severity,
        description,
        recommendations: recommendations ?? [],
      })
      .returning();
    res.status(201).json(result);
  } catch (err) {
    req.log.error({ err }, "Failed to save scan result");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
