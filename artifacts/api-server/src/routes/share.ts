import { Router } from "express";
import { db, farmReportsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/:token", async (req, res) => {
  try {
    const { token } = req.params;
    const [report] = await db.select().from(farmReportsTable)
      .where(eq(farmReportsTable.shareToken, token))
      .limit(1);

    if (!report) return res.status(404).json({ error: "Report not found or link has expired" });
    if (!report.isPublic) return res.status(403).json({ error: "This report is private" });

    await db.update(farmReportsTable)
      .set({ viewCount: (report.viewCount ?? 0) + 1 })
      .where(eq(farmReportsTable.id, report.id));

    res.json({
      id: report.id,
      title: report.title,
      notes: report.notes,
      viewCount: (report.viewCount ?? 0) + 1,
      createdAt: report.createdAt,
      snapshot: report.snapshot,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get shared report");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
