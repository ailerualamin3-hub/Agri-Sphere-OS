import { Router } from "express";
import { db } from "@workspace/db";
import { governmentOpportunitiesTable, scanResultsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";

const router = Router();

const CURRENT_FARMER_ID = 1;

router.get("/", async (req, res) => {
  try {
    const opportunities = await db
      .select()
      .from(governmentOpportunitiesTable)
      .where(eq(governmentOpportunitiesTable.isActive, true))
      .orderBy(desc(governmentOpportunitiesTable.isFeatured), desc(governmentOpportunitiesTable.createdAt));
    res.json(opportunities);
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
    const scans = await db
      .select()
      .from(scanResultsTable)
      .where(eq(scanResultsTable.farmerId, CURRENT_FARMER_ID))
      .orderBy(desc(scanResultsTable.createdAt));
    res.json(scans);
  } catch (err) {
    req.log.error({ err }, "Failed to get scan history");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/scans", async (req, res) => {
  try {
    const { scanType, imageUrl, diagnosis, confidence, severity, description, recommendations } = req.body;
    const [result] = await db
      .insert(scanResultsTable)
      .values({
        farmerId: CURRENT_FARMER_ID,
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
