import { Router } from "express";
import { db, financialRecordsTable, farmDocumentsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router = Router();

router.get("/records", async (req, res) => {
  try {
    const farmerId = req.farmerId!;
    const records = await db.select().from(financialRecordsTable)
      .where(eq(financialRecordsTable.farmerId, farmerId))
      .orderBy(desc(financialRecordsTable.recordDate));
    res.json(records);
  } catch (err) {
    req.log.error({ err }, "Failed to list financial records");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/records", async (req, res) => {
  try {
    const farmerId = req.farmerId!;
    const { type, category, description, amountNgn, recordDate, farmId, notes } = req.body;
    if (!type || !category || !description || amountNgn === undefined) {
      return res.status(400).json({ error: "type, category, description, amountNgn are required" });
    }
    const [record] = await db.insert(financialRecordsTable).values({
      farmerId,
      type,
      category,
      description,
      amountNgn: Number(amountNgn),
      recordDate: recordDate ? new Date(recordDate) : new Date(),
      farmId: farmId ?? null,
      notes: notes ?? null,
    }).returning();
    res.status(201).json(record);
  } catch (err) {
    req.log.error({ err }, "Failed to create financial record");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/records/:id", async (req, res) => {
  try {
    const farmerId = req.farmerId!;
    const id = Number(req.params.id);
    const [existing] = await db.select({ farmerId: financialRecordsTable.farmerId }).from(financialRecordsTable).where(eq(financialRecordsTable.id, id)).limit(1);
    if (!existing || existing.farmerId !== farmerId) return res.status(404).json({ error: "Record not found" });
    await db.delete(financialRecordsTable).where(eq(financialRecordsTable.id, id));
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Failed to delete financial record");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/documents", async (req, res) => {
  try {
    const farmerId = req.farmerId!;
    const docs = await db.select().from(farmDocumentsTable)
      .where(eq(farmDocumentsTable.farmerId, farmerId))
      .orderBy(desc(farmDocumentsTable.createdAt));
    res.json(docs);
  } catch (err) {
    req.log.error({ err }, "Failed to list documents");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/documents", async (req, res) => {
  try {
    const farmerId = req.farmerId!;
    const { title, docType, fileDataUrl, notes } = req.body;
    if (!title || !docType) return res.status(400).json({ error: "title and docType are required" });
    const [doc] = await db.insert(farmDocumentsTable).values({
      farmerId,
      title,
      docType,
      fileDataUrl: fileDataUrl ?? null,
      notes: notes ?? null,
    }).returning();
    res.status(201).json(doc);
  } catch (err) {
    req.log.error({ err }, "Failed to upload document");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/documents/:id", async (req, res) => {
  try {
    const farmerId = req.farmerId!;
    const id = Number(req.params.id);
    const [existing] = await db.select({ farmerId: farmDocumentsTable.farmerId }).from(farmDocumentsTable).where(eq(farmDocumentsTable.id, id)).limit(1);
    if (!existing || existing.farmerId !== farmerId) return res.status(404).json({ error: "Document not found" });
    await db.delete(farmDocumentsTable).where(eq(farmDocumentsTable.id, id));
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Failed to delete document");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
